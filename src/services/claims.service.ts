import Claim, {
  type ClaimContractedGood,
  type ClaimDocumentType,
  type ClaimReportType,
} from "../models/Claim";
import { GcsStorageService } from "./csStorage.service";
import { ClaimCodeService } from "./claimCode.service";
import { ClaimEmailService } from "./claimEmail.service";
import { BrevoClient } from "../integrations/brevoClient";
import { getBrevoConfigFromEnv } from "../config/brevo";
import { toHttpError } from "../utils/errors";

export type CreateClaimInput = {
  fullName: string;
  representativeName?: string;
  documentType: ClaimDocumentType;
  documentNumber: string;
  email: string;
  phone: string;
  reportType: ClaimReportType;
  summary: string;
  amountClaimed?: number | null;
  contractedGood: ClaimContractedGood;
  contractedGoodDetail: string;
  detail: string;
  request: string;
  acceptedTerms: boolean;
};

export type CreateClaimResult = {
  code: string;
  id: string;
  submittedAt: string;
};

const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const ClaimsService = {
  async createClaim(
    input: CreateClaimInput,
    files: Express.Multer.File[],
    meta: { ip?: string; userAgent?: string }
  ): Promise<CreateClaimResult> {
    for (const file of files) {
      if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
        throw toHttpError(400, `Tipo de archivo no permitido: ${file.mimetype}`);
      }
    }

    const uploadedFileIds: string[] = [];
    try {
      const attachments = [];
      for (const file of files) {
        const uploaded = await GcsStorageService.uploadFile({
          fileBuffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          mediaKind: "file",
        });
        uploadedFileIds.push(uploaded.fileId);
        attachments.push({
          url: uploaded.url,
          fileId: uploaded.fileId,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        });
      }

      const code = await ClaimCodeService.nextCode();

      const doc = await Claim.create({
        ...input,
        code,
        attachments,
        submittedIp: meta.ip,
        submittedUserAgent: meta.userAgent,
      });

      // El correo es best-effort: nunca debe tumbar el registro del reclamo, que ya
      // quedó guardado con su código (lo legalmente exigible) pase lo que pase acá.
      try {
        const cfg = getBrevoConfigFromEnv();

        try {
          const { subject, htmlContent } = ClaimEmailService.buildConsumerConfirmationEmail(doc);
          await BrevoClient.sendTransactionalEmail({
            sender: { email: cfg.senderEmail, name: cfg.senderName },
            to: [{ email: doc.email, name: doc.fullName }],
            replyTo: { email: cfg.senderEmail, name: cfg.senderName },
            subject,
            htmlContent,
          });
          doc.consumerEmailSentAt = new Date();
        } catch (emailError) {
          console.error("[ClaimsService.createClaim] fallo al enviar correo al consumidor:", emailError);
        }

        try {
          const { subject, htmlContent } = ClaimEmailService.buildInternalNotificationEmail(doc);
          await BrevoClient.sendTransactionalEmail({
            sender: { email: cfg.senderEmail, name: cfg.senderName },
            to: [{ email: cfg.senderEmail }, ...cfg.claimCcEmails.map((email) => ({ email }))],
            replyTo: { email: doc.email, name: doc.fullName },
            subject,
            htmlContent,
          });
          doc.internalEmailSentAt = new Date();
        } catch (emailError) {
          console.error("[ClaimsService.createClaim] fallo al enviar correo interno:", emailError);
        }

        await doc.save();
      } catch (configError) {
        console.error("[ClaimsService.createClaim] configuración de Brevo inválida:", configError);
      }

      return {
        code: doc.code,
        id: String(doc._id),
        submittedAt: doc.createdAt.toISOString(),
      };
    } catch (error) {
      if (uploadedFileIds.length > 0) {
        await Promise.allSettled(uploadedFileIds.map((fileId) => GcsStorageService.deleteFile({ fileId })));
      }
      throw error;
    }
  },
};
