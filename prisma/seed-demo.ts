// Demo data for trying Samen without Google: npm run demo
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const names = ["Jij (demo)", "Anna", "Bram", "Sanne", "Daan"];
  const users: { id: string }[] = [];
  for (const name of names) {
    const email = `${name.split(" ")[0].toLowerCase()}@demo.samen`;
    users.push(await db.user.upsert({ where: { email }, create: { email, name }, update: {} }));
  }
  const group = await db.group.create({
    data: {
      name: "De Vriendengroep",
      inviteCode: randomBytes(5).toString("hex"),
      memberships: { create: users.map((u) => ({ userId: u.id })) },
    },
  });
  const ideas = [
    { title: "Escape room", shape: "evening", durationMin: 150, votes: ["in", "in", "maybe", "in"] },
    { title: "Kamperen op de Veluwe", shape: "weekend", durationMin: 0, votes: ["in", "maybe", "in", "out"] },
    { title: "Sushi in Utrecht", shape: "anytime", durationMin: 180, votes: ["in", "in", "in"] },
  ];
  for (const idea of ideas) {
    await db.activity.create({
      data: {
        groupId: group.id,
        creatorId: users[1].id,
        title: idea.title,
        shape: idea.shape,
        durationMin: idea.durationMin,
        minPeople: 3,
        horizonDays: 42,
        votes: { create: idea.votes.map((value, i) => ({ userId: users[i + 1].id, value })) },
      },
    });
  }
  // A session for the demo user, so you can browse without Google sign-in.
  const sessionToken = randomBytes(32).toString("hex");
  await db.session.create({
    data: { sessionToken, userId: users[0].id, expires: new Date(Date.now() + 30 * 86_400_000) },
  });
  console.log(`\nDemo data created. Start with: SAMEN_DEMO=1 npm run dev`);
  console.log(`Then open: http://localhost:3000/api/demo-login?token=${sessionToken}\n`);
}

main().finally(() => db.$disconnect());
