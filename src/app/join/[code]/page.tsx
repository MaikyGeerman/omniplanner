import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SignIn } from "@/components/SignIn";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const group = await db.group.findUnique({ where: { inviteCode: code } });
  if (!group) notFound();

  const session = await auth();
  if (!session?.user?.id) return <SignIn next={`/join/${code}`} />;

  await db.membership.upsert({
    where: { userId_groupId: { userId: session.user.id, groupId: group.id } },
    create: { userId: session.user.id, groupId: group.id },
    update: {},
  });
  redirect(`/groups/${group.id}`);
}
