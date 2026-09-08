import { loginAction } from "@/app/admin/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">ALNAJAH ALDAEM</p>
      <h1 className="mt-2 text-2xl font-semibold">Staff login</h1>
      <p className="mt-2 text-sm text-muted">Authorized staff only. This page is not a customer portal.</p>
      {ok === "password" ? (
        <p className="mt-4 text-sm text-accent">Password updated. Sign in again with your new password.</p>
      ) : null}
      {error === "invalid" ? <p className="mt-4 text-sm text-danger">Email or password is incorrect.</p> : null}
      {error === "rateLimit" ? <p className="mt-4 text-sm text-danger">Too many attempts. Try again later.</p> : null}
      <form action={loginAction} className="mt-6 space-y-4 rounded-md border border-line bg-white p-6">
        <label className="block text-sm">
          Email
          <input name="email" type="email" required className="mt-1 w-full rounded-md border border-line px-3 py-2" autoComplete="username" />
        </label>
        <label className="block text-sm">
          Password
          <input name="password" type="password" required className="mt-1 w-full rounded-md border border-line px-3 py-2" autoComplete="current-password" />
        </label>
        <button type="submit" className="w-full rounded-md bg-navy py-2.5 text-sm font-medium text-white">
          Sign in
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Forgot password? Password reset email is not configured. Ask a super admin to reset it from Staff, or sign in and change it under Account.
      </p>
    </main>
  );
}
