import { v4 as uuidv4 } from "uuid";
import { getCachedSupabaseClientFromEnv } from "../config/supabase";

interface ImageDimensions {
  width: number;
  height: number;
  format: "png" | "jpeg" | "webp";
}

export interface UploadResponse {
  fileId: string;
  url: string;
}

export interface UploadFileInput {
  fileBuffer: Buffer;
  originalName: string;
  mimeType?: string;
  imageConstraints?: ImageConstraintsOverrides;
}

export interface ImageConstraintsOverrides {
  maxImageBytes?: number;
  maxImageSidePx?: number;
}

const readUInt24LE = (buffer: Buffer, offset: number): number => {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
};

const getPngDimensions = (buffer: Buffer): ImageDimensions | null => {
  if (buffer.length < 24) return null;

  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return null;
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return width && height ? { width, height, format: "png" } : null;
};

const getJpegDimensions = (buffer: Buffer): ImageDimensions | null => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    let marker = buffer[offset + 1];
    while (marker === 0xff && offset + 2 < buffer.length) {
      offset++;
      marker = buffer[offset + 1];
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }

    if (offset + 4 >= buffer.length) return null;
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;

    const isSOF = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
    if (isSOF) {
      if (offset + 9 >= buffer.length) return null;
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height, format: "jpeg" };
    }

    offset += 2 + segmentLength;
  }

  return null;
};

const getWebpDimensions = (buffer: Buffer): ImageDimensions | null => {
  if (buffer.length < 30) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buffer.toString("ascii", 8, 12) !== "WEBP") return null;

  const chunkType = buffer.toString("ascii", 12, 16);

  if (chunkType === "VP8X") {
    if (buffer.length < 30) return null;
    return {
      width: readUInt24LE(buffer, 24) + 1,
      height: readUInt24LE(buffer, 27) + 1,
      format: "webp",
    };
  }

  if (chunkType === "VP8L") {
    if (buffer.length < 25) return null;
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];

    const width = ((b1 & 0x3f) << 8 | b0) + 1;
    const height = ((b3 & 0x0f) << 10 | b2 << 2 | (b1 & 0xc0) >> 6) + 1;

    return { width, height, format: "webp" };
  }

  if (chunkType === "VP8 ") {
    if (buffer.length < 30) return null;
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;

    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;

    return width && height ? { width, height, format: "webp" } : null;
  }

  return null;
};

const getImageDimensions = (buffer: Buffer): ImageDimensions | null => {
  return getPngDimensions(buffer) ?? getJpegDimensions(buffer) ?? getWebpDimensions(buffer);
};

const enforceImageConstraints = ({
  buffer,
  contextLabel,
  constraints,
}: {
  buffer: Buffer;
  contextLabel: string;
  constraints?: ImageConstraintsOverrides;
}): ImageDimensions => {
  if (!Buffer.isBuffer(buffer)) {
    throw Object.assign(new Error("Archivo invalido"), { status: 400 });
  }

  const { config } = getCachedSupabaseClientFromEnv();
  const maxImageBytes = constraints?.maxImageBytes ?? config.maxImageBytes;
  const maxImageSidePx = constraints?.maxImageSidePx ?? config.maxImageSidePx;

  if (!Number.isFinite(maxImageBytes) || maxImageBytes <= 0) {
    throw Object.assign(new Error(`${contextLabel}: maxImageBytes invalido`), { status: 400 });
  }

  if (!Number.isFinite(maxImageSidePx) || maxImageSidePx <= 0) {
    throw Object.assign(new Error(`${contextLabel}: maxImageSidePx invalido`), { status: 400 });
  }

  if (buffer.length > maxImageBytes) {
    throw Object.assign(new Error(`${contextLabel}: Excede bytes`), { status: 400 });
  }

  const dims = getImageDimensions(buffer);
  if (!dims) {
    throw Object.assign(new Error("Formato no soportado"), { status: 400 });
  }

  if (Math.max(dims.width, dims.height) > maxImageSidePx) {
    throw Object.assign(new Error("Excede dimensiones px"), { status: 400 });
  }

  return dims;
};

const getExtensionFromName = (fileName: string, fallback: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase() || fallback;
  return extension.replace(/[^a-z0-9]/g, "") || fallback;
};

export const SupabaseStorageService = {
  async uploadImage({
    fileName,
    base64,
    imageConstraints,
  }: {
    fileName: string;
    base64: string;
    imageConstraints?: ImageConstraintsOverrides;
  }): Promise<UploadResponse> {
    const trimmed = base64.trim();
    if (trimmed.startsWith("http")) {
      return { fileId: trimmed, url: trimmed };
    }

    const { client, config } = getCachedSupabaseClientFromEnv();

    const normalizedBase64 = trimmed.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(normalizedBase64, "base64");
    enforceImageConstraints({ buffer, contextLabel: "uploadImage", constraints: imageConstraints });

    const extension = getExtensionFromName(fileName, "jpg");
    const generatedName = `evidencia-${uuidv4()}.${extension}`;

    const { error } = await client.storage.from(config.bucket).upload(generatedName, buffer, {
      contentType: `image/${extension}`,
      upsert: false,
    });

    if (error) throw error;

    const { data } = client.storage.from(config.bucket).getPublicUrl(generatedName);
    return { fileId: generatedName, url: data.publicUrl };
  },

  async uploadFile({ fileBuffer, originalName, mimeType, imageConstraints }: UploadFileInput): Promise<UploadResponse> {
    const { client, config } = getCachedSupabaseClientFromEnv();

    const isImage = typeof mimeType === "string" && mimeType.startsWith("image/");
    if (isImage) {
      enforceImageConstraints({
        buffer: fileBuffer,
        contextLabel: "uploadFile",
        constraints: imageConstraints,
      });
    }

    const extension = getExtensionFromName(originalName, "dat");
    let contentType = mimeType;

    if (!contentType) {
      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      };
      contentType = mimeMap[extension] || "application/octet-stream";
    }

    const generatedName = `archivo-${uuidv4()}.${extension}`;

    const { error } = await client.storage.from(config.bucket).upload(generatedName, fileBuffer, {
      contentType,
      upsert: false,
    });

    if (error) throw error;

    const { data } = client.storage.from(config.bucket).getPublicUrl(generatedName);

    return {
      fileId: generatedName,
      url: data.publicUrl,
    };
  },

  async deleteFile({ fileId }: { fileId: string }): Promise<void> {
    if (!fileId || typeof fileId !== "string") return;

    const { client, config } = getCachedSupabaseClientFromEnv();

    const { error } = await client.storage.from(config.bucket).remove([fileId]);
    if (error) throw error;
  },
};
