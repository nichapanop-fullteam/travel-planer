"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, Lock, Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { loginWithEmail } from "@/lib/auth";

// Only same-origin relative paths are honored — "//evil.com" or an absolute
// URL in ?redirect= must never be followed (open-redirect risk).
function safeRedirectTarget(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/main";
}

// Static prerendering of this page requires useSearchParams (used here for
// ?redirect=, and inside GoogleLoginButton for the same reason) to sit
// under a Suspense boundary — otherwise Next bails out the whole page from
// static generation at build time.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await loginWithEmail(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(safeRedirectTarget(searchParams.get("redirect")));
  }

  return (
    <AuthLayout
      eyebrow="PunGuide"
      title="วางแผนเที่ยวไปด้วยกัน"
      subtitle="สร้างแผนทริป แชร์กับเพื่อน และจัดการงบประมาณทั้งหมดได้ในที่เดียว"
    >
      <h1 className="text-2xl font-bold">เข้าสู่ระบบ</h1>
      <p className="mt-1.5 text-sm text-[var(--color-muted)]">ยินดีต้อนรับกลับมา PunGuide คิดถึงคุณนะ</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">อีเมล หรือชื่อผู้ใช้</label>
          <div
            className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 focus-within:border-[var(--color-primary)]"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Mail size={15} className="shrink-0 text-[var(--color-muted)]" />
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">รหัสผ่าน</label>
          <div
            className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 focus-within:border-[var(--color-primary)]"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Lock size={15} className="shrink-0 text-[var(--color-muted)]" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="shrink-0 text-[var(--color-muted)]"
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-xl px-3.5 py-2.5 text-xs font-semibold" style={{ backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}>
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <span
            title="ยังไม่เปิดใช้งานในเดโมนี้"
            className="cursor-default text-xs font-semibold text-[var(--color-muted)] opacity-70"
          >
            ลืมรหัสผ่าน?
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
          style={{ backgroundColor: "var(--color-brand-green)" }}
        >
          {submitting && <LoaderCircle size={15} className="animate-spin" />}
          เข้าสู่ระบบ
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
        <span className="text-xs font-semibold text-[var(--color-muted)]">หรือ</span>
        <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
      </div>

      <GoogleLoginButton />

      <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
        ยังไม่มีบัญชี PunGuide?{" "}
        <Link href="/signup" className="font-semibold" style={{ color: "var(--color-brand-green)" }}>
          สร้างบัญชี
        </Link>
      </p>
    </AuthLayout>
  );
}
