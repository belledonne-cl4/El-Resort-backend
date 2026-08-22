import Counter from "../models/Counter";

/** Código correlativo legible para el libro de reclamaciones, ej. REC-2026-00001. */
export const ClaimCodeService = {
  async nextCode(now: Date = new Date()): Promise<string> {
    const year = now.getFullYear();
    const scope = `claims-${year}`;

    const counter = await Counter.findOneAndUpdate(
      { _id: scope },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );

    return `REC-${year}-${String(counter.seq).padStart(5, "0")}`;
  },
};
