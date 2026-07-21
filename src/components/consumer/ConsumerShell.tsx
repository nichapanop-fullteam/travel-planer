import type { ReactNode } from "react";
import { Sidebar } from "@/components/consumer/Sidebar";
import { Topbar } from "@/components/consumer/Topbar";

type NavKey = "home" | "search" | "trips" | "saved" | "community" | "messages";

export function ConsumerShell({ active, children }: { active?: NavKey; children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[var(--color-surface)]">
      <Sidebar active={active} />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Topbar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
