import { GcsStorageService } from "../../services/csStorage.service";

export type UploadTracker = {
  uploadedFileIds: string[];
};

export const uploadImageFile = async (file: Express.Multer.File, tracker: UploadTracker): Promise<string> => {
  const uploaded = await GcsStorageService.uploadFile({
    fileBuffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    mediaKind: "image",
  });
  tracker.uploadedFileIds.push(uploaded.fileId);
  return uploaded.url;
};

export const uploadVideoFile = async (file: Express.Multer.File, tracker: UploadTracker): Promise<string> => {
  const uploaded = await GcsStorageService.uploadFile({
    fileBuffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    mediaKind: "video",
  });
  tracker.uploadedFileIds.push(uploaded.fileId);
  return uploaded.url;
};

export const rollbackUploads = async (uploadedFileIds: string[]): Promise<void> => {
  if (uploadedFileIds.length === 0) return;
  await Promise.allSettled(uploadedFileIds.map((fileId) => GcsStorageService.deleteFile({ fileId })));
};
