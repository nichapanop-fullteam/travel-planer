import type { CreatorPlan } from "@/lib/home-content";

export function CreatorPlanCard({ plan }: { plan: CreatorPlan }) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-sm">
      {plan.videoUrl ? (
        <video
          src={plan.videoUrl}
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={plan.imageUrl} alt={plan.title} className="h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/30 py-1 pl-1 pr-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm">
          {plan.creatorAvatar}
        </span>
        <span className="text-xs font-medium text-white">{plan.creatorName}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3.5">
        <p className="text-sm font-bold leading-snug text-white">{plan.title}</p>
        <div className="flex items-center gap-3 text-xs text-white/90">
          <span>♥ {plan.likes}</span>
          <span>💬 {plan.comments}</span>
        </div>
      </div>
    </div>
  );
}
