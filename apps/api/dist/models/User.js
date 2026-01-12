import mongoose, { Schema } from "mongoose";
const UserSchema = new Schema({
    role: { type: String, enum: ["ADMIN", "EMPLOYEE"], required: true, index: true },
    employeeId: { type: String, index: true, unique: true, sparse: true },
    name: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, index: true, sparse: true },
    phone: { type: String, trim: true, index: true, sparse: true },
    passwordHash: { type: String, required: true },
    passwordUpdatedAt: { type: Date, default: () => new Date() },
    mustChangePassword: { type: Boolean, default: false },
    // Admin OTP-based password reset (OTP is stored hashed; never store raw OTP)
    passwordResetOtpHash: { type: String },
    passwordResetOtpExpiresAt: { type: Date },
    passwordResetRequestedAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });
// Compound index for common queries: role + isActive
UserSchema.index({ role: 1, isActive: 1 });
export const UserModel = (mongoose.models.User ??
    mongoose.model("User", UserSchema));
