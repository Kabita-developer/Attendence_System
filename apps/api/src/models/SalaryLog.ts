import mongoose, { Schema } from "mongoose";

const SalaryLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", required: true, index: true },
    attendanceDate: { type: Date, required: true, index: true },

    slots: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },

    action: { type: String, enum: ["AUTO_APPROVED", "ADMIN_APPROVED", "ADMIN_MODIFIED"], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: () => new Date(), index: true }
  },
  { timestamps: false }
);

SalaryLogSchema.index({ userId: 1, attendanceDate: 1 });

export type SalaryLog = mongoose.InferSchemaType<typeof SalaryLogSchema> & { _id: mongoose.Types.ObjectId };
export const SalaryLogModel =
  ((mongoose.models.SalaryLog as mongoose.Model<SalaryLog> | undefined) ??
    mongoose.model<SalaryLog>("SalaryLog", SalaryLogSchema));


