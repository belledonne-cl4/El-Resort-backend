import type { Request, Response } from "express";
import RoomTypeLocalSpecs from "../models/RoomTypeLocalSpecs";
import mongoose from "mongoose";
import { SupabaseStorageService } from "../services/supabaseStorage.service";
import { CondominiosService } from "../services/condominios.service";

/**
 * @openapi
 * /api/room-type-specs:
 *   post:
 *     tags: [RoomTypeSpecs]
 *     summary: Crear metadatos locales de un room type
 *     description: Guarda metadatos locales por roomTypeID (baños + detalle de dormitorios).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateRoomTypeLocalSpecsRequest' }
 *     responses:
 *       201:
 *         description: Creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/RoomTypeLocalSpecs' }
 *       400:
 *         description: Validación
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
 *       409:
 *         description: Duplicado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       503:
 *         description: Base de datos no conectada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * /api/room-type-specs/{roomTypeID}:
 *   get:
 *     tags: [RoomTypeSpecs]
 *     summary: Obtener metadatos locales por roomTypeID
 *     parameters:
 *       - in: path
 *         name: roomTypeID
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/RoomTypeLocalSpecs' }
 *       400:
 *         description: Validación
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
 *       404:
 *         description: No encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       503:
 *         description: Base de datos no conectada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   put:
 *     tags: [RoomTypeSpecs]
 *     summary: Actualizar metadatos locales por roomTypeID
 *     parameters:
 *       - in: path
 *         name: roomTypeID
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateRoomTypeLocalSpecsRequest' }
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/UpdateRoomTypeLocalSpecsMultipartRequest' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/RoomTypeLocalSpecs' }
 *       400:
 *         description: Validación
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
 *       404:
 *         description: No encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       503:
 *         description: Base de datos no conectada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
const isMongoDuplicateKeyError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: unknown }).code === 11000;
};

type BedroomInput = {
  _id?: string;
  clientKey?: string;
  number?: number;
  description?: string;
  keepUrls?: string[];
  photos?: string[];
};

type UpdatePayload = {
  bathroomsCount?: number;
  condominioID?: string;
  bedrooms?: BedroomInput[];
};

const toHttpError = (status: number, message: string): Error & { status: number } => {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
};

const isMultipartPayload = (req: Request): boolean => typeof req.body?.payload === "string";

const normalizePayload = (req: Request): UpdatePayload => {
  if (isMultipartPayload(req)) {
    try {
      const parsed = JSON.parse(req.body.payload as string) as UpdatePayload;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("payload debe ser un objeto JSON");
      }
      return parsed;
    } catch (_error) {
      throw toHttpError(400, "payload JSON invalido");
    }
  }

  return req.body as UpdatePayload;
};

const normalizeFileMap = (files: Express.Multer.File[]): Map<string, Express.Multer.File[]> => {
  const fileMap = new Map<string, Express.Multer.File[]>();
  const fieldRegex = /^bedroomFiles\[(.+)\]$/;

  for (const file of files) {
    const match = fieldRegex.exec(file.fieldname);
    if (!match) {
      throw toHttpError(400, `Campo de archivo invalido: ${file.fieldname}. Usa bedroomFiles[<key>]`);
    }

    const key = match[1].trim();
    if (!key) {
      throw toHttpError(400, "La key de bedroomFiles no puede ser vacia");
    }

    const bucket = fileMap.get(key) ?? [];
    bucket.push(file);
    fileMap.set(key, bucket);
  }

  return fileMap;
};

const normalizeBedrooms = (value: unknown): BedroomInput[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw toHttpError(400, "bedrooms debe ser un array");

  return value as BedroomInput[];
};

const ensureUniqueBedroomNumbers = (bedrooms: BedroomInput[]): void => {
  const seen = new Set<number>();
  for (const bedroom of bedrooms) {
    if (!Number.isInteger(bedroom.number) || (bedroom.number as number) < 1) {
      throw toHttpError(400, "bedrooms[].number debe ser un entero >= 1");
    }

    const key = bedroom.number as number;
    if (seen.has(key)) {
      throw toHttpError(400, `bedrooms[].number duplicado: ${key}`);
    }
    seen.add(key);
  }
};

const getBedroomKeys = (bedroom: BedroomInput): string[] => {
  const keys: string[] = [];
  if (typeof bedroom._id === "string" && bedroom._id.trim().length > 0) keys.push(bedroom._id.trim());
  if (typeof bedroom.clientKey === "string" && bedroom.clientKey.trim().length > 0) keys.push(bedroom.clientKey.trim());
  if (typeof bedroom.number === "number" && Number.isInteger(bedroom.number) && bedroom.number > 0) {
    keys.push(String(bedroom.number));
  }
  return Array.from(new Set(keys));
};

const normalizeKeptUrls = (bedroom: BedroomInput): string[] => {
  const source = Array.isArray(bedroom.keepUrls) ? bedroom.keepUrls : Array.isArray(bedroom.photos) ? bedroom.photos : [];
  return source.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
};

export class RoomTypeLocalSpecsController {
  static create = async (req: Request, res: Response): Promise<void> => {
    try {
      if (mongoose.connection.readyState !== 1) {
        res.status(503).json({ error: "Base de datos no conectada" });
        return;
      }

      const { roomTypeID, bedrooms, bathroomsCount, condominioID } = req.body as {
        roomTypeID: string;
        bathroomsCount: number;
        bedrooms: Array<{ number: number; description?: string; photos?: string[] }>;
        condominioID?: string;
      };

      const doc = await RoomTypeLocalSpecs.create({
        roomTypeID,
        bathroomsCount,
        condominioID: typeof condominioID === "string" ? new mongoose.Types.ObjectId(condominioID) : undefined,
        bedrooms: Array.isArray(bedrooms)
          ? bedrooms.map((b) => ({
              number: b.number,
              description: typeof b.description === "string" ? b.description : undefined,
              photos: Array.isArray(b.photos) ? b.photos : [],
            }))
          : [],
      });
      res.status(201).json({ success: true, data: doc });
    } catch (error) {
      if (isMongoDuplicateKeyError(error)) {
        res.status(409).json({ error: "Ya existe un registro con ese roomTypeID" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  };

  static getByRoomTypeID = async (req: Request, res: Response): Promise<void> => {
    try {
      if (mongoose.connection.readyState !== 1) {
        res.status(503).json({ error: "Base de datos no conectada" });
        return;
      }

      const { roomTypeID } = req.params;
      const doc = await RoomTypeLocalSpecs.findOne({ roomTypeID }).lean();
      if (!doc) {
        res.status(404).json({ error: "No encontrado" });
        return;
      }

      const condominioID = doc.condominioID ? String(doc.condominioID) : null;
      const mapUrl = condominioID ? await CondominiosService.getMapUrlById(condominioID) : null;

      res.json({ success: true, data: { ...doc, condominioID, mapUrl } });
    } catch (_error) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  };

  static updateByRoomTypeID = async (req: Request, res: Response): Promise<void> => {
    const uploadedFileIds: string[] = [];

    try {
      if (mongoose.connection.readyState !== 1) {
        res.status(503).json({ error: "Base de datos no conectada" });
        return;
      }

      const { roomTypeID } = req.params;

      const payload = normalizePayload(req);
      const bathroomsCount = payload.bathroomsCount;
      const condominioID = payload.condominioID;
      const bedrooms = normalizeBedrooms(payload.bedrooms);
      const files = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];
      const filesByBedroom = normalizeFileMap(files);

      if (bedrooms.length === 0 && bathroomsCount === undefined && condominioID === undefined) {
        res.status(400).json({ error: "Debes enviar bedrooms y/o bathroomsCount y/o condominioID" });
        return;
      }

      if (bathroomsCount !== undefined && (!Number.isInteger(bathroomsCount) || bathroomsCount < 0)) {
        res.status(400).json({ error: "bathroomsCount debe ser un entero >= 0" });
        return;
      }

      if (condominioID !== undefined && !mongoose.Types.ObjectId.isValid(condominioID)) {
        res.status(400).json({ error: "condominioID debe ser un ObjectId valido" });
        return;
      }

      if (bedrooms.length > 0) {
        ensureUniqueBedroomNumbers(bedrooms);
      }

      const update: Partial<{
        bathroomsCount: number;
        condominioID: mongoose.Types.ObjectId;
        bedrooms: Array<{ number: number; description?: string; photos: string[] }>;
      }> = {};

      if (bathroomsCount !== undefined) update.bathroomsCount = bathroomsCount;
      if (condominioID !== undefined) update.condominioID = new mongoose.Types.ObjectId(condominioID);

      if (bedrooms.length > 0 || files.length > 0) {
        const normalizedBedrooms: Array<{ number: number; description?: string; photos: string[] }> = [];

        for (const bedroom of bedrooms) {
          const keys = getBedroomKeys(bedroom);
          const fileCandidates = keys.flatMap((key) => filesByBedroom.get(key) ?? []);

          for (const key of keys) filesByBedroom.delete(key);

          const uploadedUrls: string[] = [];
          for (const file of fileCandidates) {
            const uploaded = await SupabaseStorageService.uploadFile({
              fileBuffer: file.buffer,
              originalName: file.originalname,
              mimeType: file.mimetype,
            });
            uploadedFileIds.push(uploaded.fileId);
            uploadedUrls.push(uploaded.url);
          }

          const keptUrls = normalizeKeptUrls(bedroom);
          const photos = Array.from(new Set([...keptUrls, ...uploadedUrls]));

          normalizedBedrooms.push({
            number: bedroom.number as number,
            description: typeof bedroom.description === "string" ? bedroom.description : undefined,
            photos,
          });
        }

        if (filesByBedroom.size > 0) {
          const orphanKeys = Array.from(filesByBedroom.keys());
          throw toHttpError(400, `Hay archivos sin dormitorio en payload: ${orphanKeys.join(", ")}`);
        }

        update.bedrooms = normalizedBedrooms;
      }

      const doc = await RoomTypeLocalSpecs.findOneAndUpdate({ roomTypeID }, update, {
        new: true,
        runValidators: true,
      }).lean();

      if (!doc) {
        res.status(404).json({ error: "No encontrado" });
        return;
      }

      res.json({ success: true, data: doc });
    } catch (error) {
      if (uploadedFileIds.length > 0) {
        await Promise.allSettled(uploadedFileIds.map((fileId) => SupabaseStorageService.deleteFile({ fileId })));
      }

      const status = typeof (error as { status?: unknown })?.status === "number" ? ((error as { status: number }).status as number) : 500;
      if (status !== 500) {
        res.status(status).json({ error: (error as Error).message || "Error de validacion" });
        return;
      }

      res.status(500).json({ error: "Error interno del servidor" });
    }
  };
}
