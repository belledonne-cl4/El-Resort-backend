import type { Request, Response } from "express";
import mongoose from "mongoose";
import { ClaimsService, type CreateClaimInput } from "../services/claims.service";
import { asOptionalString } from "../utils/http";
import { getErrorStatus } from "../utils/errors";

/**
 * @openapi
 * /api/claims:
 *   post:
 *     tags: [Claims]
 *     summary: Registrar un reclamo o queja (Libro de Reclamaciones Virtual)
 *     description: Endpoint público, sin autenticación. Acepta multipart/form-data con hasta 5 archivos adjuntos.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/CreateClaimMultipartRequest' }
 *     responses:
 *       201:
 *         description: Reclamo registrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ClaimSubmitResponse' }
 *       400:
 *         description: Validación
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
 *       429:
 *         description: Demasiadas solicitudes
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       503:
 *         description: Base de datos no conectada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
export class ClaimsController {
  static submit = async (req: Request, res: Response): Promise<void> => {
    try {
      if (mongoose.connection.readyState !== 1) {
        res.status(503).json({ error: "Base de datos no conectada" });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const amountClaimedRaw = asOptionalString(body.amountClaimed);

      const input: CreateClaimInput = {
        fullName: String(body.fullName ?? "").trim(),
        representativeName: asOptionalString(body.representativeName),
        documentType: body.documentType as CreateClaimInput["documentType"],
        documentNumber: String(body.documentNumber ?? "").trim(),
        email: String(body.email ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
        reportType: body.reportType as CreateClaimInput["reportType"],
        summary: String(body.summary ?? "").trim(),
        amountClaimed: amountClaimedRaw !== undefined ? Number(amountClaimedRaw) : null,
        contractedGood: body.contractedGood as CreateClaimInput["contractedGood"],
        contractedGoodDetail: String(body.contractedGoodDetail ?? "").trim(),
        detail: String(body.detail ?? "").trim(),
        request: String(body.request ?? "").trim(),
        acceptedTerms: body.accept === "true",
      };

      const files = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];

      const result = await ClaimsService.createClaim(input, files, {
        ip: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const status = getErrorStatus(error);
      if (status !== 500) {
        res.status(status).json({ error: (error as Error).message || "Error de validación" });
        return;
      }
      console.error("[ClaimsController.submit]", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  };
}
