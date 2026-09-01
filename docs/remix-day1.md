# Remix Trip — Day 1 (วันนี้): ต่อ /remix เข้าข้อมูลจริง

**เป้าหมายวันนี้:** หน้า `/remix` เลิกใช้ mock ทั้งหมด คลิกการ์ดแล้วเข้าทริปจริงได้ ปุ่ม save ยิง API จริง
**ขอบเขต:** frontend อย่างเดียว ไม่แตะ backend ไม่มีข้อตัดสินใจค้าง — งานทั้งหมดในไฟล์นี้ทำได้เลย

---

## บริบทที่ต้องรู้ก่อนเริ่ม

remix **ทีละทริป** เสร็จ end-to-end แล้ว อย่าไปแตะ:

- Backend: `POST /trips/:sourceTripId/remix` มี idempotency ledger (`trip_remix_requests`), locked transaction, `PlanMode.REMIXED`, increment `remixCount`
- Frontend: `useRemixTrip`, `RemixSetupDialog`, `lib/pending-remix.ts`, attribution banner, เทสต์ครบใน `src/app/generated-plan/__tests__/remix-detail.test.tsx`

**สิ่งเดียวที่ยังปลอมคือหน้า discovery** `src/app/remix/page.tsx` (untracked, ยังไม่ commit)

### ของจริงที่มีอยู่แล้วและต้องใช้แทน mock

| ต้องการ | ของจริงที่มี |
|---|---|
| รายการทริป public | `listTrips()` ใน `src/lib/trips-api.ts` — `GET /trips` คืนเฉพาะ `visibility=public` อยู่แล้ว |
| การ์ด | `RealTripCard` (`src/components/consumer/RealTripCard.tsx`) |
| layout grid | `TRIP_GRID_CLASS` จาก `src/lib/feed-layout.ts` — ใช้อยู่แล้ว ✅ |
| header | `FrostedTopNav` (`src/components/consumer/FrostedTopNav.tsx`) — main เพิ่ง extract ออกมา |

`RealTripCard` ทำสิ่งที่ `RemixTripCard` ปลอมไว้ครบแล้ว:
save/unsave จริง (`POST/DELETE /trips/:id/save`), like จริง, creator chip `@username` จาก detail fetch,
ราคา/คน จาก `totalBudget ÷ groupSize` จริง (ไม่โชว์ถ้าไม่มีข้อมูล), cover fallback ไป gallery,
badge `remixCount` — และ main เพิ่งเพิ่ม `src/components/consumer/__tests__/RealTripCard.test.tsx` ให้แล้ว

---

## Checklist

### 1. ลบ mock layer ทิ้ง

- [ ] ลบ `src/lib/remix-feed-data.ts`
- [ ] ลบ `src/components/consumer/RemixTripCard.tsx`

> ทั้งสองไฟล์ยัง untracked → ลบได้เลย ไม่ต้องผ่าน git

### 2. ต่อ `src/app/remix/page.tsx` เข้า `listTrips()`

- [ ] เปลี่ยน state จาก `mockRemixTrips` เป็น `BackendTripListItem[]` + `loading` / `error`
- [ ] fetch ใน `useEffect` — ลอกรูปแบบจาก `src/app/main/page.tsx` (ตัว fetch feed) ไม่ต้องคิดใหม่
- [ ] render ด้วย `RealTripCard` ใน `TRIP_GRID_CLASS`
- [ ] ส่ง `isOwn={trip.ownerId === backendUser?.id}` — ต้องใช้ `useAuth()`
  - ⚠️ `BackendTripListItem` **ไม่มี `ownerId`** → Day 1 ส่ง `isOwn={false}` ไปก่อน (ผลคือเห็นปุ่ม bookmark บนทริปตัวเอง) แล้วไปแก้ที่ต้นทางใน Day 2
- [ ] state ว่าง / error: มี empty state อยู่แล้วที่บรรทัด ~154 (`ไม่พบทริปที่ตรงกับการค้นหา`) เพิ่ม loading + error ให้ครบ

### 3. ปัญหาที่หายไปเองหลังต่อข้อมูลจริง

- [ ] ลิงก์การ์ดพัง — เดิมชี้ `/generated-plan/feed-tokyo-5d` ซึ่งเป็น id ปลอม พอใช้ id จริงก็หายเอง
- [ ] ปุ่ม bookmark ที่เป็น `useState` เฉยๆ — `RealTripCard` ยิง API จริงให้แล้ว

### 4. เปลี่ยน header เป็น `FrostedTopNav`

- [ ] ลบ header ที่เขียนเองบรรทัด 50–82 ของ `src/app/remix/page.tsx` ทิ้ง ใช้ `FrostedTopNav` แทน

> main เพิ่ง extract component นี้ออกมาจาก `/main` ในคอมมิต `e93d52b` ถ้าปล่อยไว้ header จะแตกเป็นสองสายทันทีที่มีคนแก้ตัวใดตัวหนึ่ง

### 5. ตรวจงาน

- [ ] `npx tsc --noEmit`
- [ ] `npx vitest run` — baseline หลัง merge คือ **74 tests / 14 files ผ่านหมด** ต้องไม่ต่ำกว่านี้
- [ ] เปิด `/remix` ใน browser: การ์ดขึ้นจากข้อมูลจริง, คลิกแล้วเข้าหน้า trip ได้, กด bookmark แล้ว network มี `POST /trips/:id/save`

---

## สิ่งที่ **ไม่ต้อง** ทำวันนี้ (ยกไป Day 2)

ทั้งหมดนี้มีข้อตัดสินใจหรือต้องแก้ backend — อย่าเริ่มวันนี้:

- tab `แลนด์มาร์ค / Activity / Restaurant` — vocabulary ไม่ตรงกับ `trip.tags` ที่มีจริง
- tab `By Creator` — ต้องมี `ownerId` ใน list DTO ก่อน
- rail `Top Remixes` — ต้องตัดสินใจว่าเรียง client-side หรือขอ sort param
- badge `Top Remix` บนการ์ด — `RealTripCard` มีแต่ badge `รีมิกซ์` (= ทริปนี้เกิดจากการ remix) คนละความหมาย ต้องเพิ่ม prop ใหม่
- commit / push

**Day 1 จบเมื่อ:** `/remix` ไม่มีข้อมูลปลอมเหลืออยู่เลย tab ยังกดไม่ได้ก็ไม่เป็นไร
