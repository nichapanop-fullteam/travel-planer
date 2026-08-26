"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { LoaderCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { setBackendSession } from "@/lib/backend-user";
import { BACKEND_URL } from "@/lib/backend-url";
import { GoogleIcon } from "@/components/auth/AuthLayout";

// POST /auth/firebase's confirmed response shape.
interface AuthFirebaseResponse {
  accessToken: string;
  expiresIn: string;
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    avatarUrl: string;
  };
}

interface GoogleLoginButtonProps {
  redirectTo?: string;
  onSuccess?: () => void;
}

// Can be reused on a full page or inside a dialog. Dialog consumers provide
// onSuccess so the current page stays in place after authentication.
export default function GoogleLoginButton({ redirectTo = "/my-trips", onSuccess }: GoogleLoginButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    try {
      setIsLoading(true);
      setError("");

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const response = await fetch(`${BACKEND_URL}/auth/firebase`, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "ngrok-skip-browser-warning": "1",
        },
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `ไม่สามารถเชื่อมต่อบัญชีกับ PunGuide ได้ (${response.status} ${response.statusText}) ${body.slice(0, 300)}`
        );
      }

      // The backend issues its own session here — accessToken is what every
      // subsequent authenticated call must send as its Bearer token. The
      // Firebase token is used only for this one exchange.
      const account: AuthFirebaseResponse = await response.json();
      setBackendSession(account.accessToken, account.user);

      if (onSuccess) {
        onSuccess();
      } else {
        router.replace(redirectTo);
      }
    } catch (err) {
      // console.warn, not console.error — Next's dev overlay intercepts
      // console.error and shows it as a full-screen error even when it's
      // already handled gracefully here (e.g. backend route not deployed
      // yet). The detailed message is still in devtools for debugging.
      console.warn(err);
      setError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleLogin}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2.5 rounded-full border py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        style={{ borderColor: "var(--color-border)" }}
      >
        {isLoading ? <LoaderCircle size={16} className="animate-spin" /> : <GoogleIcon size={16} />}
        {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Google"}
      </button>

      {error && (
        <p
          className="rounded-xl px-3.5 py-2.5 text-xs font-semibold"
          style={{ backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
