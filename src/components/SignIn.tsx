import { signInAction } from "@/app/actions";
import { getT } from "@/lib/i18n";

export async function SignIn({ next = "/" }: { next?: string }) {
  const { t } = await getT();
  return (
    <div className="card mx-auto mt-10 max-w-md text-center">
      <h1 className="mb-3 text-3xl font-bold">Samen</h1>
      <p className="mb-6 text-stone-600">{t.tagline}</p>
      <form action={signInAction}>
        <input type="hidden" name="next" value={next} />
        <button className="btn w-full">{t.signIn}</button>
      </form>
      <p className="mt-4 text-sm text-stone-500">🔒 {t.privacy}</p>
    </div>
  );
}
