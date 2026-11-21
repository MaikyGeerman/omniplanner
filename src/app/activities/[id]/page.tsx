import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { calendarLink, getBusy } from "@/lib/google";
import { formatSlot, TIMEZONE } from "@/lib/format";
import { byDate, suggestSlots, type Participant, type Shape } from "@/lib/scheduler";
import { deleteActivity, planActivity, unplanActivity, vote } from "@/app/actions";
import { SignIn } from "@/components/SignIn";

const WEIGHT = { in: 3, maybe: 1, none: 1 } as const;

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return <SignIn next={`/activities/${id}`} />;
  const me = session.user.id;
  const { t, locale } = await getT();

  const activity = await db.activity.findFirst({
    where: { id, group: { memberships: { some: { userId: me } } } },
    include: {
      creator: true,
      votes: true,
      group: { include: { memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } } } },
    },
  });
  if (!activity) notFound();

  const members = activity.group.memberships.map((m) => m.user);
  const voteOf = (userId: string) => activity.votes.find((v) => v.userId === userId)?.value ?? "none";
  const myVote = voteOf(me);
  const interested = members.filter((u) => voteOf(u.id) !== "out");
  const nameOf = (userId: string) => members.find((u) => u.id === userId)?.name ?? "?";

  // ---- suggestions (only when not planned yet) ----
  let slots: ReturnType<typeof suggestSlots> = [];
  let unknown: string[] = [];
  if (!activity.plannedStart) {
    const from = new Date();
    const to = new Date(from.getTime() + activity.horizonDays * 86_400_000);
    const participants: Participant[] = await Promise.all(
      interested.map(async (u) => ({
        id: u.id,
        name: u.name ?? u.email,
        weight: WEIGHT[voteOf(u.id) as keyof typeof WEIGHT],
        busy: await getBusy(u.id, from, to),
      })),
    );
    unknown = participants.filter((p) => p.busy === null).map((p) => p.name);
    slots = suggestSlots({
      participants,
      shape: activity.shape as Shape,
      durationMin: activity.durationMin,
      minPeople: activity.minPeople,
      horizonDays: activity.horizonDays,
      timezone: TIMEZONE,
    });
  }

  const voteButtons = [
    { value: "in", label: `✅ ${t.vote_in}` },
    { value: "maybe", label: `🤔 ${t.vote_maybe}` },
    { value: "out", label: `🙅 ${t.vote_out}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/groups/${activity.groupId}`} className="text-sm text-stone-500 hover:text-stone-800">
          ← {activity.group.name}
        </Link>
        <h1 className="text-3xl font-bold">{activity.title}</h1>
        <p className="text-stone-500">
          {t[`shape_${activity.shape}` as keyof typeof t]}
          {activity.shape !== "weekend" && ` · ${activity.durationMin / 60} ${t.hours}`}
          {activity.location && ` · 📍 ${activity.location}`} · {t.by} {activity.creator.name}
        </p>
        {activity.description && <p className="mt-2 text-stone-700">{activity.description}</p>}
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">{t.yourVote}</h2>
        <form action={vote} className="flex flex-wrap gap-2">
          <input type="hidden" name="activityId" value={activity.id} />
          {voteButtons.map((b) => (
            <button key={b.value} name="value" value={b.value} className={myVote === b.value ? "btn" : "btn-ghost"}>
              {b.label}
            </button>
          ))}
        </form>
        <h3 className="mb-2 mt-5 text-sm font-medium text-stone-600">{t.responses}</h3>
        <ul className="space-y-1 text-sm">
          {members.map((u) => {
            const v = voteOf(u.id);
            const icon = { in: "✅", maybe: "🤔", out: "🙅", none: "⏳" }[v];
            return (
              <li key={u.id}>
                {icon} {u.name ?? u.email}
                {v === "none" && <span className="text-stone-400"> — {t.noVote}</span>}
              </li>
            );
          })}
        </ul>
      </section>

      {activity.plannedStart && activity.plannedEnd ? (
        <section className="card border-green-300 bg-green-50">
          <h2 className="mb-1 text-xl font-bold text-green-800">🎉 {t.planned}</h2>
          <p className="mb-4 text-lg">{formatSlot(activity.plannedStart, activity.plannedEnd, locale, activity.shape)}</p>
          <div className="flex flex-wrap gap-2">
            <a
              className="btn"
              target="_blank"
              rel="noreferrer"
              href={calendarLink({
                title: activity.title,
                start: activity.plannedStart,
                end: activity.plannedEnd,
                details: activity.description,
                location: activity.location,
                guests: interested.filter((u) => voteOf(u.id) !== "none").map((u) => u.email),
              })}
            >
              📅 {t.addToCalendar}
            </a>
            <form action={unplanActivity}>
              <input type="hidden" name="activityId" value={activity.id} />
              <button className="btn-ghost">{t.unplan}</button>
            </form>
          </div>
        </section>
      ) : (
        <section>
          <h2 className="mb-3 text-xl font-bold">{t.suggestions}</h2>
          {unknown.length > 0 && (
            <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              ⚠️ {unknown.join(", ")} {t.calendarMissing}
            </p>
          )}
          {slots.length === 0 ? (
            <p className="text-stone-600">{t.noSuggestions}</p>
          ) : (
            <ul className="space-y-3">
              {byDate(slots).map((s) => {
                const top = s === slots[0];
                return (
                <li key={s.start.toISOString()} className={`card ${top ? "border-brand ring-2 ring-brand/20" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {top && "⭐ "}
                        {formatSlot(s.start, s.end, locale, activity.shape)}
                      </div>
                      <div className="text-sm text-stone-600">
                        {s.free.length}/{interested.length} {t.freeOf}: {s.free.map(nameOf).join(", ")}
                      </div>
                      {s.busy.length > 0 && (
                        <div className="text-sm text-stone-400">
                          {t.busyLabel}: {s.busy.map(nameOf).join(", ")}
                        </div>
                      )}
                    </div>
                    <form action={planActivity}>
                      <input type="hidden" name="activityId" value={activity.id} />
                      <input type="hidden" name="start" value={s.start.toISOString()} />
                      <input type="hidden" name="end" value={s.end.toISOString()} />
                      <button className={top ? "btn" : "btn-ghost"}>{t.pick}</button>
                    </form>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {activity.creatorId === me && (
        <form action={deleteActivity}>
          <input type="hidden" name="activityId" value={activity.id} />
          <button className="text-sm text-red-600 hover:underline">{t.deleteActivity}</button>
        </form>
      )}
    </div>
  );
}
