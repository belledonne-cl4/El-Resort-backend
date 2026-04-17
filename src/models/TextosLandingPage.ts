import mongoose, { Schema, Document } from "mongoose";

export type TextosLandingPageType = Document & {
    idioma: string;
    section: mongoose.Types.ObjectId;
    json: unknown;
};

const TextosLandingPageSchema: Schema = new Schema(
    {
        idioma: {
        type: String,
        enum: ["es", "en"],
        required: true,
        lowercase: true,
        trim: true,
        index: true,
        },
        section: {
        type: Schema.Types.ObjectId,
        ref: "LandingPageSection",
        required: true,
        index: true,
        },
        json: {
        type: Schema.Types.Mixed,
        required: true,
        },
    },
    { timestamps: true }
);

TextosLandingPageSchema.pre("validate", async function (next) {
    try {
        const current = this as unknown as {
            _id?: unknown;
            section?: mongoose.Types.ObjectId;
        };
        if (!current.section) {
            next();
            return;
        }

        const model = this.constructor as mongoose.Model<TextosLandingPageType>;
        const sectionFilter: Record<string, unknown> = { section: current.section };

        if (current._id) {
            sectionFilter._id = { $ne: current._id };
        }

        const countForSection = await model.countDocuments(sectionFilter);
        if (countForSection >= 2) {
            next(new Error("Solo se permiten 2 registros por section (idiomas distintos)"));
            return;
        }

        next();
    } catch (error) {
        next(error as Error);
    }
});

TextosLandingPageSchema.index({ idioma: 1, section: 1 }, { unique: true });

const TextosLandingPage = mongoose.model<TextosLandingPageType>("TextosLandingPage", TextosLandingPageSchema);

export default TextosLandingPage;