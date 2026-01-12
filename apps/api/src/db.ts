import mongoose from "mongoose";
import { env } from "./config/env.js";

export async function connectDb() {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(env.MONGODB_URI);
    console.log("[db] ✓ Connected to MongoDB");
  } catch (error) {
    console.error("[db] ✗ MongoDB connection failed:");
    if (error instanceof Error) {
      console.error("[db] Error:", error.message);
    }
    console.error("[db] Please check:");
    console.error("[db]   1. MongoDB is running");
    console.error("[db]   2. MONGODB_URI in .env is correct");
    throw error;
  }
}


