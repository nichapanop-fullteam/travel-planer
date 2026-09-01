# Remix Trip — Day 2 (พรุ่งนี้): tab / sort / ปิดงาน

**เงื่อนไขเริ่ม:** Day 1 เสร็จแล้ว — `/remix` ใช้ `listTrips()` + `RealTripCard` ไม่มี mock เหลือ
**เป้าหมาย:** tab กดได้จริง, rail Top Remixes มีความหมาย, เทสต์ครบ, commit + push

⚠️ วันนี้มี **ข้อตัดสินใจ 3 ข้อ** ที่ต้องเคาะก่อนลงมือ (§0) ไม่ใช่งาน mechanical ล้วนเหมือน Day 1

---

## §0 เคาะก่อน (30 นาทีแรก)

### ตัดสินใจ 1 — tab หมวดหมู่จะเอายังไง

tab ปัจจุบันใน `src/app/remix/page.tsx` คือ **แลนด์มาร์ค / Activity / Restaurant**
แต่ `/main` filter ด้วย `trip.tags` (case-insensitive) บน vocabulary คนละชุด:

```
type Category = "thailand" | "japan" | "nature" | "food" | "weekend"
```

→ ดู `src/app/main/page.tsx:20` และ `CATEGORY_FILTERS` บรรทัด 27

**ปัญหาจริง:** แลนด์มาร์ค/Activity/Restaurant เป็นหมวดของ *สถานที่* ไม่ใช่ของ *ทริป* — `BackendTripListItem` ไม่มี field ไหนรองรับเลย `tags` เป็น free-form จาก create-trip wizard

ทางเลือก:

| ทาง | ได้อะไร | เสียอะไร |
|---|---|---|
| **A. ใช้ vocabulary เดียวกับ `/main`** | ทำได้วันนี้ทันที, filter ทำงานจริง, สองหน้าสอดคล้องกัน | ไม่ตรง design |
| **B. ซ่อน 3 tab นี้ไปก่อน** เหลือ For you / Top Remixes | ซื่อสัตย์ที่สุด ไม่มี tab ที่กดแล้วไม่เกิดอะไร | หน้าดูโล่ง |
| **C. เพิ่ม category ใน backend** | ตรง design | ต้องแก้ entity + migration — **ทำไม่ได้** (ดู §ข้อจำกัด ด้านล่าง) |

> **แนะนำ A** — ได้ filter ที่ทำงานจริงภายในวันนี้ และไม่สร้างหนี้ vocabulary ชุดที่สอง
> ถ้าเลือก B ให้ลบ tab ออกจริงๆ อย่าปล่อยไว้แบบกดไม่ได้

### ตัดสินใจ 2 — search: client หรือ server

`listTrips(destination?)` มี server-side partial match (case-insensitive, รองรับภาษาไทย) อยู่แล้ว
ช่องค้นหาปัจจุบัน filter ฝั่ง client ทั้ง `title` + `location`

- **client** — ค้นได้ทั้งชื่อทริปและปลายทาง, ไม่มี network ต่อการพิมพ์ แต่ค้นได้แค่ในหน้าที่โหลดมาแล้ว
- **server** — ครอบทุกทริป แต่ match แค่ `destination` ไม่ match `title` และต้องทำ debounce

> **แนะนำ client ไปก่อน** จนกว่าจำนวนทริปจะเกินหน้าเดียว

### ตัดสินใจ 3 — rail "Top Remixes"

เรียง `remixCount` จากมากไปน้อย ฝั่ง client แล้วตัด top N (`remixCount` อยู่บน list row จริง ไม่ต้อง detail fetch)

- [ ] เคาะ N (แนะนำ 8)
- [ ] เคาะเกณฑ์ตัดขั้นต่ำ — ทริป `remixCount: 0` ไม่ควรติด "Top Remixes"

---

## §1 งานหลัก

### 1.1 Tabs

- [ ] ทำตามที่เคาะในตัดสินใจ 1
- [ ] ถ้าเลือก A: ลอกตรรกะ `categoryCounts` จาก `src/app/main/page.tsx:128` มาใช้ — badge จำนวนต่อ tab ทำให้ tab ที่ว่างบอกตัวเองได้ ไม่ใช่กดแล้วเงียบ
- [ ] tab `By Creator` — ต้องมี `ownerId` หรือ `customer` ใน list DTO ก่อน **ยังทำไม่ได้** → ลบ tab ออก หรือทำเป็นงาน backend แยก (ดู §3)

### 1.2 Top Remixes rail

- [ ] sort `remixCount` desc + ตัด N + เกณฑ์ขั้นต่ำ ตามที่เคาะ
- [ ] badge "Top Remix" บนการ์ด: `RealTripCard` มีแต่ badge `รีมิกซ์` ซึ่งแปลว่า *ทริปนี้เกิดจากการ remix* (เช็คจาก `sourceTripId`) — **คนละความหมายกับ "ถูก remix เยอะ"**
  - เพิ่ม prop opt-in เช่น `topRemix?: boolean` ใน `RealTripCard` แล้วให้ชนะ slot เดียวกับ badge `รีมิกซ์` (slot อยู่ที่ `RealTripCard.tsx:252`)
  - ⚠️ `RealTripCard` ใช้ร่วมกับ `/main`, `/saved`, `/my-trips` — prop ต้อง opt-in default `false` เท่านั้น ห้ามเปลี่ยน default behavior

### 1.3 เก็บหนี้ `isOwn` จาก Day 1

Day 1 ส่ง `isOwn={false}` ค้างไว้ → คนที่ login เห็นปุ่ม bookmark บนทริปตัวเอง ซึ่งไม่ใช่ action จริง

- [ ] แก้ที่ต้นทาง: เพิ่ม `ownerId` เข้า `TripListItemResponseDto` ฝั่ง backend (แก้ DTO อย่างเดียว ไม่แตะ entity/migration — ปลอดภัย) แล้วเพิ่มใน `BackendTripListItem` (`src/lib/trips-api.ts:45`)
- [ ] แก้ได้ทีเดียวปลด **สองอย่าง**: `isOwn` ที่ถูกต้อง + tab `By Creator`

---

## §2 เทสต์และปิดงาน

- [ ] เขียนเทสต์ `src/app/remix/__tests__/` — ลอกรูปแบบ mock API จาก `src/app/generated-plan/__tests__/remix-detail.test.tsx`
  - โหลด `/remix` แล้วการ์ดขึ้นจาก `listTrips` ที่ mock ไว้
  - กด tab แล้วรายการหดจริง
  - rail Top Remixes เรียงตาม `remixCount`
- [ ] `npx tsc --noEmit`
- [ ] `npx vitest run` — baseline **74 tests / 14 files** + ของใหม่
- [ ] browser: `/remix` → กด tab → กดการ์ด → เข้าหน้า trip → กด "นำไปปรับเป็นทริปของฉัน" ได้จริง (ทดสอบว่า discovery ต่อกับ remix flow เดิมได้ครบวง)
- [ ] `git add` + commit — งาน remix ทั้งหมดยัง untracked
- [ ] `git push` — branch `feature/aom-continue-work` ตอนนี้นำ `origin/feature/aom-continue-work` อยู่ **6 commits** จาก merge main เมื่อวันที่ 2026-08-31 ที่ยังไม่ได้ push

---

## §3 งานที่เกินสองวันนี้ (ไม่ต้องทำ)

- endpoint `GET /trips/remixable` แยกจาก `GET /trips` — ยังไม่จำเป็น `GET /trips` filter `visibility=public` ให้แล้ว
- pagination — `listTrips` ไม่มี limit/offset จะเจอปัญหาก็ต่อเมื่อทริป public เยอะจริง
- sort param ฝั่ง server — client-side พอสำหรับตอนนี้
- category field ใน backend (ตัดสินใจ 1 ทาง C)

---

## ⚠️ ข้อจำกัดที่ต้องจำ — pluno-service

- **ห้ามรัน `migration:generate`** — Init migration ของ DB `pluno` หายไป DB recreate ไม่ได้อีกแล้ว
- **ห้ามรัน `npm run lint`**
- แก้ **DTO อย่างเดียว** ปลอดภัย (ไม่กระทบ schema) — เพิ่ม `ownerId` เข้า `TripListItemResponseDto` ใน §1.3 จึงทำได้
- โครงสร้าง NestJS ต้องเป็น 4 ชั้น `api / manager / model / store` เสมอ
- trips API รันที่ port **4002**
