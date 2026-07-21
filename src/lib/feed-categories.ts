import { Building2, Compass, Landmark, Mountain, TreePine, UtensilsCrossed, type LucideIcon, Palmtree } from "lucide-react";
import type { FeedCategory } from "@/types";

export const FEED_CATEGORIES: { key: FeedCategory; label: string; icon: LucideIcon }[] = [
  { key: "beach", label: "ทะเล", icon: Palmtree },
  { key: "mountain", label: "ภูเขา", icon: Mountain },
  { key: "city", label: "เมือง", icon: Building2 },
  { key: "culture", label: "วัฒนธรรม", icon: Landmark },
  { key: "nature", label: "ธรรมชาติ", icon: TreePine },
  { key: "food", label: "อาหาร", icon: UtensilsCrossed },
  { key: "adventure", label: "ผจญภัย", icon: Compass },
];

export const feedCategoryLabel: Record<FeedCategory, string> = Object.fromEntries(
  FEED_CATEGORIES.map((c) => [c.key, c.label])
) as Record<FeedCategory, string>;
