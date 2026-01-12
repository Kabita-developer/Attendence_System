import mongoose, { Schema } from "mongoose";
const LoginTokenSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true, index: true },
    lastUsedAt: { type: Date },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    revokedAt: { type: Date }
}, { timestamps: false });
// TTL cleanup
LoginTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
LoginTokenSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
export const LoginTokenModel = (mongoose.models.LoginToken ??
    mongoose.model("LoginToken", LoginTokenSchema));
