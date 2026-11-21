import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// SAMEN_DEMO=1 only: log in as the seeded demo user (see prisma/seed-demo.ts).
export async function GET(req: Request) {
  if (process.env.SAMEN_DEMO !== "1") return new NextResponse("Not found", { status: 404 });
  const token = new URL(req.url).searchParams.get("token") ?? "";
  (await cookies()).set("authjs.session-token", token, { httpOnly: true, sameSite: "lax", path: "/" });
  return NextResponse.redirect(new URL("/", req.url));
}
