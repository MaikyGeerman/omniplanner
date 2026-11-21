import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { formatSlot } from "@/lib/format";
import { createActivity } from "@/app/actions";
import { SignIn } from "@/components/SignIn";
import { SHAPES } from "@/lib/scheduler";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return <SignIn next={`/groups/${id}`} />;
  const { t, locale } = await getT();

  const group = await db.group.findFirst({
    where: { id, memberships: { some: { userId: session.user.id } } },
    include: {
      memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } },
      activities: {
        include: { creator: true, votes: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!group) notFound();

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const inviteUrl = `${proto}://${h.get("host")}/join/${group.inviteCode}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">← {t.back}</Link>
        <h1 className="text-3xl font-bold">{group.name}</h1>
      </div>

      <section className="card">
        <h2 className="mb-2 font-semibold">{t.members}</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {group.memberships.map(({ user }) => (
            <span key={user.id} className="flex items-center gap-2 rounded-full bg-stone-100 py-1 pl-1 pr-3 text-sm">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-6 w-6 rounded-full" />
              ) : (
                <span className="h-6 w-6 rounded-full bg-stone-300" />
              )}
              {user.name ?? user.email}
            </span>
          ))}
        </div>
        <label className="label">{t.invite}</label>
        <input readOnly value={inviteUrl} className="input font-mono text-sm" />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">{t.activities}</h2>
        {group.activities.length === 0 ? (
          <p className="text-stone-600">{t.noActivities}</p>
        ) : (
          <ul className="space-y-3">
            {group.activities.map((a) => {
              const count = (v: string) => a.votes.filter((x) => x.value === v).length;
              return (
                <li key={a.id}>
                  <Link href={`/activities/${a.id}`} className="card block hover:border-brand">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">{a.title}</div>
                        <div className="text-sm text-stone-500">
                          {t[`shape_${a.shape}` as keyof typeof t]} · {t.by} {a.creator.name}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm text-stone-600">
                        ✅ {count("in")} 🤔 {count("maybe")}
                      </div>
                    </div>
                    {a.plannedStart && a.plannedEnd && (
                      <div className="mt-2 inline-block rounded-lg bg-green-100 px-2 py-1 text-sm text-green-800">
                        📅 {formatSlot(a.plannedStart, a.plannedEnd, locale, a.shape)}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-4 text-xl font-bold">{t.suggest}</h2>
        <form action={createActivity} className="space-y-4">
          <input type="hidden" name="groupId" value={group.id} />
          <div>
            <label className="label" htmlFor="title">{t.title}</label>
            <input id="title" name="title" required maxLength={100} placeholder={t.titlePh} className="input" />
          </div>
          <div>
            <span className="label">{t.when}</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SHAPES.map((s, i) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-orange-50">
                  <input type="radio" name="shape" value={s} defaultChecked={i === 0} className="accent-brand" />
                  {t[`shape_${s}` as keyof typeof t]}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="hours">{t.duration}</label>
              <input id="hours" name="hours" type="number" min={0.5} max={14} step={0.5} defaultValue={3} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="minPeople">{t.minPeople}</label>
              <input id="minPeople" name="minPeople" type="number" min={1} max={50} defaultValue={Math.min(group.memberships.length, 3)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="weeks">{t.horizon}</label>
              <input id="weeks" name="weeks" type="number" min={1} max={12} defaultValue={6} className="input" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="location">{t.location}</label>
              <input id="location" name="location" maxLength={200} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="description">{t.description}</label>
              <input id="description" name="description" maxLength={1000} className="input" />
            </div>
          </div>
          <button className="btn">{t.add}</button>
        </form>
      </section>
    </div>
  );
}
