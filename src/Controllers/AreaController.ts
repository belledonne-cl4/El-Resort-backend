import type { Request, Response } from "express";
import Area, { AREA_CATEGORIAS } from "../models/Area";
import { asOptionalString } from "../utils/http";

/**
 * @openapi
 * /api/areas:
 *   get:
 *     tags: [Areas]
 *     summary: Listar áreas
 *     parameters:
 *       - in: query
 *         name: categoria
 *         required: false
 *         schema:
 *           type: string
 *           enum: [AREAS, ACTIVIDADES_GRUPALES]
 *     responses:
 *       200:
 *         description: Listado
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Area' }
 *   post:
 *     tags: [Areas]
 *     summary: Crear área
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateAreaRequest' }
 *     responses:
 *       200: { description: OK }
 *       400:
 *         description: Validación
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
export class AreaController {
  static getAllAreas = async (_req: Request, res: Response) => {
    try {
      const categoria = asOptionalString(_req.query.categoria);
      if (categoria && !AREA_CATEGORIAS.includes(categoria as (typeof AREA_CATEGORIAS)[number])) {
        res.status(400).json({ error: "Categoría inválida" });
        return;
      }

      const filter = categoria ? { categoria } : {};
      const areas = await Area.find(filter).lean();
      res.json(areas);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error al obtener las áreas", error });
    }
  };

  static createArea = async (req: Request, res: Response) => {
    const { nombre, imagenes, categoria } = req.body as { nombre?: unknown; imagenes?: unknown; categoria?: unknown };

    const area = new Area({
      nombre,
      categoria,
      imagenes: Array.isArray(imagenes) ? imagenes : [],
    });

    try {
      await area.save();
      res.send("Área creada correctamente");
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error al crear el área", error });
    }
  };
}
