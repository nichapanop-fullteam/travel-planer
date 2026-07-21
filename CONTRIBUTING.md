# คู่มือทำงานร่วมกัน — Pluno Prototype

ไฟล์นี้เขียนไว้ให้คนที่ไม่ได้เขียนโค้ดเป็นหลัก (designer, PM, หรือใครก็ตามในทีม) สามารถ setup โปรเจกต์ แก้ไฟล์ และส่งงานผ่าน Git ได้โดยไม่ต้องรู้ทุกอย่างเกี่ยวกับ Next.js มาก่อน อ่านตามลำดับได้เลย

---

## 1. เตรียมเครื่อง (ทำครั้งเดียว)

โปรเจกต์นี้ต้องการ **Node.js เวอร์ชัน 20 ขึ้นไป** (แนะนำ 22)

```bash
node -v          # เช็คว่ามี node แล้วหรือยัง ต้องได้ v20 ขึ้นไป
```

ถ้าไม่มีหรือเวอร์ชันเก่าเกินไป แนะนำติดตั้งผ่าน [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install 22
nvm use 22
```

## 2. Clone โปรเจกต์ครั้งแรก

```bash
git clone git@github.com:nichapanop-fullteam/travel-planer.git
cd travel-planer
npm install        # โหลด dependency ทั้งหมด ทำครั้งแรกครั้งเดียว (หรือทุกครั้งที่ package.json เปลี่ยน)
```

## 3. รันโปรเจกต์ดูบนเครื่องตัวเอง

```bash
npm run dev
```

แล้วเปิดเบราว์เซอร์ไปที่ **http://localhost:3000** — พอแก้ไฟล์แล้วเซฟ หน้าเว็บจะอัปเดตให้อัตโนมัติ ไม่ต้อง restart

---

## 4. โครงสร้างโปรเจกต์ (อยู่ตรงไหน แก้อะไร)

```
src/
├─ app/                     ← แต่ละโฟลเดอร์ = 1 หน้าเว็บ (Next.js "App Router")
│  ├─ page.tsx              ← หน้าแรก (เด้งไป /dashboard)
│  ├─ dashboard/page.tsx    ← หน้ารวมทริปทั้งหมด
│  ├─ plan/[tripId]/page.tsx← หน้าสร้าง/แก้แผนทริป (Plan Builder)
│  └─ share/[tripId]/page.tsx← หน้าแชร์แผนให้ลูกค้าดู (อ่านอย่างเดียว)
│
├─ components/
│  ├─ ui/                   ← ชิ้นส่วน UI พื้นฐาน ใช้ได้ทุกหน้า (Button, Card, Badge)
│  └─ plan/                 ← ชิ้นส่วนเฉพาะหน้า Plan (BudgetPanel, MapPanel)
│
├─ lib/                     ← ฟังก์ชันช่วยคำนวณ/format (ไม่ใช่หน้าเว็บ ไม่ใช่ UI)
│  ├─ mock-data.ts          ← ข้อมูลทริปตัวอย่างทั้งหมด (ยังไม่มี backend จริง)
│  ├─ trip-utils.ts         ← คำนวณงบ, format วันที่/ราคา
│  └─ category-styles.ts    ← สีและชื่อหมวดกิจกรรม (เดินทาง/อาหาร/ที่พัก ฯลฯ)
│
└─ types/index.ts           ← นิยาม "หน้าตาข้อมูล" ของทั้งแอป (ดูหัวข้อ 5)
```

**กติกาง่ายๆ:** ถ้าจะเพิ่มปุ่ม/การ์ด/badge ใหม่ที่ใช้ได้หลายหน้า → ใส่ใน `components/ui/`
ถ้าเป็นชิ้นส่วนที่ผูกกับหน้า Plan โดยเฉพาะ → ใส่ใน `components/plan/`
ถ้าเป็นแค่หน้าใหม่ → สร้างโฟลเดอร์ใหม่ใน `app/`

---

## 5. ข้อมูล (State) อยู่ตรงไหน — สำคัญมาก

โปรเจกต์นี้ **ยังไม่มี backend/ฐานข้อมูลจริง** ข้อมูลทั้งหมดตอนนี้เป็น "ของปลอม" (mock data) เพื่อให้ทำ prototype ได้เร็ว โครงสร้างมี 2 ชั้น:

1. **`src/types/index.ts`** — นิยามว่า "ทริป 1 ทริป" หน้าตาเป็นยังไง (มี `title`, `destination`, `days`, แต่ละ `day` มี `activities` ฯลฯ) ทุกคนต้องใช้ type เดียวกันนี้ ห้ามสร้างโครงสร้างข้อมูลใหม่ของตัวเองแยกไปคนละแบบ

2. **`src/lib/mock-data.ts`** — ข้อมูลตัวอย่างจริงๆ (มี 3 ทริป) ทุกหน้าดึงข้อมูลจากไฟล์นี้ที่เดียว ผ่านฟังก์ชัน `getTripById()` หรือ `mockTrips`

**ถ้าจะเพิ่ม field ใหม่ในข้อมูลทริป** (เช่นอยากเพิ่มรูปภาพ, note พิเศษ) → ไปแก้ที่ `types/index.ts` ก่อน แล้วค่อยเพิ่มข้อมูลจริงใน `mock-data.ts` ห้ามเพิ่ม field มั่วในหน้าใดหน้าหนึ่งเฉยๆ เพราะหน้าอื่นจะมองไม่เห็นข้อมูลนั้น

**ถ้าต้องมี "state" แบบโต้ตอบได้** (เช่น กดปุ่มแล้วฟอร์มเปิด, พิมพ์แล้วอัปเดตหน้าจอทันที) — ให้ใช้ `useState` ของ React ในไฟล์นั้นๆ ไปเลย โดยต้องใส่ `"use client"` บรรทัดแรกสุดของไฟล์ (ปกติไฟล์ในนี้เป็น Server Component ที่ไม่มี state แบบโต้ตอบ) อย่าพยายามทำ state กลางที่ใช้ร่วมกันทั้งแอปในตอนนี้ ยังไม่จำเป็นสำหรับ prototype

---

## 6. ใครแก้ไฟล์ไหน (ลดโอกาสชนกัน)

| คน | โฟลเดอร์หลัก |
|---|---|
| A — Plan Builder | `src/app/plan/` |
| B — Map + Budget | `src/components/plan/BudgetPanel.tsx`, `MapPanel.tsx` |
| C — Dashboard + Share | `src/app/dashboard/`, `src/app/share/` |
| ทุกคนร่วมกัน (แก้ได้ แต่บอกในทีมก่อน) | `src/types/`, `src/lib/`, `src/components/ui/` |

---

## 7. Tailwind CSS ใช้ยังไงในโปรเจกต์นี้

โปรเจกต์นี้ไม่มีไฟล์ CSS แยกทีละหน้า — ใส่สไตล์ผ่าน `className` ตรงๆ ในโค้ด เช่น

```tsx
<div className="flex items-center gap-2 rounded-2xl p-4 bg-[var(--color-surface)]">
```

- `flex items-center gap-2` = จัด layout (ทั้งหมดคือ utility class ของ Tailwind)
- `bg-[var(--color-surface)]` = ใช้สีจาก design system กลางที่กำหนดไว้ใน **`src/app/globals.css`** (อย่า hardcode สี hex ใหม่ในหน้าแต่ละหน้า ให้ไปเพิ่ม token ที่ globals.css แทน แล้วเรียกผ่าน `var(--color-xxx)`)

อ้างอิง: [Tailwind CSS Docs](https://tailwindcss.com/docs) — โดยเฉพาะหน้า [Utility-First Fundamentals](https://tailwindcss.com/docs/styling-with-utility-classes) ถ้าไม่คุ้นกับแนวคิดนี้

## 8. Next.js ใช้ยังไงในโปรเจกต์นี้

- ทุกโฟลเดอร์ใน `src/app/` ที่มี `page.tsx` = 1 หน้าเว็บ 1 URL (เรียกว่า **App Router**)
- โฟลเดอร์ที่ชื่อมี `[ ]` เช่น `plan/[tripId]/` = หน้าที่ URL เปลี่ยนได้ตามพารามิเตอร์ (เช่น `/plan/trip-osaka-4d3n`)
- ไฟล์ `page.tsx` ส่วนใหญ่ในโปรเจกต์นี้เป็น **Server Component** (ไม่มี `"use client"` บนสุด) แปลว่ารันแล้วส่ง HTML สำเร็จรูปมาเลย ไม่มี state โต้ตอบ ถ้าต้องการ interactive (เช่น dropdown, form) ต้องเติม `"use client"` ที่บรรทัดแรกของไฟล์

อ้างอิง: [Next.js App Router Docs](https://nextjs.org/docs/app) — โดยเฉพาะหน้า [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

---

## 9. วิธีใช้ Git แบบ step-by-step (สำหรับคนไม่เคยใช้)

### ก่อนเริ่มงานทุกครั้ง — ดึงของล่าสุดมาก่อน

```bash
git checkout main
git pull
```

### เริ่มงานใหม่ — สร้าง branch ของตัวเอง

ตั้งชื่อ branch สื่อว่าทำอะไร เช่น `feature/plan-builder-ui`, `fix/budget-total`

```bash
git checkout -b feature/ชื่องานที่ทำ
```

### แก้โค้ด → เช็คว่าแก้ไฟล์ไหนไปบ้าง

```bash
git status
```

### บันทึกงาน (commit)

```bash
git add .
git commit -m "อธิบายสั้นๆ ว่าทำอะไร เช่น: เพิ่มปุ่มลบกิจกรรมในหน้า Plan"
```

### ส่งขึ้น GitHub

```bash
git push -u origin feature/ชื่องานที่ทำ
```

ครั้งแรกที่ push branch นั้นต้องมี `-u origin ชื่อ branch` ครั้งต่อไปพิมพ์ `git push` เฉยๆ ได้เลย

### เปิด Pull Request (PR)

หลัง push แล้ว เข้า GitHub repo → จะมีปุ่ม "Compare & pull request" ขึ้นมาเอง → กด → เขียนอธิบายว่าทำอะไร → ส่งให้เพื่อนในทีมช่วยดูก่อน merge เข้า `main`

### ⚠️ กติกาที่ต้องจำ

- **ห้าม commit ตรงเข้า `main` ทันที** ให้ทำงานใน branch ของตัวเองเสมอ แล้วเปิด PR
- **ก่อนเริ่มงานใหม่ทุกครั้ง** ให้ `git pull` ที่ `main` ก่อน แล้วค่อย `git checkout -b` branch ใหม่ จะได้ไม่ทำงานบนโค้ดเก่า
- ถ้า `git status` ขึ้นไฟล์ที่ไม่ได้ตั้งใจแก้ (เช่น `node_modules`, `.next`) **อย่า commit** — ไฟล์พวกนี้ถูกกัน (ignore) ไว้แล้วปกติ ถ้าโผล่มาให้ถามในทีมก่อน

---

## 10. ติดปัญหา?

- `npm install` แล้ว error เรื่อง node version → เช็ค `node -v` ต้อง 20 ขึ้นไป (ดูข้อ 1)
- หน้าเว็บพัง/ขาว → เปิด terminal ที่รัน `npm run dev` ดู error message สีแดง มักบอกชื่อไฟล์+บรรทัดที่ผิด
- ไม่รู้จะแก้ไฟล์ไหน → ดูตารางข้อ 6 ก่อน ถ้ายังไม่ชัวร์ ถามในกลุ่มทีมก่อนแก้
