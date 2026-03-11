import type { Request, Response } from "express";
import Extra from "../models/Extras";

/**
 * @openapi
 * /api/extras:
 *   get:
 *     tags: [Extras]
 *     summary: Listar extras
 *     responses:
 *       200:
 *         description: Listado
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Extra' }
 *   post:
 *     tags: [Extras]
 *     summary: Crear extra
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateExtraRequest' }
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
 *
 * /api/extras/{id}:
 *   get:
 *     tags: [Extras]
 *     summary: Obtener extra por id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Extra
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Extra' }
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
 *       404:
 *         description: No encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   put:
 *     tags: [Extras]
 *     summary: Actualizar extra
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateExtraRequest' }
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
 *       404:
 *         description: No encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   delete:
 *     tags: [Extras]
 *     summary: Eliminar extra
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
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
 *       404:
 *         description: No encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
export class ExtraController {
  //Crear Extra
  static createExtra = async (req: Request, res: Response) => {
    const extra = new Extra(req.body);

    try {
      await extra.save();
      res.send("Extra creado correctamente");
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error al crear el extra", error });
    }
  };

  //Obtener todos los extras
  static getAllExtras = async (req: Request, res: Response) => {
    try {
      const extras = await Extra.find({});
      res.json(extras);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error al crear el extra", error });
    }
  };

  //Obtener extra por su ID
  static getExtraById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const extra = await Extra.findById(id);
      if (!extra) {
        const error = new Error("Extra no encontrado");
        res.status(404).json({ error: error.message });
        return;
      }
      res.json(extra);
    } catch (error) {
      console.log(error);
    }
  };

  //Actualizar Extra
  static updateExtra = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const extra = await Extra.findByIdAndUpdate(id, req.body);

      if (!extra) {
        const error = new Error("Extra no encontrado");
        res.status(404).json({ error: error.message });
        return;
      }

      await extra.save();
      res.send("Extra actualizado correctamente");
    } catch (error) {
      console.log(error);
    }
  };

  //Eliminar Extra
  static deleteExtra = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const extra = await Extra.findById(id);

      if (!extra) {
        const error = new Error("Extra no encontrado");
        res.status(404).json({ error: error.message });
        return;
      }

      await extra.deleteOne();
      res.send("Extra eliminado correctamente");
    } catch (error) {
      console.log(error);
    }
  };
}
