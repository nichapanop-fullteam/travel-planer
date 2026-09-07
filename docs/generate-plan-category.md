# ขอเพิ่ม `category` ใน response ของ `POST /trips/plan/generate`

**สถานะ:** frontend พร้อมรับแล้ว (ยังไม่ต้องรอ) — เอกสารนี้คือสิ่งที่ขอจากฝั่ง backend
**ผลกระทบถ้าไม่ทำ:** header ของทริปที่ AI สร้างนับผิดทั้งหมด — `18 ที่เที่ยว / 0 ร้านอาหาร / 0 ที่พัก` ทั้งที่มีทั้งโรงแรมและร้านอาหารอยู่ในแผน

---

## ปัญหา

ทุก item ใน `draft.days[].activities` ที่ส่งกลับมาตอนนี้ไม่มี field `category` เลย ตัวอย่างจาก response จริง:

```json
{ "time": "08:00", "title": "THE JAM hostel Luang Prabang",
  "placeId": "78bbf6a8-352f-4413-a2e3-ed0cfdd0f94e",
  "cost": 300, "costCurrency": "THB", "orderIndex": 0,
  "endTime": "09:00", "estimatedDurationMin": 60, "isAiSuggested": true }
```

`THE JAM hostel` เป็นที่พัก, `Dyen Sabai Restaurant` เป็นร้านอาหาร แต่ frontend แยกไม่ออก
เพราะไม่มีอะไรบอก จึงตกไปที่ default `activity` ทั้งหมด แล้วถูกนับเป็น "ที่เที่ยว" หมด

**ทำไม frontend เดาเองไม่ได้:** จาก 18 items ในแผนตัวอย่าง มีแค่ 3 ตัวที่มี `placeId`
ที่เหลืออีก 15 ตัวไม่มี id ให้ไป lookup ต่อ — การเดาจากชื่อ (`"Restaurant"` ใน title)
ใช้ไม่ได้กับชื่อไทย/ลาว และผิดเงียบๆ

## สิ่งที่ขอ

เพิ่ม `category` ลงในทุก item ของ `draft.days[].activities` — ค่าเดียวกับที่
`GET /places/suggest/sections` และ `GET /places/details` ส่งอยู่แล้ว:

```
"attraction" | "restaurant" | "cafe" | "hotel" | "activity" | "transport" | "shopping"
```

ตัวอย่างที่ต้องการ:

```json
{ "time": "08:00", "title": "THE JAM hostel Luang Prabang",
  "placeId": "78bbf6a8-352f-4413-a2e3-ed0cfdd0f94e",
  "category": "hotel",
  "cost": 300, "costCurrency": "THB", "orderIndex": 0,
  "endTime": "09:00", "estimatedDurationMin": 60, "isAiSuggested": true }
```

**item ที่มี `placeId`** — ใช้ `category` จากแถวใน `places` ตรงๆ
**item ที่ไม่มี `placeId`** (โมเดลแต่งชื่อเอง) — ให้โมเดลระบุ `category` มาพร้อมกับ
`title` ใน schema ที่ validate อยู่แล้ว ถือเป็นข้อมูลที่โมเดลรู้ดีที่สุดตอนสร้างแผน

## ความเข้ากันได้

- **`category` เป็น optional** — ไม่ส่งมาก็ยังทำงานได้เหมือนเดิม (ตกไปที่ `activity`)
  ปล่อยขึ้น production ได้โดยไม่ต้องรอ deploy frontend พร้อมกัน
- frontend รับได้ทั้ง taxonomy ของ `places` (7 ค่าข้างบน) และ `ActivityCategory`
  ของแอปเอง (`transport | food | hotel | sightseeing | activity | other`)
  ถ้าฝั่ง backend มีค่าไหนอยู่แล้วก็ส่งค่านั้นมาได้เลย
- ค่าที่ไม่รู้จักถูก map เป็น `activity` ไม่ throw ไม่ค้าง

## ฝั่ง frontend ทำอะไรไปแล้ว

| ไฟล์ | สิ่งที่ทำ |
|---|---|
| `src/lib/generate-plan-api.ts` | `GeneratePlanDraftItem.category` รับได้ทั้งสอง taxonomy |
| `src/lib/generated-trips.ts` | `normalizeCategory()` พับ taxonomy ของ `places` เข้า `ActivityCategory` ผ่าน `EXTERNAL_TO_ACTIVITY_CATEGORY` ที่มีอยู่แล้ว |
| `src/lib/__tests__/buildGeneratedTripFromApiResponse.test.ts` | เทสต์ครอบทั้งสอง taxonomy + เคสไม่มี category + เคสค่าที่ไม่รู้จัก |

ตารางที่ frontend ใช้แปลง (`src/lib/place-mock-metadata.ts`):

| `places` | `ActivityCategory` | นับเป็น |
|---|---|---|
| `attraction` | `sightseeing` | ที่เที่ยว |
| `activity` | `activity` | ที่เที่ยว |
| `restaurant` | `food` | ร้านอาหาร |
| `cafe` | `food` | ร้านอาหาร (แยกเป็นคาเฟ่ต่อ) |
| `hotel` | `hotel` | ที่พัก |
| `transport` | `transport` | — |
| `shopping` | `other` | — |

> `shopping` → `other` ตามตารางเดิมของแอป แปลว่าตลาดกลางคืนจะไม่ถูกนับเป็น "ที่เที่ยว"
> ถ้าอยากให้นับ ต้องแก้ `EXTERNAL_TO_ACTIVITY_CATEGORY` ซึ่งกระทบหน้าอื่นที่ใช้ตารางนี้ด้วย
> — แยกเป็นอีกเรื่อง ไม่ใช่เงื่อนไขของงานนี้
