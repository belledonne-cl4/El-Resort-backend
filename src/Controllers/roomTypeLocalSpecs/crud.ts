import type { Request, Response } from "express";
import RoomTypeLocalSpecs from "../../models/RoomTypeLocalSpecs";
import mongoose from "mongoose";
import { CondominiosService } from "../../services/condominios.service";
import { parseIdiomaQuery } from "../../utils/idioma";
import { RoomTypeTranslationService } from "../../services/roomTypeTranslation.service";
import { BeneficiosService } from "../../services/beneficios.service";
import { RoomTypeLocalTextService } from "../../services/roomTypeLocalText.service";
import { toHttpError, getErrorStatus } from "../../utils/errors";
import {
  isMongoDuplicateKeyError,
  normalizePayload,
  normalizeFileMap,
  normalizeBedrooms,
  ensureUniqueBedroomNumbers,
  getBedroomKeys,
  normalizeKeptUrls,
  normalizeStringArray,
  normalizeBeneficios,
  normalizeTranslatableText,
  normalizePricing,
  assertImageFiles,
  assertVideoFiles,
} from "./normalize";
import { uploadImageFile, uploadVideoFile, rollbackUploads, type UploadTracker } from "./mediaUpload";
import { fetchCloudbedsRoomTypesMapSafe, fetchCloudbedsRatesMapSafe } from "./cloudbedsEnrichment";

export const create = async (req: Request, res: Response): Promise<void> => {
  const tracker: UploadTracker = { uploadedFileIds: [] };
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Base de datos no conectada" });
      return;
    }

    const { roomTypeID, bedrooms, bathroomsCount, titleColor, condominioID, video_url, extraGalleryImages, portada_video, portada, portadaMenu, pricing, posicion_fotos_portadas } = req.body as {
      roomTypeID: string;
      bathroomsCount: number;
      titleColor?: string | null;
      bedrooms: Array<{ number: number; description?: string; photos?: string[] }>;
      condominioID?: string;
      video_url?: string[];
      extraGalleryImages?: string[];
      portada_video?: string;
      portada?: string;
      portadaMenu?: string;
      pricing?: {
        totalRate?: number;
        ofertaDelMesRoomRate?: number;
      };
      posicion_fotos_portadas?: Record<string, unknown> | null;
    };

    const normalizedVideoUrls = normalizeStringArray(video_url, "video_url") ?? [];
    const normalizedExtraGalleryImages = normalizeStringArray(extraGalleryImages, "extraGalleryImages") ?? [];
    const normalizedPricing = normalizePricing(pricing, "pricing");

    // Normalizar posicion_fotos_portadas (permitir objeto o null)
    let normalizedPosicionFotos: Record<string, unknown> | null | undefined = undefined;
    const rawPosicion = (posicion_fotos_portadas as unknown) as unknown;
    if (rawPosicion !== undefined) {
      if (rawPosicion === null) {
        normalizedPosicionFotos = null;
      } else if (rawPosicion && typeof rawPosicion === "object" && !Array.isArray(rawPosicion)) {
        normalizedPosicionFotos = rawPosicion as Record<string, unknown>;
      } else {
        throw toHttpError(400, "posicion_fotos_portadas debe ser un objeto o null");
      }
    }

    // manejar archivos multipart (opcional): portadaVideoImageFiles + portadaImageFiles
    const files = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];
    let portadaVideoImageFiles: Express.Multer.File[] = [];
    let portadaImageFiles: Express.Multer.File[] = [];
    let portadaMenuImageFiles: Express.Multer.File[] = [];
    if (files.length > 0) {
      const normalizedFiles = normalizeFileMap(files);
      portadaVideoImageFiles = normalizedFiles.portadaVideoImageFiles ?? [];
      portadaImageFiles = normalizedFiles.portadaImageFiles ?? [];
      portadaMenuImageFiles = normalizedFiles.portadaMenuImageFiles ?? [];
    }

    if (portadaVideoImageFiles.length > 0) {
      assertImageFiles(portadaVideoImageFiles, "portadaVideoImageFiles");
    }
    if (portadaMenuImageFiles.length > 0) {
      assertImageFiles(portadaMenuImageFiles, "portadaMenuImageFiles");
    }

    let portada_video_value: string | null = typeof portada_video === "string" && portada_video.trim().length > 0 ? portada_video.trim() : null;
    if (portadaVideoImageFiles.length > 0) {
      portada_video_value = await uploadImageFile(portadaVideoImageFiles[0], tracker);
    }

    // portada (imagen principal)
    let portada_value: string | null = typeof portada === "string" && portada.trim().length > 0 ? portada.trim() : null;
    if (portadaImageFiles.length > 0) {
      portada_value = await uploadImageFile(portadaImageFiles[0], tracker);
    }

    // portadaMenu (imagen para menu)
    let portadaMenu_value: string | null = typeof portadaMenu === "string" && portadaMenu.trim().length > 0 ? portadaMenu.trim() : null;
    if (portadaMenuImageFiles.length > 0) {
      portadaMenu_value = await uploadImageFile(portadaMenuImageFiles[0], tracker);
    }

    const doc = await RoomTypeLocalSpecs.create({
      roomTypeID,
      bathroomsCount,
      titleColor: typeof titleColor === "string" ? titleColor : null,
      condominioID: typeof condominioID === "string" ? new mongoose.Types.ObjectId(condominioID) : undefined,
      bedrooms: Array.isArray(bedrooms)
        ? bedrooms.map((b) => ({
            number: b.number,
            description: typeof b.description === "string" ? b.description : undefined,
            photos: Array.isArray(b.photos) ? b.photos : [],
          }))
        : [],
      video_url: normalizedVideoUrls,
      portada: portada_value,
      portadaMenu: portadaMenu_value,
      portada_video: portada_video_value,
      extraGalleryImages: normalizedExtraGalleryImages,
      pricing: normalizedPricing,
      posicion_fotos_portadas: normalizedPosicionFotos,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    if (tracker.uploadedFileIds.length > 0) {
      await rollbackUploads(tracker.uploadedFileIds);
    }

    if (isMongoDuplicateKeyError(error)) {
      res.status(409).json({ error: "Ya existe un registro con ese roomTypeID" });
      return;
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const getByRoomTypeID = async (req: Request, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Base de datos no conectada" });
      return;
    }

    const idioma = parseIdiomaQuery((req.query as Record<string, unknown>).idioma);
    if (!idioma) {
      res.status(400).json({ error: "idioma es requerido (es|en)" });
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

    // Beneficios del catálogo local (icono + texto) ya resueltos y ordenados.
    const beneficiosResueltos = await BeneficiosService.resolveForRoomType(doc.beneficios);

    // Enriquecer con datos de CloudBeds
    const enriched: Record<string, unknown> = {
      ...doc,
      condominioID,
      mapUrl,
      // Los ids crudos siguen saliendo para que el dashboard marque los checkboxes.
      beneficios: (doc.beneficios ?? []).map((id) => String(id)),
      beneficiosResueltos,
    };

    const cbMap = await fetchCloudbedsRoomTypesMapSafe();
    const cb = cbMap.get(roomTypeID) as Record<string, unknown> | undefined;
    if (cb) {
      // Local manda si tiene contenido; Cloudbeds solo se usa de respaldo, y se sintetiza
      // en la misma forma {es, en} para que la respuesta sea siempre uniforme.
      const localName = enriched.roomTypeName as { es?: string; en?: string | null } | undefined;
      enriched.roomTypeName =
        localName?.es && localName.es.trim().length > 0
          ? localName
          : { es: typeof cb.roomTypeName === "string" ? cb.roomTypeName : "", en: null };

      const localDescription = enriched.roomTypeDescription as { es?: string; en?: string | null } | undefined;
      enriched.roomTypeDescription =
        localDescription?.es && localDescription.es.trim().length > 0
          ? localDescription
          : { es: typeof cb.roomTypeDescription === "string" ? cb.roomTypeDescription : "", en: null };

      enriched.roomTypePhotos = Array.isArray(cb.roomTypePhotos) ? cb.roomTypePhotos : enriched.roomTypePhotos;
      // Local manda si tiene un valor seteado; Cloudbeds solo se usa de respaldo.
      const localMaxGuests = typeof enriched.maxGuests === "number" ? enriched.maxGuests : undefined;
      enriched.maxGuests = localMaxGuests ?? (typeof cb.maxGuests === "number" ? cb.maxGuests : undefined);
      enriched.roomTypeFeatures = Array.isArray(cb.roomTypeFeatures) ? cb.roomTypeFeatures : enriched.roomTypeFeatures;
    }

    // Enriquecer pricing con CloudBeds si el local tiene totalRate 0
    const localPricing = enriched.pricing as Record<string, unknown> | undefined;
    const localTotalRate = localPricing && typeof localPricing.totalRate === "number" ? localPricing.totalRate : undefined;
    if (!localTotalRate || localTotalRate === 0) {
      const cbRates = await fetchCloudbedsRatesMapSafe();
      const cbRate = cbRates.get(roomTypeID);
      if (cbRate) {
        const resolvedPricing = { ...(enriched.pricing as Record<string, unknown> || {}) };
        if ((!resolvedPricing.totalRate || resolvedPricing.totalRate === 0) && cbRate.totalRate !== undefined) {
          resolvedPricing.totalRate = cbRate.totalRate;
        }
        if ((!resolvedPricing.ofertaDelMesRoomRate || resolvedPricing.ofertaDelMesRoomRate === 0) && cbRate.ofertaRate !== undefined) {
          resolvedPricing.ofertaDelMesRoomRate = cbRate.ofertaRate;
        }
        enriched.pricing = resolvedPricing;
        enriched.pricingSource = "cloudbeds";
      }
    } else {
      enriched.pricingSource = "local";
    }

    const payload = { success: true, data: enriched };
    if (idioma === "en") {
      const translated = await RoomTypeTranslationService.translateRoomTypeSpecsPayloadToEnglish(payload);
      res.json(translated);
      return;
    }

    res.json(payload);
  } catch (_error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const updateByRoomTypeID = async (req: Request, res: Response): Promise<void> => {
  const tracker: UploadTracker = { uploadedFileIds: [] };

  try {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "Base de datos no conectada" });
      return;
    }

    const { roomTypeID } = req.params;

    const payload = normalizePayload(req);
    const bathroomsCount = payload.bathroomsCount;
    const titleColor = payload.titleColor;
    const condominioID = payload.condominioID;
    const bedrooms = normalizeBedrooms(payload.bedrooms);
    const videoUrls = normalizeStringArray(payload.video_url, "video_url");
    const extraGalleryImages = normalizeStringArray(payload.extraGalleryImages, "extraGalleryImages");
    const portadaVideoRaw = payload.portada_video;
    const portadaRaw = payload.portada;
    const portadaMenuRaw = payload.portadaMenu;
    const pricing = normalizePricing(payload.pricing, "pricing");
    const beneficios = normalizeBeneficios(payload.beneficios, "beneficios");
    const roomTypeNamePayload = normalizeTranslatableText(payload.roomTypeName, "roomTypeName");
    const roomTypeDescriptionPayload = normalizeTranslatableText(payload.roomTypeDescription, "roomTypeDescription");
    const maxGuestsPayload = payload.maxGuests;
    const files = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];
    const { bedroomFilesByKey, videoFiles, extraGalleryImageFiles, portadaVideoImageFiles, portadaImageFiles, portadaMenuImageFiles } = normalizeFileMap(files);

    assertVideoFiles(videoFiles, "videoFiles");
    assertImageFiles(extraGalleryImageFiles, "extraGalleryImageFiles");
    assertImageFiles(portadaVideoImageFiles, "portadaVideoImageFiles");
    assertImageFiles(portadaImageFiles, "portadaImageFiles");
    assertImageFiles(portadaMenuImageFiles, "portadaMenuImageFiles");

    if (
      bedrooms.length === 0 &&
      bathroomsCount === undefined &&
      titleColor === undefined &&
      condominioID === undefined &&
      videoUrls === undefined &&
      extraGalleryImages === undefined &&
      pricing === undefined &&
      beneficios === undefined &&
      roomTypeNamePayload === undefined &&
      roomTypeDescriptionPayload === undefined &&
      maxGuestsPayload === undefined &&
      videoFiles.length === 0 &&
      extraGalleryImageFiles.length === 0 &&
      portadaImageFiles.length === 0 &&
      portadaMenuImageFiles.length === 0 &&
      portadaRaw === undefined &&
      portadaMenuRaw === undefined &&
      portadaVideoImageFiles.length === 0 &&
      portadaVideoRaw === undefined
    ) {
      res
        .status(400)
        .json({ error: "Debes enviar bedrooms y/o bathroomsCount y/o titleColor y/o condominioID y/o video_url y/o extraGalleryImages y/o pricing" });
      return;
    }

    if (bathroomsCount !== undefined && (!Number.isInteger(bathroomsCount) || bathroomsCount < 0)) {
      res.status(400).json({ error: "bathroomsCount debe ser un entero >= 0" });
      return;
    }

    if (
      maxGuestsPayload !== undefined &&
      maxGuestsPayload !== null &&
      (!Number.isInteger(maxGuestsPayload) || maxGuestsPayload < 1)
    ) {
      res.status(400).json({ error: "maxGuests debe ser un entero >= 1, o null para volver a Cloudbeds" });
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
      titleColor: string | null;
      condominioID: mongoose.Types.ObjectId;
      bedrooms: Array<{ number: number; description?: string; photos: string[] }>;
      video_url: string[];
      extraGalleryImages: string[];
      portada_video?: string | null;
      portada?: string | null;
      portadaMenu?: string | null;
      pricing: {
        totalRate?: number;
        ofertaDelMesRoomRate?: number;
      };
      beneficios: mongoose.Types.ObjectId[];
      roomTypeName: { es: string; en: string | null };
      roomTypeDescription: { es: string; en: string | null };
      maxGuests: number | null;
    }> = {};

    if (bathroomsCount !== undefined) update.bathroomsCount = bathroomsCount;
    if (titleColor !== undefined) update.titleColor = typeof titleColor === "string" ? titleColor : null;
    if (condominioID !== undefined) update.condominioID = new mongoose.Types.ObjectId(condominioID);
    if (pricing !== undefined) update.pricing = pricing;
    if (beneficios !== undefined) update.beneficios = beneficios;
    if (roomTypeNamePayload !== undefined) {
      update.roomTypeName = {
        es: roomTypeNamePayload.es,
        en: await RoomTypeLocalTextService.resolveEnglishText(roomTypeNamePayload.es, roomTypeNamePayload.en),
      };
    }
    if (roomTypeDescriptionPayload !== undefined) {
      update.roomTypeDescription = {
        es: roomTypeDescriptionPayload.es,
        en: await RoomTypeLocalTextService.resolveEnglishText(
          roomTypeDescriptionPayload.es,
          roomTypeDescriptionPayload.en
        ),
      };
    }
    if (maxGuestsPayload !== undefined) update.maxGuests = maxGuestsPayload;

    if (bedrooms.length > 0 || files.length > 0) {
      const normalizedBedrooms: Array<{ number: number; description?: string; photos: string[] }> = [];

      for (const bedroom of bedrooms) {
        const keys = getBedroomKeys(bedroom);
        const fileCandidates = keys.flatMap((key) => bedroomFilesByKey.get(key) ?? []);

        for (const key of keys) bedroomFilesByKey.delete(key);

        const uploadedUrls: string[] = [];
        for (const file of fileCandidates) {
          uploadedUrls.push(await uploadImageFile(file, tracker));
        }

        const keptUrls = normalizeKeptUrls(bedroom);
        const photos = Array.from(new Set([...keptUrls, ...uploadedUrls]));

        normalizedBedrooms.push({
          number: bedroom.number as number,
          description: typeof bedroom.description === "string" ? bedroom.description : undefined,
          photos,
        });
      }

      if (bedroomFilesByKey.size > 0) {
        const orphanKeys = Array.from(bedroomFilesByKey.keys());
        throw toHttpError(400, `Hay archivos sin dormitorio en payload: ${orphanKeys.join(", ")}`);
      }

      update.bedrooms = normalizedBedrooms;
    }

    if (videoUrls !== undefined || videoFiles.length > 0) {
      const uploadedVideoUrls: string[] = [];
      for (const file of videoFiles) {
        uploadedVideoUrls.push(await uploadVideoFile(file, tracker));
      }

      update.video_url = Array.from(new Set([...(videoUrls ?? []), ...uploadedVideoUrls]));
    }

    // Si se envió archivo de portada, subir la primera imagen y usar su URL
    if (portadaVideoImageFiles.length > 0) {
      update.portada_video = await uploadImageFile(portadaVideoImageFiles[0], tracker);
    }

    if (portadaVideoImageFiles.length === 0 && portadaVideoRaw !== undefined) {
      if (portadaVideoRaw === null) {
        update.portada_video = null;
      } else if (typeof portadaVideoRaw === "string") {
        const trimmed = portadaVideoRaw.trim();
        update.portada_video = trimmed.length > 0 ? trimmed : null;
      } else {
        throw toHttpError(400, "portada_video debe ser una cadena o null");
      }
    }

    // portada (imagen principal)
    if (portadaImageFiles.length > 0) {
      update.portada = await uploadImageFile(portadaImageFiles[0], tracker);
    }

    // portadaMenu (imagen para menu)
    if (portadaMenuImageFiles.length > 0) {
      update.portadaMenu = await uploadImageFile(portadaMenuImageFiles[0], tracker);
    }

    if (portadaMenuImageFiles.length === 0 && portadaMenuRaw !== undefined) {
      if (portadaMenuRaw === null) {
        update.portadaMenu = null;
      } else if (typeof portadaMenuRaw === "string") {
        const trimmed = portadaMenuRaw.trim();
        update.portadaMenu = trimmed.length > 0 ? trimmed : null;
      } else {
        throw toHttpError(400, "portadaMenu debe ser una cadena o null");
      }
    }

    if (portadaImageFiles.length === 0 && portadaRaw !== undefined) {
      if (portadaRaw === null) {
        update.portada = null;
      } else if (typeof portadaRaw === "string") {
        const trimmed = portadaRaw.trim();
        update.portada = trimmed.length > 0 ? trimmed : null;
      } else {
        throw toHttpError(400, "portada debe ser una cadena o null");
      }
    }

    if (extraGalleryImages !== undefined || extraGalleryImageFiles.length > 0) {
      const uploadedImageUrls: string[] = [];
      for (const file of extraGalleryImageFiles) {
        uploadedImageUrls.push(await uploadImageFile(file, tracker));
      }

      update.extraGalleryImages = Array.from(new Set([...(extraGalleryImages ?? []), ...uploadedImageUrls]));
    }

    // posicion_fotos_portadas: aceptar objeto o null si se envió en payload
    const posicionFotosRaw = (payload as any).posicion_fotos_portadas;
    if (posicionFotosRaw !== undefined) {
      if (posicionFotosRaw === null) {
        (update as any).posicion_fotos_portadas = null;
      } else if (posicionFotosRaw && typeof posicionFotosRaw === "object" && !Array.isArray(posicionFotosRaw)) {
        (update as any).posicion_fotos_portadas = posicionFotosRaw as Record<string, unknown>;
      } else {
        throw toHttpError(400, "posicion_fotos_portadas debe ser un objeto o null");
      }
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
    if (tracker.uploadedFileIds.length > 0) {
      await rollbackUploads(tracker.uploadedFileIds);
    }

    const status = getErrorStatus(error);
    if (status !== 500) {
      res.status(status).json({ error: (error as Error).message || "Error de validacion" });
      return;
    }

    res.status(500).json({ error: "Error interno del servidor" });
  }
};
