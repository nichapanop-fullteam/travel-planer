import type { Trip } from "@/types";

export const mockCustomers = [
  {
    id: "cus-1",
    name: "คุณปัทมา",
    contact: "@pattama_trip",
    groupSize: 12,
  },
  {
    id: "cus-2",
    name: "คุณเป๊ก",
    contact: "@peck.travels",
    groupSize: 6,
  },
  {
    id: "cus-3",
    name: "บริษัท ทัวร์ดี จำกัด",
    contact: "@tourdee_th",
    groupSize: 28,
  },
];

export const mockTrips: Trip[] = [
  {
    id: "trip-osaka-4d3n",
    title: "Osaka Kyoto กรุ๊ปครอบครัว",
    destination: "Osaka, Japan",
    coverImageUrl: "/mock/osaka.jpg",
    startDate: "2026-08-10",
    endDate: "2026-08-13",
    status: "shared",
    customer: mockCustomers[0],
    budgetLimit: 45000,
    days: [
      {
        id: "day-1",
        dayNumber: 1,
        date: "2026-08-10",
        activities: [
          {
            id: "act-1",
            time: "09:00",
            title: "ถึงสนามบิน Kansai",
            category: "transport",
            location: { name: "Kansai International Airport", lat: 34.4347, lng: 135.2441 },
            cost: 0,
          },
          {
            id: "act-2",
            time: "11:00",
            title: "เช็คอินโรงแรม",
            category: "hotel",
            location: { name: "Namba Oriental Hotel", lat: 34.6656, lng: 135.5011 },
            cost: 8500,
          },
          {
            id: "act-3",
            time: "13:00",
            title: "อาหารกลางวัน ราเมงโดตงบุริ",
            category: "food",
            location: { name: "Dotonbori", lat: 34.6687, lng: 135.5013 },
            cost: 3200,
          },
          {
            id: "act-4",
            time: "15:00",
            title: "เดินเล่นย่านชินไซบาชิ",
            category: "sightseeing",
            location: { name: "Shinsaibashi", lat: 34.6731, lng: 135.5010 },
            cost: 0,
          },
        ],
      },
      {
        id: "day-2",
        dayNumber: 2,
        date: "2026-08-11",
        activities: [
          {
            id: "act-5",
            time: "08:30",
            title: "ปราสาทโอซาก้า",
            category: "sightseeing",
            location: { name: "Osaka Castle", lat: 34.6873, lng: 135.5262 },
            cost: 1800,
          },
          {
            id: "act-6",
            time: "12:00",
            title: "อาหารกลางวัน คูโรเบะ",
            category: "food",
            location: { name: "Kuromon Market", lat: 34.6656, lng: 135.5064 },
            cost: 2800,
          },
          {
            id: "act-7",
            time: "14:00",
            title: "Universal Studios Japan",
            category: "activity",
            location: { name: "USJ", lat: 34.6654, lng: 135.4323 },
            cost: 14400,
          },
        ],
      },
      {
        id: "day-3",
        dayNumber: 3,
        date: "2026-08-12",
        activities: [
          {
            id: "act-8",
            time: "08:00",
            title: "นั่งรถไฟไปเกียวโต",
            category: "transport",
            location: { name: "JR Kyoto Station", lat: 34.9858, lng: 135.7588 },
            cost: 1200,
          },
          {
            id: "act-9",
            time: "10:00",
            title: "ศาลเจ้าฟูชิมิ อินาริ",
            category: "sightseeing",
            location: { name: "Fushimi Inari Taisha", lat: 34.9671, lng: 135.7727 },
            cost: 0,
          },
          {
            id: "act-10",
            time: "13:00",
            title: "อาหารกลางวันแบบเซ็ต",
            category: "food",
            location: { name: "Gion" },
            cost: 3600,
          },
        ],
      },
      {
        id: "day-4",
        dayNumber: 4,
        date: "2026-08-13",
        activities: [
          {
            id: "act-11",
            time: "10:00",
            title: "ช้อปปิ้งของฝาก",
            category: "activity",
            location: { name: "Shinsaibashi" },
            cost: 0,
          },
          {
            id: "act-12",
            time: "15:00",
            title: "เดินทางกลับสนามบิน",
            category: "transport",
            location: { name: "Kansai International Airport" },
            cost: 1600,
          },
        ],
      },
    ],
  },
  {
    id: "trip-chiangmai-3d2n",
    title: "เชียงใหม่ ปาย กรุ๊ปเพื่อน",
    destination: "Chiang Mai, Thailand",
    coverImageUrl: "/mock/chiangmai.jpg",
    startDate: "2026-09-05",
    endDate: "2026-09-07",
    status: "draft",
    customer: mockCustomers[1],
    budgetLimit: 15000,
    days: [
      {
        id: "day-1",
        dayNumber: 1,
        date: "2026-09-05",
        activities: [
          {
            id: "act-13",
            time: "07:00",
            title: "ออกเดินทางจากกรุงเทพ",
            category: "transport",
            cost: 2400,
          },
          {
            id: "act-14",
            time: "12:00",
            title: "เช็คอินที่พักในตัวเมือง",
            category: "hotel",
            cost: 3000,
          },
        ],
      },
      {
        id: "day-2",
        dayNumber: 2,
        date: "2026-09-06",
        activities: [
          {
            id: "act-15",
            time: "09:00",
            title: "ขับรถไปปาย",
            category: "transport",
            cost: 1800,
          },
          {
            id: "act-16",
            time: "13:00",
            title: "จุดชมวิวและคาเฟ่ปาย",
            category: "sightseeing",
            cost: 900,
          },
        ],
      },
    ],
  },
  {
    id: "trip-vietnam-5d4n",
    title: "เวียดนามเหนือ ฮานอย ซาปา",
    destination: "Hanoi, Vietnam",
    coverImageUrl: "/mock/hanoi.jpg",
    startDate: "2026-07-28",
    endDate: "2026-08-01",
    status: "confirmed",
    customer: mockCustomers[2],
    budgetLimit: 90000,
    days: [
      {
        id: "day-1",
        dayNumber: 1,
        date: "2026-07-28",
        activities: [
          {
            id: "act-17",
            time: "10:00",
            title: "ถึงสนามบินโหน่ยบ่าย",
            category: "transport",
            cost: 0,
          },
          {
            id: "act-18",
            time: "13:00",
            title: "เช็คอินโรงแรมย่านเมืองเก่า",
            category: "hotel",
            cost: 16000,
          },
        ],
      },
    ],
  },
];

export function getTripById(tripId: string): Trip | undefined {
  return mockTrips.find((t) => t.id === tripId);
}
