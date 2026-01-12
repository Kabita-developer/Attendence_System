import { DateTime } from "luxon";
import { env } from "./env-server";

export const APP_TZ = env.APP_TIMEZONE;

export function nowTz() {
  return DateTime.now().setZone(APP_TZ);
}

export function startOfDayISO(date: DateTime) {
  return date.setZone(APP_TZ).startOf("day").toISO();
}

export function startOfDayDate(date: DateTime) {
  return date.setZone(APP_TZ).startOf("day").toJSDate();
}

