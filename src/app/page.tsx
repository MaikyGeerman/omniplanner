import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { createGroup, joinGroup } from "@/app/actions";
import { SignIn } from "@/components/SignIn";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) return <SignIn />;
  const { t } = await getT();

  const groups = await db.group.findMany({
    where: { memberships: { some: { userId: session.user.id } } },
    include: { _count: { select: { memberships: true, activities: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="mb-3 text-2xl font-bold">{t.yourGroups}</h1>
        {groups.length === 0 ? (
          <p className="text-stone-600">{t.noGroups}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Link href={`/groups/${g.id}`} className="card block hover:border-brand">
                  <div className="text-lg font-semibold">{g.name}</div>
                  <div className="text-sm text-stone-500">
                    👥 {g._count.memberships} · 💡 {g._count.activities}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-4">
        <form action={createGroup}>
          <label className="label" htmlFor="name">{t.newGroup}</label>
          <div className="flex gap-2">
            <input id="name" name="name" required maxLength={60} placeholder={t.groupName} className="input" />
            <button className="btn">{t.create}</button>
          </div>
        </form>
        <form action={joinGroup}>
          <label className="label" htmlFor="code">{t.joinWithCode}</label>
          <div className="flex gap-2">
            <input id="code" name="code" required className="input" />
            <button className="btn-ghost">{t.join}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
