import mongoose, { Schema } from "mongoose";
const CounterSchema = new Schema({
    key: { type: String, required: true, unique: true, index: true },
    seq: { type: Number, required: true, default: 0 }
}, { timestamps: false });
export const CounterModel = (mongoose.models.Counter ??
    mongoose.model("Counter", CounterSchema));
