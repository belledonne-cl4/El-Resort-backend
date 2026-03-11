import type { Request, Response } from "express";
import { TaxesService } from "../services/taxes.service";

const pickFirstQueryValue = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

const asOptionalString = (value: unknown): string | undefined => {
  const raw = pickFirstQueryValue(value);
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : undefined;
};

const asOptionalBoolean = (value: unknown): boolean | undefined => {
  const raw = pickFirstQueryValue(value);
  if (raw === undefined) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return undefined;
};

/**
 * @openapi
 * /api/taxes:
 *   get:
 *     tags: [Taxes]
 *     summary: Listar taxes and fees (Cloudbeds)
 *     parameters:
 *       - in: query
 *         name: propertyID
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: includeDeleted
 *         required: false
 *         schema: { type: boolean, default: false }
 *       - in: query
 *         name: includeExpired
 *         required: false
 *         schema: { type: boolean, default: false }
 *       - in: query
 *         name: includeCustomItemTaxes
 *         required: false
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Respuesta Cloudbeds (raw JSON)
 *       502:
 *         description: Error Cloudbeds
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
export class TaxesController {
  static getTaxesAndFees = async (req: Request, res: Response): Promise<void> => {
    try {
      const includeDeleted = asOptionalBoolean(req.query.includeDeleted) === true ? true : undefined;
      const includeExpired = asOptionalBoolean(req.query.includeExpired) === true ? true : undefined;
      const includeCustomItemTaxes = asOptionalBoolean(req.query.includeCustomItemTaxes) === true ? true : undefined;

      const data = await TaxesService.getTaxesAndFees({
        propertyID: asOptionalString(req.query.propertyID),
        includeDeleted,
        includeExpired,
        includeCustomItemTaxes,
      });

      res.json(data);
    } catch (error) {
      if (error instanceof TaxesService.CloudbedsHttpError) {
        res.status(error.status || 502).json({
          error: {
            provider: "cloudbeds",
            status: error.status,
            message: error.message,
            request: error.request,
            data: error.responseBody,
          },
        });
        return;
      }

      res.status(500).json({ error: "Error interno del servidor" });
    }
  };
}

