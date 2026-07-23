import type { ReactNode } from "react";
import { Sidebar } from "@/components/consumer/Sidebar";
import { Topbar } from "@/components/consumer/Topbar";

type NavKey = "home";

export function ConsumerShell({
  active,
  activeGroupId,
  children,
}: {
  active?: NavKey;
  activeGroupId?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[var(--color-surface)]">
      <Sidebar active={active} activeGroupId={activeGroupId} />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Topbar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
