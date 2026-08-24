import { create, getByRoomTypeID, updateByRoomTypeID } from "./roomTypeLocalSpecs/crud";
import { updateOrderBulk, getAllAdmin, softDelete, reactivate, duplicate } from "./roomTypeLocalSpecs/admin";

/**
 * @openapi
 * /api/room-type-specs:
 *   post:
 *     security: [{ bearerAuth: [] }]
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
 *       - in: query
 *         name: idioma
 *         required: true
 *         schema: { type: string, enum: [es, en] }
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
 *     security: [{ bearerAuth: [] }]
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
export class RoomTypeLocalSpecsController {
  static create = create;
  static getByRoomTypeID = getByRoomTypeID;
  static updateByRoomTypeID = updateByRoomTypeID;

  /**
   * @openapi
   * /api/room-type-specs/orden:
   *   put:
   *     security: [{ bearerAuth: [] }]
   *     tags: [RoomTypeSpecs]
   *     summary: Actualizar en cascada el campo `orden` de varios RoomTypeLocalSpecs
   *     description: |
   *       Recibe un array de objetos `{ roomTypeID, orden }`. Establece el `orden` proporcionado
   *       para cada `roomTypeID` y elimina `orden` de los registros que no estén en la lista.
   *       Esto sirve para controlar el orden de visualización en el endpoint de show rooms (menor -> mayor).
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: array
   *             items:
   *               type: object
   *               required: [roomTypeID, orden]
   *               properties:
   *                 roomTypeID: { type: string }
   *                 orden: { type: integer, minimum: 1 }
   *     responses:
   *       200:
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   */
  static updateOrderBulk = updateOrderBulk;
  static getAllAdmin = getAllAdmin;
  static softDelete = softDelete;
  static reactivate = reactivate;
  static duplicate = duplicate;
}
