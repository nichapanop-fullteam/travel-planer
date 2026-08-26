import type { PlaceCardData } from "@/components/consumer/PlaceCard";
import type { CreatorPlan, RecommendDestination } from "./home-content";
import { recommendDestinations } from "./home-content";

// Search results ("Discovery") for a specific destination. Mock data only —
// matched against each guide's own short keyword list (see findDestinationGuide).
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
const tokyoTrip = recommendDestinations.find((d) => d.id === "rec-tokyo");
const chengduTrip = recommendDestinations.find((d) => d.id === "rec-chengdu");

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
        imageUrl: "/images/wat-xieng-thong.png",
        tags: ["วัฒนธรรม", "สถาปัตยกรรม", "ประวัติศาสตร์"],
      },
      {
        id: "place-night-market",
        title: "ตลาดมืดหลวงพระบาง",
        imageUrl: "/images/night-market.png",
        tags: ["อาหาร", "ไนท์ไลฟ์", "วัฒนธรรม"],
      },
      {
        id: "place-joma",
        title: "Joma Bakery Café",
        imageUrl: "/images/joma-cafe.png",
        tags: ["คาเฟ่", "อาหาร", "วิวสวย"],
      },
      {
        id: "place-mekong-boat",
        title: "ล่องเรือแม่น้ำโขง",
        imageUrl: "/images/mekong-boat.png",
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
  {
    slug: "tokyo",
    name: "โตเกียว, ญี่ปุ่น",
    badge: "เมืองแห่งเทคโนโลยี",
    filters: ["เมือง", "ช้อปปิ้ง", "วัฒนธรรม", "อาหาร"],
    keywords: ["โตเกียว,ญี่ปุ่น", "โตเกียว", "tokyo", "ญี่ปุ่น"],
    popularPlaces: [
      {
        id: "place-shibuya-crossing",
        title: "ชิบูย่า สแครมเบิล",
        imageUrl: "/images/tokyo.jpg",
        tags: ["เมือง", "ถ่ายรูปสวย", "ไนท์ไลฟ์"],
      },
      {
        id: "place-senso-ji",
        title: "วัดเซนโซจิ อาซากุสะ",
        imageUrl: "/images/tokyo.jpg",
        tags: ["วัฒนธรรม", "ประวัติศาสตร์"],
      },
      {
        id: "place-akihabara",
        title: "อาคิฮาบาระ",
        imageUrl: "/images/tokyo.jpg",
        tags: ["ช้อปปิ้ง", "อนิเมะ"],
      },
      {
        id: "place-shinjuku-gyoen",
        title: "สวนชินจูกุเกียวเอ็น",
        imageUrl: "/images/tokyo.jpg",
        tags: ["ธรรมชาติ", "วิวสวย"],
      },
    ],
    recommendedTrips: [
      ...(tokyoTrip ? [tokyoTrip] : []),
      {
        id: "trip-tokyo-food",
        title: "โตเกียว กินรอบเมือง 4 วัน",
        subtitle: "ตลาดปลาสึกิจิ · ราเมงชินจูกุ · ย่านชิบูย่า",
        imageUrl: "/images/tokyo.jpg",
        tags: ["อาหาร", "เมือง"],
        rating: 4.7,
        saves: "3.1k",
        priceFrom: 21900,
      },
    ],
    creatorPlans: [
      {
        id: "creator-tokyo-1",
        creatorName: "Yuki Explores",
        creatorAvatar: "🌸",
        title: "โตเกียว 5 วัน สายช้อป",
        imageUrl: "/images/tokyo.jpg",
        likes: "9.4k",
        comments: "1.8k",
      },
      {
        id: "creator-tokyo-2",
        creatorName: "Yuki Explores",
        creatorAvatar: "🌸",
        title: "โตเกียว กินราเมงให้ครบทุกย่าน",
        imageUrl: "/images/tokyo.jpg",
        likes: "15.6k",
        comments: "2.9k",
      },
    ],
  },
  {
    slug: "chengdu",
    name: "เฉิงตู, จีน",
    badge: "ดินแดนแพนด้า",
    filters: ["ธรรมชาติ", "อาหาร", "วัฒนธรรม"],
    keywords: ["เฉิงตู,จีน", "เฉิงตู", "chengdu", "จีน"],
    popularPlaces: [
      {
        id: "place-panda-base",
        title: "ศูนย์อนุรักษ์หมีแพนด้า",
        imageUrl: "/images/chengdu.jpg",
        tags: ["ธรรมชาติ", "สัตว์"],
      },
      {
        id: "place-jinli-street",
        title: "ถนนโบราณจิ่นหลี่",
        imageUrl: "/images/chengdu.jpg",
        tags: ["วัฒนธรรม", "ช้อปปิ้ง"],
      },
      {
        id: "place-hotpot",
        title: "หม้อไฟเสฉวนต้นตำรับ",
        imageUrl: "/images/chengdu.jpg",
        tags: ["อาหาร", "รสจัดจ้าน"],
      },
    ],
    recommendedTrips: [
      ...(chengduTrip ? [chengduTrip] : []),
      {
        id: "trip-chengdu-panda",
        title: "เฉิงตู แพนด้า และหม้อไฟ 4 วัน",
        subtitle: "ศูนย์แพนด้า · ถนนจิ่นหลี่ · โรงน้ำชาโบราณ",
        imageUrl: "/images/chengdu.jpg",
        tags: ["ธรรมชาติ", "อาหาร"],
        rating: 4.8,
        saves: "2.9k",
        priceFrom: 18900,
      },
    ],
    creatorPlans: [
      {
        id: "creator-chengdu-1",
        creatorName: "Vanessa Eats",
        creatorAvatar: "🐼",
        title: "เฉิงตู 4 วัน ตะลุยแพนด้า",
        imageUrl: "/images/chengdu.jpg",
        likes: "7.2k",
        comments: "1.1k",
      },
      {
        id: "creator-chengdu-2",
        creatorName: "Vanessa Eats",
        creatorAvatar: "🐼",
        title: "เฉิงตู หม้อไฟทุกร้านที่ต้องลอง",
        imageUrl: "/images/chengdu.jpg",
        likes: "11.3k",
        comments: "2.4k",
      },
    ],
  },
  {
    slug: "seoul",
    name: "โซล, เกาหลีใต้",
    badge: "สายคาเฟ่ช้อปปิ้ง",
    filters: ["เมือง", "คาเฟ่", "ช้อปปิ้ง", "อาหาร"],
    keywords: ["โซล,เกาหลีใต้", "โซล", "seoul", "เกาหลี"],
    popularPlaces: [
      {
        id: "place-bukchon-hanok",
        title: "หมู่บ้านฮันอกบุกชน",
        imageUrl: "/images/plan-seoul.jpg",
        tags: ["วัฒนธรรม", "ถ่ายรูปสวย"],
      },
      {
        id: "place-myeongdong",
        title: "ตลาดเมียงดง",
        imageUrl: "/images/plan-seoul.jpg",
        tags: ["ช้อปปิ้ง", "สกินแคร์"],
      },
      {
        id: "place-hongdae-cafe",
        title: "คาเฟ่ย่านฮงแด",
        imageUrl: "/images/plan-seoul.jpg",
        tags: ["คาเฟ่", "ไนท์ไลฟ์"],
      },
    ],
    recommendedTrips: [
      {
        id: "trip-seoul-cafe",
        title: "โซล คาเฟ่ฮอปปิ้ง 5 วัน",
        subtitle: "ฮันอกบุกชน · ฮงแด · เมียงดง · ทงแดมุน",
        imageUrl: "/images/plan-seoul.jpg",
        tags: ["คาเฟ่", "ช้อปปิ้ง"],
        rating: 4.7,
        saves: "4.3k",
        priceFrom: 22500,
      },
    ],
    creatorPlans: [
      {
        id: "creator-seoul-1",
        creatorName: "Fern Wanderlust",
        creatorAvatar: "☕",
        title: "โซล 5 วัน คาเฟ่ครบทุกย่าน",
        imageUrl: "/images/plan-seoul.jpg",
        likes: "13.5k",
        comments: "2.6k",
      },
      {
        id: "creator-seoul-2",
        creatorName: "Fern Wanderlust",
        creatorAvatar: "☕",
        title: "โซล ช้อปปิ้งสกินแคร์ฉบับจัดเต็ม",
        imageUrl: "/images/plan-seoul.jpg",
        likes: "10.1k",
        comments: "1.9k",
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
