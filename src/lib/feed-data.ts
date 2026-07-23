import type { FeedTrip } from "@/types";

export const mockFeedTrips: FeedTrip[] = [
  {
    id: "feed-santorini-7d",
    title: "กรีซ ซานโตรินี",
    destination: "ซานโตรินี, เอเธนส์",
    coverImageUrl:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
    category: "beach",
    tags: ["ทะเล", "โรแมนติก", "ถ่ายรูปสวย"],
    rating: 4.8,
    creator: { name: "Nina Papadopoulos", handle: "@ninatravels", avatar: "🏛️" },
    members: [
      { name: "Nina", avatar: "🏛️" },
      { name: "Mew", avatar: "🙋‍♀️" },
      { name: "Pong", avatar: "🙋‍♂️" },
      { name: "Jane", avatar: "👩" },
    ],
    saves: 1560,
    remixes: 132,
    description:
      "เต็มอิ่มกับหมู่บ้านสีขาว-ฟ้าริมหน้าผา พระอาทิตย์ตกที่เอียโอส และไวน์ท้องถิ่นบนเกาะภูเขาไฟ",
    days: [
      {
        id: "d1",
        dayNumber: 1,
        date: "2026-09-10",
        activities: [
          { id: "a1", time: "10:00", title: "ถึงสนามบินซานโตรินี", category: "transport", cost: 0 },
          { id: "a2", time: "13:00", title: "เช็คอินโรงแรมวิวทะเล", category: "hotel", location: { name: "Oia" }, cost: 9800 },
          { id: "a3", time: "18:00", title: "ชมพระอาทิตย์ตกที่เอีย", category: "sightseeing", location: { name: "Oia Castle" }, cost: 0 },
          { id: "a4", time: "20:00", title: "อาหารเย็นซีฟู้ดริมทะเล", category: "food", location: { name: "Ammoudi Bay" }, cost: 2400 },
        ],
      },
      {
        id: "d2",
        dayNumber: 2,
        date: "2026-09-11",
        activities: [
          { id: "a5", time: "09:00", title: "ล่องเรือชมภูเขาไฟ", category: "activity", location: { name: "Nea Kameni" }, cost: 3200 },
          { id: "a6", time: "14:00", title: "ชิมไวน์ท้องถิ่น", category: "food", location: { name: "Santo Wines" }, cost: 1800 },
        ],
      },
    ],
  },
  {
    id: "feed-tokyo-5d",
    title: "โตเกียว",
    destination: "โตเกียว, ฟูจิ, คามาคุระ",
    coverImageUrl:
      "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=1200&q=80",
    category: "city",
    tags: ["เมือง", "ซากุระ", "ช้อปปิ้ง"],
    rating: 4.7,
    creator: { name: "Yuki Tanaka", handle: "@yukiexplores", avatar: "🌸" },
    members: [
      { name: "Yuki", avatar: "🌸" },
      { name: "Bill", avatar: "🙋‍♂️" },
      { name: "May", avatar: "👩" },
    ],
    saves: 2140,
    remixes: 198,
    description:
      "โตเกียวช่วงซากุระบาน เที่ยวย่านชิบูย่า-อาซากุสะ นั่งรถไฟชมฟูจิ และแวะวัดโบราณที่คามาคุระ",
    days: [
      {
        id: "d1",
        dayNumber: 1,
        date: "2026-04-02",
        activities: [
          { id: "a1", time: "11:00", title: "ถึงสนามบินนาริตะ", category: "transport", cost: 0 },
          { id: "a2", time: "14:00", title: "เช็คอินโรงแรมชินจูกุ", category: "hotel", location: { name: "Shinjuku" }, cost: 6200 },
          { id: "a3", time: "16:00", title: "เดินเล่นชิบูย่า สแครมเบิล", category: "sightseeing", location: { name: "Shibuya Crossing" }, cost: 0 },
          { id: "a4", time: "19:00", title: "ราเมงย่านชิบูย่า", category: "food", cost: 1200 },
        ],
      },
      {
        id: "d2",
        dayNumber: 2,
        date: "2026-04-03",
        activities: [
          { id: "a5", time: "08:00", title: "นั่งรถไฟชมภูเขาฟูจิ", category: "transport", location: { name: "Kawaguchiko" }, cost: 2800 },
          { id: "a6", time: "13:00", title: "ชมซากุระริมทะเลสาบ", category: "sightseeing", cost: 0 },
        ],
      },
    ],
  },
  {
    id: "feed-swiss-8d",
    title: "สวิตเซอร์แลนด์",
    destination: "ซูริค, ลูเซิร์น, อินเทอร์ลาเก้น",
    coverImageUrl:
      "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80",
    category: "nature",
    tags: ["ภูเขา", "ธรรมชาติ", "รถไฟ"],
    rating: 4.9,
    creator: { name: "Marco Steiner", handle: "@marcoalpine", avatar: "🏔️" },
    members: [
      { name: "Marco", avatar: "🏔️" },
      { name: "Aom", avatar: "👩" },
    ],
    saves: 1890,
    remixes: 156,
    description:
      "ไล่ตามวิวเทือกเขาแอลป์ นั่งรถไฟสายโรแมนติกผ่านลูเซิร์น และขึ้นกระเช้าชมยอดเขาจุงเฟรา",
    days: [
      {
        id: "d1",
        dayNumber: 1,
        date: "2026-06-15",
        activities: [
          { id: "a1", time: "12:00", title: "ถึงสนามบินซูริค", category: "transport", cost: 0 },
          { id: "a2", time: "15:00", title: "เช็คอินโรงแรมริมทะเลสาบ", category: "hotel", location: { name: "Zurich" }, cost: 8500 },
          { id: "a3", time: "17:00", title: "เดินเล่นเมืองเก่าซูริค", category: "sightseeing", cost: 0 },
        ],
      },
      {
        id: "d2",
        dayNumber: 2,
        date: "2026-06-16",
        activities: [
          { id: "a4", time: "08:00", title: "นั่งรถไฟไปลูเซิร์น", category: "transport", cost: 2100 },
          { id: "a5", time: "11:00", title: "ล่องเรือทะเลสาบลูเซิร์น", category: "activity", cost: 1600 },
          { id: "a6", time: "19:00", title: "ฟองดูสวิสแท้", category: "food", location: { name: "Lucerne" }, cost: 2200 },
        ],
      },
    ],
  },
  {
    id: "feed-kyoto-4d",
    title: "เกียวโต",
    destination: "เกียวโต, นารา, โอซาก้า",
    coverImageUrl:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    category: "culture",
    tags: ["วัฒนธรรม", "วัด", "โคมไฟ"],
    rating: 4.6,
    creator: { name: "Aiko Sato", handle: "@aikojourney", avatar: "⛩️" },
    members: [
      { name: "Aiko", avatar: "⛩️" },
      { name: "Ken", avatar: "🙋‍♂️" },
      { name: "Fah", avatar: "👩" },
    ],
    saves: 1320,
    remixes: 104,
    description:
      "ซึมซับวัฒนธรรมญี่ปุ่นแท้ๆ เดินตรอกโคมไฟกิออน ไหว้พระที่ฟูชิมิ อินาริ และแวะให้อาหารกวางที่นารา",
    days: [
      {
        id: "d1",
        dayNumber: 1,
        date: "2026-11-05",
        activities: [
          { id: "a1", time: "10:00", title: "ถึงสถานีเกียวโต", category: "transport", cost: 0 },
          { id: "a2", time: "13:00", title: "เช็คอินเรียวกังดั้งเดิม", category: "hotel", location: { name: "Gion" }, cost: 7200 },
          { id: "a3", time: "16:00", title: "เดินตรอกโคมไฟกิออน", category: "sightseeing", location: { name: "Gion District" }, cost: 0 },
        ],
      },
      {
        id: "d2",
        dayNumber: 2,
        date: "2026-11-06",
        activities: [
          { id: "a4", time: "08:00", title: "ไหว้พระฟูชิมิ อินาริ", category: "sightseeing", location: { name: "Fushimi Inari" }, cost: 0 },
          { id: "a5", time: "13:00", title: "นั่งรถไฟไปนารา ให้อาหารกวาง", category: "activity", location: { name: "Nara Park" }, cost: 900 },
        ],
      },
    ],
  },
  // "Chill but Alive" — 30+/night-owl profile: lounge cocktails + sunset cruise + the
  // after-hours-bowling secret, not club-hopping. Proposed template attributes for
  // future audience matching (no schema field yet): pace: relaxed ·
  // nightlife_style: lounge_cocktail (not club) · late_night_alt: bowling_alley
  {
    id: "feed-luangprabang-3d",
    title: "หลวงพระบาง",
    destination: "หลวงพระบาง, ลาว",
    coverImageUrl:
      "https://images.unsplash.com/photo-1686120552846-7caf1a345876?auto=format&fit=crop&w=1200&q=80",
    category: "culture",
    tags: ["มรดกโลก UNESCO", "ค็อกเทลบาร์", "โบว์ลิ่งดึกสุด"],
    rating: 4.7,
    creator: { name: "Bounthanh Vilay", handle: "@bounthanhtrips", avatar: "🏮" },
    members: [
      { name: "Nok", avatar: "🙋‍♀️" },
      { name: "DJ", avatar: "🙋‍♂️" },
      { name: "Frank", avatar: "🧔" },
      { name: "Ploy", avatar: "👩" },
    ],
    saves: 890,
    remixes: 64,
    description:
      "3 วัน 2 คืนสายชิลแต่มีชีวิตชีวา สำหรับกลุ่มเพื่อนวัย 30+ ที่อยากเที่ยวกลางคืนแบบไม่ต้องเป็นคลับ — ค็อกเทลบาร์บรรยากาศวินเทจ ตลาดกลางคืนริมวัด ล่องเรือ sunset dinner cruise ปิดท้ายทุกคืนด้วยของลับที่นักท่องเที่ยวทั่วไปไม่รู้: โบว์ลิ่งหลวงพระบาง ที่เดียวในเมืองเก่าที่เปิดยันตี 2 ครึ่ง (ตัดพิธีตักบาตรเช้าตรู่ออกโดยตั้งใจ เพราะสวนทางกับธีมนอนดึก — เสนอเป็น optional add-on ได้ถ้ากลุ่มอยากลองทั้งคู่)",
    days: [
      {
        id: "d1",
        dayNumber: 1,
        date: "2026-11-20",
        activities: [
          { id: "a1", time: "13:00", title: "เช็คอินโรงแรมบูติกเมืองเก่า", category: "hotel", location: { name: "Old Town" }, cost: 3200 },
          { id: "a2", time: "15:00", title: "เดินชมวัดเซียงทอง + ปั่นจักรยานเลียบเมืองเก่า", category: "sightseeing", location: { name: "Wat Xieng Thong" }, cost: 0 },
          { id: "a3", time: "17:30", title: "ขึ้นภูสีชมพระอาทิตย์ตกริมโขง", category: "sightseeing", location: { name: "Mount Phousi" }, cost: 400 },
          { id: "a4", time: "19:30", title: "เดินตลาดกลางคืน ชิมสตรีทฟู้ดลาว", category: "food", location: { name: "Luang Prabang Night Market" }, cost: 1000 },
          { id: "a5", time: "21:30", title: "ค็อกเทลบรรยากาศวินเทจที่ Icon Klub", category: "food", location: { name: "Icon Klub" }, cost: 2400 },
          { id: "a6", time: "23:30", title: "ต่อดึกที่โบว์ลิ่งหลวงพระบาง (เปิดถึงตี 2 ครึ่ง)", category: "activity", location: { name: "Luang Prabang Bowling Alley" }, notes: "ของลับหลังบาร์ปิด — คนท้องถิ่นก็มาเล่น", cost: 1600 },
        ],
      },
      {
        id: "d2",
        dayNumber: 2,
        date: "2026-11-21",
        activities: [
          { id: "a7", time: "08:00", title: "ทริปครึ่งวันน้ำตกกวางซี ว่ายน้ำสระสีฟ้า + ศูนย์ช่วยเหลือหมี", category: "activity", location: { name: "Kuang Si Falls" }, cost: 3600 },
          { id: "a8", time: "13:30", title: "สปาสมุนไพรลาวแบบดั้งเดิม", category: "activity", location: { name: "Luang Prabang" }, cost: 2200 },
          { id: "a9", time: "17:00", title: "ล่องเรือ Sunset Mekong Dinner Cruise อาหารลาว 7 คอร์ส", category: "food", location: { name: "Mekong River" }, cost: 5200 },
          { id: "a10", time: "21:00", title: "บาร์เร้กเก้ Lao Lao Garden มี BBQ", category: "food", location: { name: "Lao Lao Garden" }, cost: 1800 },
          { id: "a11", time: "23:00", title: "ต่อโบว์ลิ่งหลวงพระบางอีกรอบ คืนดึกสุดของทริป", category: "activity", location: { name: "Luang Prabang Bowling Alley" }, cost: 1200 },
        ],
      },
      {
        id: "d3",
        dayNumber: 3,
        date: "2026-11-22",
        activities: [
          { id: "a12", time: "09:00", title: "คาเฟ่ริมถนน จิบกาแฟลาว (เช้าแบบไม่รีบ)", category: "food", location: { name: "Luang Prabang" }, cost: 500 },
          { id: "a13", time: "10:30", title: "เดินตลาดเช้าซื้อของฝากรอบสุดท้าย", category: "other", location: { name: "Luang Prabang Morning Market" }, cost: 1200 },
          { id: "a14", time: "12:00", title: "(ถ้าเวลาเหลือ) ล่องเรือถ้ำปากอู", category: "activity", location: { name: "Pak Ou Caves" }, cost: 2800 },
          { id: "a15", time: "14:00", title: "เดินทางสู่สนามบิน", category: "transport", location: { name: "Luang Prabang Airport" }, cost: 400 },
        ],
      },
    ],
  },
];

export function getFeedTripById(id: string): FeedTrip | undefined {
  return mockFeedTrips.find((t) => t.id === id);
}
