"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setErrorMessage(null);

      const supabase = createClient();
      const origin = window.location.origin;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/api/auth/callback`,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error("無法啟動 Google 登入流程，系統沒有取得跳轉網址。");
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error("Google sign-in failed", error);
      setErrorMessage(error instanceof Error ? error.message : "無法啟動 Google 登入流程。");
      setLoading(false);
    }
  }

  async function handlePasswordLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoading(true);
      setErrorMessage(null);

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage("登入失敗：帳號或密碼錯誤。");
        setLoading(false);
        return;
      }

      // Hard reload to /, so server components refetch with the new session cookie.
      window.location.assign("/");
    } catch (error) {
      console.error("Email sign-in failed", error);
      setErrorMessage(error instanceof Error ? error.message : "無法登入。");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="nb-btn-primary w-full justify-center border-[2.5px] border-nb-ink px-6 py-3 text-base disabled:cursor-not-allowed disabled:opacity-80"
        type="button"
      >
        {loading ? "處理中..." : "使用 Google 帳號登入 →"}
      </button>

      <div
        className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-nb-ink/55"
        aria-hidden
      >
        <span className="h-[2px] flex-1 bg-nb-ink/25" />
        <span>或</span>
        <span className="h-[2px] flex-1 bg-nb-ink/25" />
      </div>

      <form onSubmit={handlePasswordLogin} className="space-y-3" noValidate>
        <label className="block">
          <span className="nb-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            disabled={loading}
            placeholder="staff@hoochuu.com.tw"
            className="nb-input disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <label className="block">
          <span className="nb-label">密碼</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
            disabled={loading}
            className="nb-input disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="nb-btn-primary w-full justify-center border-[2.5px] border-nb-ink px-6 py-3 text-base disabled:cursor-not-allowed disabled:opacity-80"
        >
          {loading ? "登入中..." : "Email 登入"}
        </button>
      </form>

      {errorMessage ? (
        <p
          role="alert"
          className="border-2 border-nb-ink bg-nb-red px-3 py-2 text-sm font-bold text-white"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
