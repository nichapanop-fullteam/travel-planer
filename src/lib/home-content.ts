// Mock content for the redesigned Home page hero/sections (design ref: Pluno Guide UI).
// Not wired to feed-data.ts's FeedTrip shape — these cards show summary stats only
// (rating/saves, likes/comments), no full itinerary breakdown.

export interface RecommendDestination {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  tags: string[];
  rating: number;
  saves: string; // pre-formatted, e.g. "2.1k"
}

export const recommendDestinations: RecommendDestination[] = [
  {
    id: "rec-luangprabang",
    title: "หลวงพระบาง 3 วัน 2 คืน",
    subtitle: "วัดเชียงทอง · น้ำตกกวางสี · ตลาดมืด · ทำตัก",
    imageUrl:
      "https://images.unsplash.com/photo-1686120552846-7caf1a345876?auto=format&fit=crop&w=800&q=80",
    tags: ["ธรรมชาติ", "ไนท์ไลฟ์", "วัฒนธรรม"],
    rating: 4.9,
    saves: "2.1k",
  },
  {
    id: "rec-tokyo",
    title: "เที่ยวญี่ปุ่น โตเกียว 5 วัน",
    subtitle: "ชิบูย่า · ชินจูกุ · อาคิฮาบาระ · อาซากุสะ",
    imageUrl:
      "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=800&q=80",
    tags: ["ธรรมชาติ", "ไนท์ไลฟ์", "วัฒนธรรม"],
    rating: 4.7,
    saves: "1.4k",
  },
  {
    id: "rec-chengdu",
    title: "เฉิงตู 5 วัน ดินแดนแห่งรสชาติ",
    subtitle: "หมีแพนด้า · อาหารเสฉวน · วัดโบราณ",
    imageUrl:
      "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80",
    tags: ["ธรรมชาติ", "ไนท์ไลฟ์", "วัฒนธรรม"],
    rating: 4.8,
    saves: "3.6k",
  },
];

export interface TopDestination {
  id: string;
  label: string;
  imageUrl: string;
}

export const topDestinations: TopDestination[] = [
  {
    id: "top-japan",
    label: "ญี่ปุ่น",
    imageUrl:
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "top-korea",
    label: "เกาหลีใต้",
    imageUrl:
      "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "top-china",
    label: "จีน",
    imageUrl:
      "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "top-hawaii",
    label: "ฮาวาย",
    imageUrl:
      "https://images.unsplash.com/photo-1542259009477-d625272157b7?auto=format&fit=crop&w=600&q=80",
  },
];

export interface CreatorPlan {
  id: string;
  creatorName: string;
  creatorAvatar: string; // emoji avatar
  title: string;
  imageUrl: string;
  likes: string; // pre-formatted, e.g. "12k"
  comments: string;
}

export const creatorPlans: CreatorPlan[] = [
  {
    id: "plan-osaka-kyoto",
    creatorName: "Maynippongirls",
    creatorAvatar: "🌸",
    title: "เที่ยวโอซาก้า-เกียวโต 7 วัน งบเบาๆ",
    imageUrl:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80",
    likes: "12k",
    comments: "3k",
  },
  {
    id: "plan-beijing",
    creatorName: "TravelWithTawn",
    creatorAvatar: "🎒",
    title: "เที่ยวปักกิ่ง-กำแพงเมืองจีน 5 วัน สุดคุ้ม",
    imageUrl:
      "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=600&q=80",
    likes: "12k",
    comments: "3k",
  },
  {
    id: "plan-seoul-jeju",
    creatorName: "FoodieNomad",
    creatorAvatar: "🍜",
    title: "เที่ยวโซล-เกาะเชจู 4 วัน สโลว์ไลฟ์",
    imageUrl:
      "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=600&q=80",
    likes: "18.2k",
    comments: "3.6k",
  },
  {
    id: "plan-london",
    creatorName: "FoodieNomad",
    creatorAvatar: "🍜",
    title: "เที่ยวลอนดอน 6 วัน เก็บครบทุกไฮไลท์",
    imageUrl:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80",
    likes: "22.9k",
    comments: "4.7k",
  },
];
