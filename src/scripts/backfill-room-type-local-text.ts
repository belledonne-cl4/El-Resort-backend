/**
 * Backfill de nombre/descripción locales por propiedad
 *
 * Uso:  npx ts-node src/scripts/backfill-room-type-local-text.ts
 *
 * Copia, para cada `RoomTypeLocalSpecs` que aún no tenga `roomTypeName.es`/`roomTypeDescription.es`
 * (o los tenga vacíos), el valor ACTUAL de Cloudbeds — para que el dashboard arranque con
 * contenido para revisar/editar en vez de campos en blanco. Nunca pisa un valor ya editado a
 * mano (idempotente, se puede volver a correr sin riesgo). `en` queda en `null` a propósito: no
 * se traduce en bulk aquí; lo resuelve el respaldo en vivo (LibreTranslate) o la próxima edición
 * manual vía el dashboard.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import type { AnyBulkWriteOperation } from "mongoose";

dotenv.config();

import RoomTypeLocalSpecs from "../models/RoomTypeLocalSpecs";
import { RoomsService } from "../services/rooms.service";

let updated = 0;
let alreadySet = 0;
let noCloudbedsMatch = 0;

async function backfill() {
  console.log("🔗 Conectando a MongoDB...");
  await mongoose.connect(process.env.DATABASE_URL!);
  console.log("✅ Conectado.\n");

  console.log("🔗 Consultando Cloudbeds (getAllRoomTypesMap)...");
  const cbMap = await RoomsService.getAllRoomTypesMap();
  console.log(`✅ ${cbMap.size} tipos de habitación en Cloudbeds.\n`);

  // Todos los docs locales, activos e inactivos: el override es solo un respaldo, así que
  // completar también las inactivas no cambia nada visible, pero deja el dashboard consistente.
  const docs = await RoomTypeLocalSpecs.find({})
    .select({ roomTypeID: 1, roomTypeName: 1, roomTypeDescription: 1 })
    .lean();
  console.log(`📄 Propiedades locales: ${docs.length}\n`);

  const ops: AnyBulkWriteOperation[] = [];

  for (const doc of docs) {
    const hasName = typeof doc.roomTypeName?.es === "string" && doc.roomTypeName.es.trim().length > 0;
    const hasDescription =
      typeof doc.roomTypeDescription?.es === "string" && doc.roomTypeDescription.es.trim().length > 0;

    if (hasName && hasDescription) {
      alreadySet++;
      continue;
    }

    const cb = cbMap.get(doc.roomTypeID);
    if (!cb) {
      console.warn(`  ⚠ Sin contraparte en Cloudbeds: ${doc.roomTypeID} (se deja sin tocar)`);
      noCloudbedsMatch++;
      continue;
    }

    const set: Record<string, unknown> = {};
    if (!hasName) {
      const cbName = typeof cb.roomTypeName === "string" ? cb.roomTypeName : "";
      set.roomTypeName = { es: cbName, en: null };
    }
    if (!hasDescription) {
      const cbDescription = typeof cb.roomTypeDescription === "string" ? cb.roomTypeDescription : "";
      set.roomTypeDescription = { es: cbDescription, en: null };
    }

    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: set },
      },
    });
    updated++;
  }

  if (ops.length > 0) {
    await RoomTypeLocalSpecs.bulkWrite(ops);
  }

  console.log("\n═══════════════════════════════════════");
  console.log("  REPORTE DE BACKFILL");
  console.log("═══════════════════════════════════════");
  console.log(`  Propiedades procesadas:        ${docs.length}`);
  console.log(`  Actualizadas desde Cloudbeds:  ${updated}`);
  console.log(`  Ya tenían nombre+descripción:  ${alreadySet}`);
  console.log(`  Sin contraparte en Cloudbeds:  ${noCloudbedsMatch}`);
  console.log("═══════════════════════════════════════\n");

  await mongoose.disconnect();
  console.log("🔌 Desconectado de MongoDB.");
}

backfill().catch((err) => {
  console.error("💥 Error fatal:", err);
  process.exit(1);
});
