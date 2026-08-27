import Link from "next/link";
import { Link2Off } from "lucide-react";

// Rendered when the page calls notFound(), which is how a dead share link is
// handled. It lives in this route segment (rather than the page returning the
// markup itself) so the response carries a real HTTP 404: returning this UI
// straight from the page answered 200 OK, which told crawlers and link
// unfurlers that a revoked link was a perfectly good page.
//
// Deliberately says nothing about *why*. The API folds four cases into one
// 404 — unknown token, revoked link, expired link, deleted trip — precisely so
// someone holding an old link can't tell whether the trip still exists or
// whether they were singled out. Guessing a reason here would leak exactly
// what the API is hiding.
export default function SharedTripNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-muted)]">
        <Link2Off size={28} />
      </div>
      <h1 className="text-2xl font-extrabold">ลิงก์นี้ใช้ไม่ได้แล้ว</h1>
      <p className="max-w-sm text-sm leading-relaxed text-[var(--color-muted)]">
        ลิงก์อาจถูกยกเลิก หมดอายุ หรือไม่ถูกต้อง ลองขอลิงก์ใหม่จากผู้ที่แชร์ให้คุณ
      </p>
      <Link
        href="/main"
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-deep-green)]"
      >
        ไปหน้าสำรวจทริป
      </Link>
    </div>
  );
}
