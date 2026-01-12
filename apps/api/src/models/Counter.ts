import mongoose, { Schema } from "mongoose";

const CounterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    seq: { type: Number, required: true, default: 0 }
  },
  { timestamps: false }
);

export type Counter = mongoose.InferSchemaType<typeof CounterSchema> & { _id: mongoose.Types.ObjectId };
export const CounterModel =
  ((mongoose.models.Counter as mongoose.Model<Counter> | undefined) ??
    mongoose.model<Counter>("Counter", CounterSchema));


