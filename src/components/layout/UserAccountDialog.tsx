"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Bookmark, Briefcase, Camera, Check, Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, LogOut, Mail, Save, TriangleAlert, UserPlus, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { auth } from "@/lib/firebase";
import { loginWithEmail, logout } from "@/lib/auth";
import { getBackendAccessToken, setBackendSession } from "@/lib/backend-user";
import { updateProfileName, uploadProfileAvatar } from "@/lib/users-api";

export function UserAccountDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { backendUser, isLoading } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(backendUser?.name ?? "");
  const [savedName, setSavedName] = useState(backendUser?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(backendUser?.avatarUrl ?? null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [nameError, setNameError] = useState("");
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (logoutConfirmOpen) {
        setLogoutConfirmOpen(false);
        return;
      }
      onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [logoutConfirmOpen, onClose]);

  const displayAvatarUrl = avatarUrl && avatarVersion > 0 ? `${avatarUrl}?v=${avatarVersion}` : avatarUrl;
  const isDirty = name.trim() !== savedName.trim();

  function applyProfile(profile: { name: string | null; avatarUrl: string | null }) {
    if (!backendUser) return;
    const token = getBackendAccessToken();
    if (!token) return;
    setBackendSession(token, { ...backendUser, name: profile.name, avatarUrl: profile.avatarUrl });
  }

  async function handleAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      showToast("รองรับเฉพาะไฟล์ JPG หรือ PNG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("ไฟล์รูปใหญ่เกินไป (สูงสุด 5MB)");
      return;
    }

    setAvatarUploading(true);
    try {
      const profile = await uploadProfileAvatar(file);
      setAvatarUrl(profile.avatarUrl);
      setAvatarVersion((value) => value + 1);
      applyProfile(profile);
      showToast("เปลี่ยนรูปโปรไฟล์แล้ว");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("กรุณากรอกชื่อที่ต้องการแสดง");
      return;
    }
    setSaving(true);
    setNameError("");
    try {
      const profile = await updateProfileName(trimmed);
      const nextName = profile.name ?? trimmed;
      setName(nextName);
      setSavedName(nextName);
      applyProfile(profile);
      setSaved(true);
      showToast("บันทึกโปรไฟล์แล้ว");
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "บันทึกโปรไฟล์ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      await signOut(auth).catch(() => {});
      setLogoutConfirmOpen(false);
      onClose();
      router.refresh();
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loginName.trim() || !password) {
      setLoginError("กรุณากรอกอีเมลหรือชื่อผู้ใช้และรหัสผ่าน");
      return;
    }

    setLoggingIn(true);
    setLoginError("");
    try {
      const result = await loginWithEmail(loginName.trim(), password);
      if (!result.ok) {
        setLoginError(result.error);
        return;
      }
      showToast("เข้าสู่ระบบแล้ว");
      onClose();
      router.refresh();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setLoggingIn(false);
    }
  }

  const dialog = (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-account-dialog-title"
        className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-3xl border bg-white shadow-2xl"
        style={{ borderColor: "#e1e9e5" }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b px-6 py-5" style={{ borderColor: "#e1e9e5" }}>
          <div>
            <h2 id="user-account-dialog-title" className="text-xl font-bold">บัญชีผู้ใช้</h2>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">โปรไฟล์ การตั้งค่า และการเข้าสู่ระบบ</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f7f5] text-[var(--color-muted)] hover:bg-[#eaf2ee]">
            <X size={19} />
          </button>
        </header>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center"><LoaderCircle size={24} className="animate-spin text-[#17895f]" /></div>
        ) : backendUser ? (
          <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-4 rounded-2xl bg-[#f5faf8] p-4">
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayAvatarUrl || "/images/profile-avatar.jpg"} alt="" className="h-20 w-20 rounded-full object-cover" style={{ opacity: avatarUploading ? 0.45 : 1 }} />
                {avatarUploading && <LoaderCircle size={20} className="absolute inset-0 m-auto animate-spin text-[#17895f]" />}
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading} aria-label="เปลี่ยนรูปโปรไฟล์" className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#17895f] text-white shadow-sm">
                  <Camera size={14} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={handleAvatarSelected} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{savedName || backendUser.username}</p>
                <p className="truncate text-sm text-[var(--color-muted)]">@{backendUser.username}</p>
                {backendUser.email && <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{backendUser.email}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="dialog-display-name" className="mb-2 block text-sm font-semibold">ชื่อที่แสดง</label>
              <input
                id="dialog-display-name"
                value={name}
                maxLength={255}
                onChange={(event) => { setName(event.target.value); setNameError(""); setSaved(false); }}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-[#17895f]"
                style={{ borderColor: nameError ? "var(--color-danger)" : "#dbe5e0" }}
                placeholder="ชื่อของคุณ"
              />
              {nameError && <p className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">{nameError}</p>}
              <div className="mt-3 flex justify-end gap-2">
                {isDirty && <button type="button" onClick={() => { setName(savedName); setNameError(""); }} className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] hover:bg-[#f4f7f5]">ยกเลิก</button>}
                <button type="button" onClick={handleSave} disabled={!isDirty || saving} className="inline-flex items-center gap-2 rounded-full bg-[#17895f] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
                  {saving ? <LoaderCircle size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
                  {saving ? "กำลังบันทึก" : saved ? "บันทึกแล้ว" : "บันทึก"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href="/my-trips" onClick={onClose} className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold hover:bg-[#f5faf8]" style={{ borderColor: "#dbe5e0" }}><Briefcase size={18} className="text-[#17895f]" />ทริปของฉัน</Link>
              <Link href="/saved" onClick={onClose} className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold hover:bg-[#f5faf8]" style={{ borderColor: "#dbe5e0" }}><Bookmark size={18} className="text-[#17895f]" />ทริปที่บันทึก</Link>
            </div>

            <button type="button" onClick={() => setLogoutConfirmOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold text-[var(--color-danger)]" style={{ borderColor: "var(--color-danger-border)", backgroundColor: "var(--color-danger-bg)" }}>
              <LogOut size={16} />
              ออกจากระบบ
            </button>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e4f3ec] text-[#17895f]"><LogIn size={26} /></div>
              <h3 className="mt-4 text-xl font-bold">เข้าสู่ระบบ</h3>
              <p className="mt-1.5 text-sm leading-6 text-[var(--color-muted)]">เข้าสู่ระบบเพื่อบันทึกทริป สร้างแผน และจัดการโปรไฟล์</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="dialog-login-name" className="mb-2 block text-sm font-semibold">อีเมลหรือชื่อผู้ใช้</label>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                  <input
                    id="dialog-login-name"
                    value={loginName}
                    onChange={(event) => { setLoginName(event.target.value); setLoginError(""); }}
                    autoComplete="username"
                    autoFocus
                    className="w-full rounded-2xl border border-[#dbe5e0] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#17895f] focus:ring-2 focus:ring-[#17895f]/10"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="dialog-login-password" className="mb-2 block text-sm font-semibold">รหัสผ่าน</label>
                <div className="relative">
                  <LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                  <input
                    id="dialog-login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); setLoginError(""); }}
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-[#dbe5e0] py-3 pl-11 pr-12 text-sm outline-none transition focus:border-[#17895f] focus:ring-2 focus:ring-[#17895f]/10"
                    placeholder="กรอกรหัสผ่าน"
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[#f4f7f5]">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div role="alert" className="flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm text-[var(--color-danger)]" style={{ borderColor: "var(--color-danger-border)", backgroundColor: "var(--color-danger-bg)" }}>
                  <TriangleAlert size={17} className="mt-0.5 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button type="submit" disabled={loggingIn} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#17895f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#137650] disabled:cursor-not-allowed disabled:opacity-60">
                {loggingIn ? <LoaderCircle size={17} className="animate-spin" /> : <LogIn size={17} />}
                {loggingIn ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e1e9e5]" />
              <span className="text-xs font-semibold text-[var(--color-muted)]">หรือ</span>
              <div className="h-px flex-1 bg-[#e1e9e5]" />
            </div>

            <GoogleLoginButton
              onSuccess={() => {
                showToast("เข้าสู่ระบบด้วย Google แล้ว");
                onClose();
                router.refresh();
              }}
            />

            <div className="mt-5 flex items-center justify-center gap-2 border-t pt-5 text-sm" style={{ borderColor: "#e1e9e5" }}>
              <span className="text-[var(--color-muted)]">ยังไม่มีบัญชี?</span>
              <Link href="/signup" onClick={onClose} className="inline-flex items-center gap-1.5 font-semibold text-[#17895f] hover:underline"><UserPlus size={15} />สร้างบัญชี</Link>
            </div>
          </div>
        )}
      </section>

      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 p-4" onClick={() => !loggingOut && setLogoutConfirmOpen(false)}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="logout-confirm-title" aria-describedby="logout-confirm-description" className="w-full max-w-[420px] rounded-3xl border border-[#f1d7d2] bg-white p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger)]"><LogOut size={24} /></div>
            <h3 id="logout-confirm-title" className="mt-4 text-xl font-bold">ออกจากระบบ?</h3>
            <p id="logout-confirm-description" className="mt-2 text-sm leading-6 text-[var(--color-muted)]">คุณจะต้องเข้าสู่ระบบอีกครั้งเพื่อจัดการทริปและโปรไฟล์ของคุณ</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setLogoutConfirmOpen(false)} disabled={loggingOut} className="rounded-full border border-[#dbe5e0] px-4 py-3 text-sm font-semibold hover:bg-[#f4f7f5] disabled:opacity-50">ยกเลิก</button>
              <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-danger)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {loggingOut ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />}
                {loggingOut ? "กำลังออก..." : "ออกจากระบบ"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );

  // Render outside transformed navigation drawers so fixed positioning uses
  // the full viewport rather than the drawer's narrow containing block.
  return typeof document === "undefined" ? null : createPortal(dialog, document.body);
}
