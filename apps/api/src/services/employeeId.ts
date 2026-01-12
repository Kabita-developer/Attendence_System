import { CounterModel } from "../models/Counter.js";

export async function nextEmployeeId() {
  const doc = await CounterModel.findOneAndUpdate(
    { key: "employee" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  ).lean();

  const n = doc?.seq ?? 1;
  return `EMP${String(n).padStart(6, "0")}`;
}


