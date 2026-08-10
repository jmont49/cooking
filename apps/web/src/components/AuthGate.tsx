import { ChefHat, Loader2, LockKeyhole } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { demoMode, supabase } from "../lib/supabase";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!demoMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (demoMode) return;
    void supabase?.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const sub = supabase?.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => sub?.data.subscription.unsubscribe();
  }, []);
  if (demoMode) return children;
  if (!supabase)
    return (
      <AuthCard>
        <p className="text-red-700">
          Supabase configuration is missing. Set VITE_SUPABASE_URL and
          VITE_SUPABASE_ANON_KEY.
        </p>
      </AuthCard>
    );
  const client = supabase;
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-cream">
        <Loader2 className="animate-spin text-herb-600" />
      </div>
    );
  if (session) return children;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: authError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) setError("That email and password did not match.");
    setSubmitting(false);
  };
  return (
    <AuthCard>
      <form onSubmit={submit}>
        <p className="eyebrow">Your personal kitchen</p>
        <h1 className="mt-3 text-4xl">Welcome to Shua.</h1>
        <p className="mt-3 text-sm leading-6 text-ink/55">
          Sign in with your private account. No email is sent.
        </p>
        <label className="mt-7 block text-sm font-semibold">
          Email address
          <input
            required
            type="email"
            className="field mt-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Password
          <input
            required
            minLength={8}
            type="password"
            className="field mt-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <button className="btn-primary mt-5 w-full" disabled={submitting}>
          {submitting ? (
            <Loader2 className="animate-spin" size={17} />
          ) : (
            <LockKeyhole size={17} />
          )}
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}
function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-cream p-5">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-soft">
        <div className="mb-8 flex items-center gap-2">
          <span className="grid size-11 place-items-center rounded-2xl bg-herb-600 text-white">
            <ChefHat />
          </span>
          <span className="font-display text-3xl">Shua</span>
        </div>
        {children}
      </section>
    </main>
  );
}
