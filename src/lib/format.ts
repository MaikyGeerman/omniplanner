export const TIMEZONE = process.env.APP_TIMEZONE || "Europe/Amsterdam";

export function formatSlot(start: Date, end: Date, locale: string, shape: string) {
  const day = (d: Date) =>
    d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: TIMEZONE });
  const time = (d: Date) => d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE });
  if (shape === "weekend") return `${day(start)} – ${day(end)}`;
  return `${day(start)}, ${time(start)}–${time(end)}`;
}
