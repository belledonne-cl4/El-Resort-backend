import type { Request, Response } from "express";
import { RoomsService } from "../services/rooms.service";

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

const asOptionalInt = (value: unknown): number | undefined => {
  const raw = pickFirstQueryValue(value);
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed.length) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) return undefined;
  return parsed;
};

/**
 * @openapi
 * /api/rooms:
 *   get:
 *     tags: [Rooms]
 *     summary: Listar rooms (Cloudbeds)
 *     parameters:
 *       - in: query
 *         name: propertyIDs
 *         required: false
 *         schema: { type: string }
 *         description: Property IDs (coma-separado)
 *       - in: query
 *         name: roomTypeID
 *         required: false
 *         schema: { type: string }
 *         description: Room type IDs (coma-separado)
 *       - in: query
 *         name: roomTypeNameShort
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: includeRoomRelations
 *         required: false
 *         schema: { type: integer, default: 0, minimum: 0 }
 *       - in: query
 *         name: pageNumber
 *         required: false
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: pageSize
 *         required: false
 *         schema: { type: integer, default: 20, minimum: 1 }
 *       - in: query
 *         name: sort
 *         required: false
 *         schema: { type: string }
 *         description: "Reglas: field[:direction];... (room_position, sorting_position)"
 *     responses:
 *       200:
 *         description: Respuesta Cloudbeds (raw JSON)
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       502:
 *         description: Error Cloudbeds
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
export class RoomsController {
  static getRooms = async (req: Request, res: Response): Promise<void> => {
    try {
      const startDate = asOptionalString(req.query.startDate);
      const endDate = asOptionalString(req.query.endDate);

      if ((startDate && !endDate) || (!startDate && endDate)) {
        res.status(400).json({ error: "startDate y endDate deben enviarse juntos" });
        return;
      }

      const includeRoomRelations = asOptionalInt(req.query.includeRoomRelations);
      if (includeRoomRelations !== undefined && includeRoomRelations < 0) {
        res.status(400).json({ error: "includeRoomRelations inválido" });
        return;
      }

      const pageNumber = asOptionalInt(req.query.pageNumber);
      const pageSize = asOptionalInt(req.query.pageSize);
      if (pageNumber !== undefined && pageNumber < 1) {
        res.status(400).json({ error: "pageNumber inválido" });
        return;
      }
      if (pageSize !== undefined && pageSize < 1) {
        res.status(400).json({ error: "pageSize inválido" });
        return;
      }

      const data = await RoomsService.getRooms({
        propertyIDs: asOptionalString(req.query.propertyIDs),
        roomTypeID: asOptionalString(req.query.roomTypeID),
        roomTypeNameShort: asOptionalString(req.query.roomTypeNameShort),
        startDate,
        endDate,
        includeRoomRelations,
        pageNumber: pageNumber ?? 1,
        pageSize: pageSize ?? 20,
        sort: asOptionalString(req.query.sort),
      });

      res.json(data);
    } catch (error) {
      if (error instanceof RoomsService.CloudbedsHttpError) {
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

