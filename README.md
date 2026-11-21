# Omniplanner

Plan activities with your friends. Someone suggests an idea, everyone says whether they're in,
and Omniplanner looks at everyone's Google Calendar to suggest the best evening, day or weekend.

🔒 Omniplanner only asks for **free/busy** access (`calendar.freebusy`): it sees *when* you're busy, never *what* you're doing.

## How it works

1. Sign in with Google and create a group, then share the invite link with your friends.
2. Suggest an activity and choose what kind of time it needs: *an evening*, *during the day*, *any time* or *a whole weekend*. Also set how long it takes and the minimum number of people.
3. Friends vote ✅ in / 🤔 maybe / 🙅 pass.
4. Omniplanner checks the free/busy calendars of everyone who didn't pass and ranks the options. People who are "in" count most. Sooner dates and Friday/Saturday get a small bonus.
5. Pick a time, then open a pre-filled Google Calendar event with everyone as guests.

## Try it without Google (demo mode)

```bash
npm install
cp .env.example .env        # then fill AUTH_SECRET: npx auth secret
npx prisma db push
npm run demo                # creates fake friends with fake calendars and prints a login link
SAMEN_DEMO=1 npm run dev
```

## Set up Google sign-in

1. Go to <https://console.cloud.google.com> and create a project (e.g. "Omniplanner").
2. **APIs & Services → Library**: enable **Google Calendar API**.
3. **Google Auth Platform → Branding / Audience**: choose *External* and fill in the app name and your email.
   - Under **Data access**, add the scope `https://www.googleapis.com/auth/calendar.freebusy`.
   - Under **Audience**, add your friends' Gmail addresses as **test users**.
4. **Clients → Create client → Web application**:
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
     (later also `https://<your-domain>/api/auth/callback/google`)
5. Put the client ID and secret in `.env` as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

> ⚠️ While the app is in **Testing** mode, Google expires logins after 7 days, so friends
> would have to sign in again every week. To avoid that, click **Publish app** under
> *Audience*. You don't need Google's verification for a small group of friends. Everyone
> will see a "Google hasn't verified this app" screen once and can click *Advanced → Continue*.

## Tech

Next.js 15 (App Router, server actions) · Auth.js v5 · Prisma + SQLite · Tailwind CSS v4 · Luxon

- `src/lib/scheduler.ts`: the slot-finding algorithm (`npm test` runs its tests)
- `src/lib/google.ts`: token refresh, the FreeBusy API and the "add to calendar" link
- `src/lib/i18n.ts`: Dutch/English texts

## Ideas for later

- Hosting (Vercel + a hosted database such as Turso or Neon instead of local SQLite)
- Include all of a user's calendars, not only the primary one
- Notifications when a new activity is suggested or a date is picked
- Recurring hangouts ("monthly board game night")
- "Who's free tonight?" spontaneous mode
