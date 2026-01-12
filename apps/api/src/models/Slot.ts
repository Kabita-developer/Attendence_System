import mongoose, { Schema } from "mongoose";

const SlotSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    startMinutes: { type: Number, required: true, min: 0, max: 1439 },
    endMinutes: { type: Number, required: true, min: 1, max: 1440 },
    salary: { type: Number, required: true, min: 0 },

    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

SlotSchema.index({ isActive: 1, sortOrder: 1, endMinutes: 1 });

export type Slot = mongoose.InferSchemaType<typeof SlotSchema> & { _id: mongoose.Types.ObjectId };
export const SlotModel =
  ((mongoose.models.Slot as mongoose.Model<Slot> | undefined) ?? mongoose.model<Slot>("Slot", SlotSchema));


