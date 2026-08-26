"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, LoaderCircle, Lock, Save } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import LogoutButton from "@/components/LogoutButton";
import { useToast } from "@/providers/ToastProvider";
import { getBackendAccessToken, setBackendSession } from "@/lib/backend-user";
import { updateProfileName, uploadProfileAvatar } from "@/lib/users-api";

type SaveState = "idle" | "saving" | "saved" | "error";

// Client-side route guard only, same as /my-trips — the backend still owns
// every real permission check.
export default function AccountPage() {
  const router = useRouter();
  const { backendUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !backendUser) router.replace("/login");
  }, [isLoading, backendUser, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle size={20} className="animate-spin text-[var(--color-muted)]" />
      </div>
    );
  }

  if (!backendUser) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-6 py-10 sm:px-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">ตั้งค่าโปรไฟล์</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              จัดการรูปโปรไฟล์และชื่อที่แสดงให้ผู้อื่นเห็น
            </p>
          </div>
          <LogoutButton />
        </div>

        <ProfileForm
          key={backendUser.id}
          id={backendUser.id}
          name={backendUser.name}
          username={backendUser.username}
          email={backendUser.email}
          avatarUrl={backendUser.avatarUrl}
        />
      </div>
    </AppShell>
  );
}

// Keyed by backendUser.id from the parent so a different user signing in
// (rare in this app, but possible in the same tab) remounts with fresh
// initial values instead of keeping a stale edit around.
function ProfileForm({
  id,
  name: initialName,
  username,
  email,
  avatarUrl: initialAvatarUrl,
}: {
  id: string;
  name: string | null;
  username: string;
  email: string | null;
  avatarUrl: string | null;
}) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName ?? "");
  // Local baseline the "dirty"/"ยกเลิก" state compares against — updated
  // after a successful PATCH rather than re-read from the `initialName`
  // prop, since a successful save re-renders this same (non-remounted)
  // component with that prop unchanged from the parent's perspective.
  const [savedName, setSavedName] = useState(initialName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  // Bumped after a successful avatar upload and appended as a cache-busting
  // query param — POST /users/me/avatar always returns the same storage URL
  // (`users/{userId}/avatar.webp` gets overwritten in place), so without
  // this the browser would keep showing the old cached image.
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [nameError, setNameError] = useState("");

  const isDirty = name.trim() !== savedName.trim();
  const displayAvatarUrl = avatarUrl && avatarVersion > 0 ? `${avatarUrl}?v=${avatarVersion}` : avatarUrl;

  function handlePickAvatar() {
    fileInputRef.current?.click();
  }

  function applyProfile(profile: { name: string | null; avatarUrl: string | null }) {
    const token = getBackendAccessToken();
    if (token) setBackendSession(token, { id, username, email, name: profile.name, avatarUrl: profile.avatarUrl });
  }

  async function handleAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
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
      setAvatarVersion((v) => v + 1);
      applyProfile(profile);
      showToast("เปลี่ยนรูปโปรไฟล์แล้ว");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ");
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleReset() {
    setName(savedName);
    setNameError("");
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("กรุณากรอกชื่อที่ต้องการแสดง");
      return;
    }
    if (trimmed.length > 255) {
      setNameError("ชื่อยาวเกินไป (สูงสุด 255 ตัวอักษร)");
      return;
    }
    setNameError("");

    setSaveState("saving");
    try {
      const profile = await updateProfileName(trimmed);
      setName(profile.name ?? trimmed);
      setSavedName(profile.name ?? trimmed);
      applyProfile(profile);
      setSaveState("saved");
      showToast("บันทึกโปรไฟล์แล้ว");
    } catch (err) {
      setSaveState("error");
      showToast(err instanceof Error ? err.message : "บันทึกโปรไฟล์ไม่สำเร็จ");
    }
    window.setTimeout(() => setSaveState("idle"), 2000);
  }

  return (
    <div className="flex flex-col gap-8 rounded-2xl border bg-white p-6 sm:p-8" style={{ borderColor: "var(--color-border)" }}>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayAvatarUrl || "/images/profile-avatar.jpg"}
            alt={name || "รูปโปรไฟล์"}
            className="h-24 w-24 rounded-full object-cover"
            style={{ opacity: avatarUploading ? 0.5 : 1 }}
          />
          {avatarUploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoaderCircle size={22} className="animate-spin" style={{ color: "var(--color-brand-green)" }} />
            </div>
          )}
          <button
            type="button"
            onClick={handlePickAvatar}
            disabled={avatarUploading}
            aria-label="เปลี่ยนรูปโปรไฟล์"
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-white shadow-sm disabled:opacity-70"
            style={{ backgroundColor: "var(--color-brand-green)" }}
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            hidden
            onChange={handleAvatarSelected}
          />
        </div>
        <div className="text-sm text-[var(--color-muted)]">
          <p className="font-semibold text-[var(--foreground)]">รูปโปรไฟล์</p>
          <p className="mt-0.5">JPG หรือ PNG ขนาดไม่เกิน 5MB</p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">ชื่อที่แสดง</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
            }}
            maxLength={255}
            placeholder="ชื่อของคุณ"
            className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
            style={{ borderColor: nameError ? "var(--color-danger)" : "var(--color-border)" }}
          />
          {nameError && <p className="mt-1.5 text-xs font-medium text-[var(--color-danger)]">{nameError}</p>}
        </div>

        <ReadOnlyField label="ชื่อผู้ใช้" value={`@${username}`} hint="ใช้สำหรับเข้าสู่ระบบ เปลี่ยนไม่ได้ในขณะนี้" />
        <ReadOnlyField
          label="อีเมล"
          value={email || "ไม่ได้ระบุ"}
          hint="จัดการผ่านผู้ให้บริการที่ใช้เข้าสู่ระบบ"
        />
      </div>

      <div className="border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === "saving" || !isDirty}
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor:
                  saveState === "saved"
                    ? "var(--color-brand-green)"
                    : saveState === "error"
                      ? "var(--color-danger)"
                      : "var(--color-primary)",
              }}
            >
              {saveState === "saving" ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : saveState === "saved" ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              {saveState === "saving"
                ? "กำลังบันทึก..."
                : saveState === "saved"
                  ? "บันทึกแล้ว"
                  : saveState === "error"
                    ? "บันทึกไม่สำเร็จ"
                    : "บันทึกการเปลี่ยนแปลง"}
            </button>
            {isDirty && saveState === "idle" && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted)]">{label}</label>
      <div
        className="flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm text-[var(--color-muted)]"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <span className="truncate text-[var(--foreground)]">{value}</span>
        <Lock size={13} className="shrink-0" />
      </div>
      <p className="mt-1.5 text-xs text-[var(--color-muted)]">{hint}</p>
    </div>
  );
}
