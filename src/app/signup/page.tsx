"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { createProfile } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await createProfile({ username, password });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/main");
  }

  return (
    <AuthLayout
      eyebrow="PunGuide"
      title="สร้างโปรไฟล์ของคุณ"
      subtitle="บอกให้เรารู้จักคุณสักหน่อย เพื่อให้เพื่อนร่วมทริปจำคุณได้ในแผนที่แชร์กัน"
    >
      <h1 className="text-2xl font-bold">สร้างบัญชี</h1>
      <p className="mt-1.5 text-sm text-[var(--color-muted)]">ใช้เวลาไม่ถึงนาที เริ่มวางแผนทริปแรกกันเลย</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">ชื่อผู้ใช้</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="3–30 ตัว: a-z, 0-9, . หรือ _"
            autoComplete="username"
            className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">รหัสผ่าน</label>
          <div className="flex items-center rounded-xl border px-3.5 py-2.5" style={{ borderColor: "var(--color-border)" }}>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 8 ตัว" autoComplete="new-password" className="w-full bg-transparent text-sm focus:outline-none" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} className="text-[var(--color-muted)]">
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-xl px-3.5 py-2.5 text-xs font-semibold" style={{ backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
          style={{ backgroundColor: "var(--color-brand-green)" }}
        >
          {submitting && <LoaderCircle size={15} className="animate-spin" />}
          สร้างบัญชี
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
        มีบัญชี PunGuide อยู่แล้ว?{" "}
        <Link href="/login" className="font-semibold" style={{ color: "var(--color-brand-green)" }}>
          เข้าสู่ระบบ
        </Link>
      </p>
    </AuthLayout>
  );
}
