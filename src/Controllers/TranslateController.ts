import type { Request, Response } from "express";
import { TranslateService } from "../services/translate.service";
import { asNonEmptyTrimmedString, asNonEmptyTrimmedStringArray } from "../utils/translate";

/**
 * @openapi
 * /api/translate/temp:
 *   post:
 *     tags: [Translate]
 *     summary: Endpoint temporal para validar traducciones (es -> en)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Hola, como estas?"
 *               texts:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Hola mundo", "Bienvenido a El Resort"]
 *     responses:
 *       200:
 *         description: Traduccion generada correctamente
 *       400:
 *         description: Body invalido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
export class TranslateController {
  static translateTemp = async (req: Request, res: Response): Promise<void> => {
    try {
      const text = asNonEmptyTrimmedString(req.body?.text);
      const texts = asNonEmptyTrimmedStringArray(req.body?.texts);

      if (!text && !texts) {
        res.status(400).json({ error: "Debes enviar text (string) o texts (string[])" });
        return;
      }

      if (text) {
        const translation = await TranslateService.translateSpanishToEnglish({ text });
        res.json({
          direction: "es->en",
          translation,
        });
        return;
      }

      const translations = await TranslateService.translateManySpanishToEnglish(texts!);
      res.json({
        direction: "es->en",
        translations,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error interno del servidor";
      res.status(500).json({ error: message });
    }
  };
}
