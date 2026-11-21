import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { auth } from "@/auth";
import { getT } from "@/lib/i18n";
import { setLang, signOutAction } from "@/app/actions";

export const metadata: Metadata = {
  title: "Samen",
  description: "Plan activities with friends, based on everyone's calendar.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const { t, lang } = await getT();
  return (
    <html lang={lang}>
      <body className="min-h-screen antialiased">
        <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="text-brand">●</span> Samen
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <form action={setLang} className="flex overflow-hidden rounded-lg border border-stone-300">
              {(["nl", "en"] as const).map((l) => (
                <button
                  key={l}
                  name="lang"
                  value={l}
                  className={`px-2 py-1 uppercase ${lang === l ? "bg-stone-800 text-white" : "bg-white text-stone-600"}`}
                >
                  {l}
                </button>
              ))}
            </form>
            {session?.user && (
              <form action={signOutAction} className="flex items-center gap-2">
                {session.user.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="" className="h-8 w-8 rounded-full" />
                )}
                <button className="text-stone-500 hover:text-stone-800">{t.signOut}</button>
              </form>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-16">{children}</main>
      </body>
    </html>
  );
}
