import { db } from "@/lib/db";
import { CALENDAR_SCOPE } from "@/auth";

export type Interval = { start: number; end: number }; // epoch ms

async function getAccessToken(userId: string): Promise<string | null> {
  const account = await db.account.findFirst({ where: { userId, provider: "google" } });
  if (!account) return null;
  if (account.scope && !account.scope.includes(CALENDAR_SCOPE)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (account.access_token && account.expires_at && account.expires_at > now + 60) {
    return account.access_token;
  }
  if (!account.refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  if (!res.ok) return null;
  const tokens = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
  await db.account.update({
    where: { id: account.id },
    data: {
      access_token: tokens.access_token,
      expires_at: now + tokens.expires_in,
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
    },
  });
  return tokens.access_token;
}

/**
 * Busy intervals of the user's primary calendar.
 * Returns null when we can't read the calendar (no consent / expired login).
 */
export async function getBusy(userId: string, from: Date, to: Date): Promise<Interval[] | null> {
  const token = await getAccessToken(userId);
  if (!token) return process.env.SAMEN_DEMO === "1" ? demoBusy(userId, from, to) : null;

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: [{ id: "primary" }],
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    calendars: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }>;
  };
  const cal = data.calendars?.primary;
  if (!cal || cal.errors?.length) return null;
  return (cal.busy ?? []).map((b) => ({
    start: Date.parse(b.start),
    end: Date.parse(b.end),
  }));
}

/** "Add to Google Calendar" link with everyone pre-filled as guests. */
export function calendarLink(opts: {
  title: string;
  start: Date;
  end: Date;
  details?: string | null;
  location?: string | null;
  guests: string[];
}) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(opts.end)}`,
  });
  if (opts.details) p.set("details", opts.details);
  if (opts.location) p.set("location", opts.location);
  if (opts.guests.length) p.set("add", opts.guests.join(","));
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** SAMEN_DEMO=1 only: fake but stable calendars for users without a Google account (seeded demo friends). */
function demoBusy(userId: string, from: Date, to: Date): Interval[] {
  let seed = [...userId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const busy: Interval[] = [];
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  for (; day < to; day.setDate(day.getDate() + 1)) {
    const base = day.getTime();
    const weekday = day.getDay();
    if (weekday >= 1 && weekday <= 5) busy.push({ start: base + 9 * 36e5, end: base + 17 * 36e5 }); // work
    if (rand() < 0.4) {
      const h = 17 + Math.floor(rand() * 5);
      busy.push({ start: base + h * 36e5, end: base + (h + 2 + Math.floor(rand() * 2)) * 36e5 }); // plans
    }
  }
  return busy;
}
