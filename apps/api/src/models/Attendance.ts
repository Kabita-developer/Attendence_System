import mongoose, { Schema } from "mongoose";

export type AttendanceStatus = "APPROVED" | "PENDING" | "REJECTED" | "ABSENT";

export type SlotSnapshot = {
  slotId: string;
  name: string;
  startMinutes: number;
  endMinutes: number;
  salary: number;
};

const SlotSnapshotSchema = new Schema(
  {
    slotId: { type: String, required: true },
    name: { type: String, required: true },
    startMinutes: { type: Number, required: true },
    endMinutes: { type: Number, required: true },
    salary: { type: Number, required: true }
  },
  { _id: false }
);

const AttendanceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    attendanceDate: { type: Date, required: true, index: true }, // start-of-day (APP_TZ)
    slotId: { type: Schema.Types.ObjectId, ref: "Slot", required: true, index: true }, // Which slot this attendance is for
    attendanceTime: { type: Date, required: true }, // exact timestamp when attendance was marked

    status: { type: String, enum: ["APPROVED", "PENDING", "REJECTED", "ABSENT"], required: true, index: true },

    slotSalary: { type: Number, required: true, min: 0, default: 0 }, // Salary for this specific slot (0 if not APPROVED)

    lateByMinutes: { type: Number, default: 0 },
    warningMessage: { type: String, default: "" }, // "Late by X minutes. Admin approval required."

    slotSnapshot: { type: SlotSnapshotSchema, required: true }, // Snapshot of slot at time of marking

    adminNote: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date }
  },
  { timestamps: true }
);

// Unique constraint: one attendance record per user per date per slot
AttendanceSchema.index({ userId: 1, attendanceDate: 1, slotId: 1 }, { unique: true });
AttendanceSchema.index({ attendanceDate: 1, status: 1 });
AttendanceSchema.index({ userId: 1, attendanceDate: 1 });
// Compound index for admin queries filtering by date and status
AttendanceSchema.index({ attendanceDate: 1, userId: 1, status: 1 });

export type Attendance = mongoose.InferSchemaType<typeof AttendanceSchema> & { _id: mongoose.Types.ObjectId };
export const AttendanceModel =
  ((mongoose.models.Attendance as mongoose.Model<Attendance> | undefined) ??
    mongoose.model<Attendance>("Attendance", AttendanceSchema));


