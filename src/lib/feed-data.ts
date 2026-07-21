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
];

export function getFeedTripById(id: string): FeedTrip | undefined {
  return mockFeedTrips.find((t) => t.id === id);
}
