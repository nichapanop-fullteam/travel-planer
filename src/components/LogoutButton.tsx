"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";
import { logout } from "@/lib/auth";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await logout();
    } finally {
      await signOut(auth);
      router.replace("/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-70"
      style={{ borderColor: "var(--color-danger-border)" }}
    >
      <LogOut size={14} />
      {isLoading ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </button>
  );
}
