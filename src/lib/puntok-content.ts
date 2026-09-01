// Mock feed for /puntok — the short-clip surface behind the bottom bar's
// Puntok tab. Static on purpose: there is no clips endpoint yet, so the page
// is a UI prototype (see app/puntok/page.tsx) and everything it plays already
// lives in public/ — nothing here reaches the network.
//
// The repo ships four clips (public/videos/plan-*.mp4), which is fewer than a
// vertical feed needs to feel like one, so stills from public/images take the
// remaining slots. A still isn't filler: it's a state the card has to handle
// anyway, the same way CreatorPlan.imageUrl does in lib/home-content.ts.

export interface PuntokClip {
  id: string;
  creatorName: string;
  /** Path under /images. Only two avatars exist in the repo, so they repeat. */
  creatorAvatar: string;
  /** Drives the tab split — "กำลังติดตาม" shows only these. */
  following: boolean;
  caption: string;
  tags: string[];
  /** Pre-formatted for display ("12k"), like CreatorPlan's counts — these are
   *  labels in a mockup, not numbers anything adds up. */
  likes: string;
  comments: string;
  saves: string;
  shares: string;
  /** A post is a clip when it has videoUrl, a still when it doesn't. */
  videoUrl?: string;
  /** Poster for a clip, and the whole post for a still. */
  imageUrl?: string;
  /** Where the rail's "ดูแพลนทริป" thumbnail goes. Left out while a post has
   *  no plan behind it — the thumbnail then renders as a plain badge. */
  tripHref?: string;
}

export const puntokClips: PuntokClip[] = [
  {
    id: "luang-prabang-3d2n",
    creatorName: "TravelWithTawn",
    creatorAvatar: "/images/profile-avatar.jpg",
    following: false,
    caption: "เที่ยวหลวงพระบาง 3 วัน 2 คืน ตื่นเช้าไปใส่บาตรข้าวเหนียว แล้วต่อน้ำตกกวางสี",
    tags: ["หลวงพระบาง", "ลาว", "สายบุญ"],
    likes: "12k",
    comments: "3k",
    saves: "1.2k",
    shares: "13k",
    imageUrl: "/images/wat-xieng-thong.png",
  },
  {
    id: "osaka-kyoto-7d",
    creatorName: "Maynippongirls",
    creatorAvatar: "/images/profile-v2.jpg",
    following: true,
    caption: "เที่ยวโอซาก้า-เกียวโต 7 วัน งบเบาๆ นั่งรถไฟใบเดียวเที่ยวได้ทั้งทริป",
    tags: ["โอซาก้า", "เกียวโต", "งบประหยัด"],
    likes: "18.2k",
    comments: "3.6k",
    saves: "2.4k",
    shares: "9.8k",
    videoUrl: "/videos/plan-osaka.mp4",
    imageUrl: "/images/plan-osaka.jpg",
  },
  {
    id: "beijing-greatwall-5d",
    creatorName: "TravelWithTawn",
    creatorAvatar: "/images/profile-avatar.jpg",
    following: false,
    caption: "ปักกิ่ง-กำแพงเมืองจีน 5 วัน สุดคุ้ม เดินครบทุกไฮไลท์ในทริปเดียว",
    tags: ["ปักกิ่ง", "จีน", "กำแพงเมืองจีน"],
    likes: "12k",
    comments: "3k",
    saves: "1.8k",
    shares: "7.5k",
    videoUrl: "/videos/plan-beijing.mp4",
    imageUrl: "/images/plan-beijing.jpg",
  },
  {
    id: "seoul-jeju-4d",
    creatorName: "FoodieNomad",
    creatorAvatar: "/images/profile-v2.jpg",
    following: true,
    caption: "โซล-เกาะเชจู 4 วัน สโลว์ไลฟ์ กินคาเฟ่เช้า เดินตลาดกลางคืน",
    tags: ["โซล", "เชจู", "คาเฟ่"],
    likes: "18.2k",
    comments: "3.6k",
    saves: "3.1k",
    shares: "11k",
    videoUrl: "/videos/plan-seoul.mp4",
    imageUrl: "/images/plan-seoul.jpg",
  },
  {
    id: "chiangmai-night-market",
    creatorName: "Maynippongirls",
    creatorAvatar: "/images/profile-v2.jpg",
    following: true,
    caption: "ตลาดกลางคืนเชียงใหม่ เดินสายกินรอบเดียวจบ ของอร่อยไม่ถึงร้อย",
    tags: ["เชียงใหม่", "ของกิน", "ตลาดกลางคืน"],
    likes: "9.4k",
    comments: "1.1k",
    saves: "980",
    shares: "4.2k",
    imageUrl: "/images/night-market.png",
  },
  {
    id: "london-6d",
    creatorName: "FoodieNomad",
    creatorAvatar: "/images/profile-avatar.jpg",
    following: true,
    caption: "ลอนดอน 6 วัน เก็บครบทุกไฮไลท์ พร้อมพิกัดร้านที่ไม่ควรพลาด",
    tags: ["ลอนดอน", "อังกฤษ", "ยุโรป"],
    likes: "22.9k",
    comments: "4.7k",
    saves: "5.6k",
    shares: "15k",
    videoUrl: "/videos/plan-london.mp4",
    imageUrl: "/images/plan-london.jpg",
  },
];
