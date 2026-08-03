import type { PlaceCardData } from "@/components/consumer/PlaceCard";
import type { CreatorPlan, RecommendDestination } from "./home-content";
import { recommendDestinations } from "./home-content";

// Search results ("Discovery") for a specific destination. Mock data only —
// today only Luang Prabang is wired up, matched against a short keyword list.
export interface DestinationGuide {
  slug: string;
  name: string;
  badge?: string;
  filters: string[];
  keywords: string[]; // free-text search matches against these (see findDestinationGuide)
  popularPlaces: PlaceCardData[];
  recommendedTrips: RecommendDestination[];
  creatorPlans: CreatorPlan[];
}

const luangPrabangTrip = recommendDestinations.find((d) => d.id === "rec-luangprabang");

export const destinationGuides: DestinationGuide[] = [
  {
    slug: "luang-prabang",
    name: "หลวงพระบาง, ลาว",
    badge: "มรดกโลก UNESCO",
    filters: ["ธรรมชาติ", "ไนท์ไลฟ์", "วัฒนธรรม", "คาเฟ่"],
    keywords: ["หลวงพระบาง,ลาว", "หลวงพระบาง", "ลาว"],
    popularPlaces: [
      {
        id: "place-wat-xieng-thong",
        title: "วัดเชียงทอง",
        imageUrl: "/images/luang-prabang.jpg",
        tags: ["วัฒนธรรม", "สถาปัตยกรรม", "ประวัติศาสตร์"],
      },
      {
        id: "place-night-market",
        title: "ตลาดมืดหลวงพระบาง",
        imageUrl: "/images/luang-prabang.jpg",
        tags: ["อาหาร", "ไนท์ไลฟ์", "วัฒนธรรม"],
      },
      {
        id: "place-joma",
        title: "Joma Bakery Café",
        imageUrl: "/images/luang-prabang.jpg",
        tags: ["คาเฟ่", "อาหาร", "วิวสวย"],
      },
      {
        id: "place-mekong-boat",
        title: "ล่องเรือแม่น้ำโขง",
        imageUrl: "/images/luang-prabang.jpg",
        tags: ["ล่องเรือ", "แม่น้ำโขง", "ธรรมชาติ"],
      },
    ],
    recommendedTrips: [
      ...(luangPrabangTrip ? [luangPrabangTrip] : []),
      {
        id: "trip-mekong-cruise",
        title: "ทริปล่องเรือแม่น้ำโขง หลวงพระบาง",
        subtitle: "ถ้ำปากอู · ปากแบง · หมู่บ้านหัตถกรรม · บ้านช่างไห",
        imageUrl: "/images/luang-prabang.jpg",
        tags: ["ล่องเรือ", "ธรรมชาติ", "ผจญภัย"],
        rating: 4.8,
        saves: "4.7k",
        priceFrom: 8900,
      },
      {
        id: "trip-wat-xieng-thong",
        title: "หลวงพระบาง วัดเชียงทอง",
        subtitle: "วัดเชียงทอง · น้ำตกตาดกวางสี · ทำตัก",
        imageUrl: "/images/luang-prabang.jpg",
        tags: ["วัฒนธรรม", "ธรรมชาติ", "มรดกโลก"],
        rating: 4.9,
        saves: "2.8k",
        priceFrom: 7200,
      },
    ],
    creatorPlans: [
      {
        id: "creator-lp-1",
        creatorName: "TravelWithTawn",
        creatorAvatar: "🙏",
        title: "เที่ยวหลวงพระบาง 3 วัน ชิลล์ๆ",
        imageUrl: "/images/luang-prabang.jpg",
        likes: "12k",
        comments: "3k",
      },
      {
        id: "creator-lp-2",
        creatorName: "TravelWithTawn",
        creatorAvatar: "🙏",
        title: "เที่ยวหลวงพระบาง น้ำตกตาดกวางสี",
        imageUrl: "/images/luang-prabang.jpg",
        likes: "12k",
        comments: "3k",
      },
      {
        id: "creator-lp-3",
        creatorName: "TravelWithTawn",
        creatorAvatar: "🙏",
        title: "เที่ยวหลวงพระบาง ล่องเรือแม่น้ำโขง",
        imageUrl: "/images/luang-prabang.jpg",
        likes: "18.2k",
        comments: "3.6k",
      },
      {
        id: "creator-lp-4",
        creatorName: "TravelWithTawn",
        creatorAvatar: "🙏",
        title: "เที่ยวหลวงพระบาง ตลาดมืดสุดคึกคัก",
        imageUrl: "/images/luang-prabang.jpg",
        likes: "22.9k",
        comments: "4.7k",
      },
    ],
  },
];

export function findDestinationGuide(query: string): DestinationGuide | undefined {
  const normalized = query.trim();
  if (!normalized) return undefined;
  return destinationGuides.find((guide) =>
    guide.keywords.some((k) => normalized.includes(k) || k.includes(normalized))
  );
}
