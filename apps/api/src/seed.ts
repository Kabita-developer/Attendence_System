import { env } from "./config/env.js";
import { connectDb } from "./db.js";
import { UserModel } from "./models/User.js";
import { hashPassword } from "./auth/password.js";
import { SlotModel } from "./models/Slot.js";
import { nextEmployeeId } from "./services/employeeId.js";
import { generateOneTimePassword } from "./services/otp.js";

async function seed() {
  await connectDb();

  const adminEmail = env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = env.ADMIN_PASSWORD ?? "Admin@12345";

  const existing = await UserModel.findOne({ role: "ADMIN" });
  if (!existing) {
    await UserModel.create({
      role: "ADMIN",
      employeeId: "ADMIN",
      name: "Admin",
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      mustChangePassword: false,
      isActive: true
    });
    // eslint-disable-next-line no-console
    console.log(`[seed] created admin: employeeId=ADMIN email=${adminEmail} password=${adminPassword}`);
  } else {
    // eslint-disable-next-line no-console
    console.log("[seed] admin exists, skipping");
  }

  const slotsCount = await SlotModel.countDocuments();
  if (slotsCount === 0) {
    await SlotModel.insertMany([
      { name: "Morning", startMinutes: 600, endMinutes: 720, salary: 200, sortOrder: 1, isActive: true },
      { name: "Afternoon", startMinutes: 900, endMinutes: 1020, salary: 200, sortOrder: 2, isActive: true },
      { name: "Evening", startMinutes: 1140, endMinutes: 1260, salary: 200, sortOrder: 3, isActive: true }
    ]);
    // eslint-disable-next-line no-console
    console.log("[seed] created default slots");
  }

  const employeesCount = await UserModel.countDocuments({ role: "EMPLOYEE" });
  if (employeesCount === 0) {
    const otp1 = generateOneTimePassword();
    const otp2 = generateOneTimePassword();
    const emp1 = await nextEmployeeId();
    const emp2 = await nextEmployeeId();

    await UserModel.insertMany([
      {
        role: "EMPLOYEE",
        employeeId: emp1,
        name: "Aarav Sharma",
        email: "aarav@example.com",
        passwordHash: await hashPassword(otp1),
        mustChangePassword: true,
        isActive: true
      },
      {
        role: "EMPLOYEE",
        employeeId: emp2,
        name: "Diya Patel",
        email: "diya@example.com",
        passwordHash: await hashPassword(otp2),
        mustChangePassword: true,
        isActive: true
      }
    ]);

    // eslint-disable-next-line no-console
    console.log(`[seed] created employees:\n- ${emp1} / ${otp1}\n- ${emp2} / ${otp2}`);
  }

  // eslint-disable-next-line no-console
  console.log("[seed] done");
  process.exit(0);
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


