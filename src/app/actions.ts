"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { SHAPES, type Shape } from "@/lib/scheduler";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  return session.user.id;
}

async function requireMember(userId: string, groupId: string) {
  const m = await db.membership.findUnique({ where: { userId_groupId: { userId, groupId } } });
  if (!m) redirect("/");
}

async function activityForMember(userId: string, activityId: string) {
  const activity = await db.activity.findUnique({ where: { id: activityId } });
  if (!activity) redirect("/");
  await requireMember(userId, activity.groupId);
  return activity;
}

export async function signInAction(formData: FormData) {
  const next = String(formData.get("next") || "/");
  await signIn("google", { redirectTo: next.startsWith("/") ? next : "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function setLang(formData: FormData) {
  const lang = formData.get("lang") === "en" ? "en" : "nl";
  (await cookies()).set("lang", lang, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  revalidatePath("/", "layout");
}

export async function createGroup(formData: FormData) {
  const userId = await requireUser();
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  if (!name) return;
  const group = await db.group.create({
    data: {
      name,
      inviteCode: randomBytes(5).toString("hex"),
      memberships: { create: { userId } },
    },
  });
  redirect(`/groups/${group.id}`);
}

export async function joinGroup(formData: FormData) {
  const code = String(formData.get("code") || "").trim().split("/").pop() || "";
  redirect(`/join/${encodeURIComponent(code)}`);
}

export async function createActivity(formData: FormData) {
  const userId = await requireUser();
  const groupId = String(formData.get("groupId"));
  await requireMember(userId, groupId);

  const title = String(formData.get("title") || "").trim().slice(0, 100);
  if (!title) return;
  const shapeRaw = String(formData.get("shape"));
  const shape: Shape = (SHAPES as string[]).includes(shapeRaw) ? (shapeRaw as Shape) : "evening";
  const hours = Math.min(Math.max(Number(formData.get("hours")) || 3, 0.5), 14);
  const minPeople = Math.min(Math.max(Math.round(Number(formData.get("minPeople")) || 2), 1), 50);
  const weeks = Math.min(Math.max(Math.round(Number(formData.get("weeks")) || 6), 1), 12);

  const activity = await db.activity.create({
    data: {
      groupId,
      creatorId: userId,
      title,
      description: String(formData.get("description") || "").trim().slice(0, 1000) || null,
      location: String(formData.get("location") || "").trim().slice(0, 200) || null,
      shape,
      durationMin: Math.round(hours * 60),
      minPeople,
      horizonDays: weeks * 7,
      votes: { create: { userId, value: "in" } }, // suggesting = you're in
    },
  });
  redirect(`/activities/${activity.id}`);
}

export async function vote(formData: FormData) {
  const userId = await requireUser();
  const activityId = String(formData.get("activityId"));
  const value = String(formData.get("value"));
  if (!["in", "maybe", "out"].includes(value)) return;
  await activityForMember(userId, activityId);
  await db.vote.upsert({
    where: { activityId_userId: { activityId, userId } },
    create: { activityId, userId, value },
    update: { value },
  });
  revalidatePath(`/activities/${activityId}`);
}

export async function planActivity(formData: FormData) {
  const userId = await requireUser();
  const activityId = String(formData.get("activityId"));
  await activityForMember(userId, activityId);
  const start = new Date(String(formData.get("start")));
  const end = new Date(String(formData.get("end")));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
  await db.activity.update({ where: { id: activityId }, data: { plannedStart: start, plannedEnd: end } });
  revalidatePath(`/activities/${activityId}`);
}

export async function unplanActivity(formData: FormData) {
  const userId = await requireUser();
  const activityId = String(formData.get("activityId"));
  await activityForMember(userId, activityId);
  await db.activity.update({ where: { id: activityId }, data: { plannedStart: null, plannedEnd: null } });
  revalidatePath(`/activities/${activityId}`);
}

export async function deleteActivity(formData: FormData) {
  const userId = await requireUser();
  const activityId = String(formData.get("activityId"));
  const activity = await activityForMember(userId, activityId);
  if (activity.creatorId !== userId) return;
  await db.activity.delete({ where: { id: activityId } });
  redirect(`/groups/${activity.groupId}`);
}
