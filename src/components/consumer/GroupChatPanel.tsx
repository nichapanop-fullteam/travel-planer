import { Send } from "lucide-react";
import type { Member } from "@/types";

const MESSAGE_SCRIPT = [
  { time: "10:30 AM", text: "ทุกคนพร้อม 09:00 ที่จุดนัดหมายนะคะ 📍", reactions: 2 },
  { time: "10:31 AM", text: "รับทราบครับ 👍" },
  { time: "10:32 AM", text: "อยากแวะคาเฟ่ระหว่างทาง มีแนะนำไหม" },
  { time: "10:33 AM", text: "เดี๋ยวผมปักหมุดในแผนให้ครับ" },
];

// Static mock conversation — no real send/receive in this demo.
// Authors are always drawn from this trip's real members so the chat never
// shows someone who isn't actually on the trip.
export function GroupChatPanel({ members }: { members: Member[] }) {
  const messages = MESSAGE_SCRIPT.map((msg, i) => ({
    ...msg,
    author: members[i % members.length],
  }));

  return (
    <div className="flex h-[420px] flex-col rounded-3xl border border-[var(--color-border)]/40 bg-white">
      <div className="border-b border-[var(--color-border)]/40 p-4">
        <h3 className="text-sm font-bold">Group Chat</h3>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-sm">
              {msg.author.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold">{msg.author.name}</span>
                <span className="text-[10px] text-[var(--color-muted)]">{msg.time}</span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed">{msg.text}</p>
              {msg.reactions && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[10px]">
                  ❤️ {msg.reactions}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--color-border)]/40 p-3">
        <input
          type="text"
          placeholder="Type a message..."
          disabled
          className="flex-1 rounded-full bg-[var(--color-surface)] px-3.5 py-2 text-xs placeholder:text-[var(--color-muted)] focus:outline-none"
        />
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}
