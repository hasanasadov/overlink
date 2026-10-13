# Overlink

Fayl, kod və ekran paylaşımı — qısa linklə. (File, code & screen sharing with short links.)
Müəllif / Author: **Hasanali Asadov** — [asadov.vercel.app](https://asadov.vercel.app)

| Bölmə | Link | Texnologiya |
|---|---|---|
| Fayl paylaşımı | `/f/abc123` | Cloudflare R2 + Neon Postgres, bitmə vaxtı ilə avtomatik silinmə |
| Kod paylaşımı | `/c/abc123` | Yjs + CodeMirror 6, canlı kursor/seçim, 16 dil |
| Ekran paylaşımı | `/s/abc12` | WebRTC (mesh), ekran + səs, çat, parol, çox təqdimatçı |

Hesab (e-poçt + parol, parol sıfırlama Resend ilə), AZ/EN/RU, işıqlı/qaranlıq rejim.

## İşə salmaq

```bash
cp .env.example .env      # dəyərləri doldurun
npm install
npx prisma db push        # Neon-da cədvəlləri yaradır
npm run dev               # http://localhost:3100
```

Production: `npm run build && npm start` (və ya `Dockerfile`).

> **Vacib:** Layihə öz Node serveri (`server/index.ts`) ilə işləyir — Next.js + WebSocket (`/ws/code/*`, `/ws/room/*`)
> bir prosesdə. Buna görə **Vercel serverless-də işləməz**; Railway / Fly.io / Render / VPS (Docker) istifadə edin.
> Real vaxt otaqları prosesin yaddaşındadır — tək instansiya kimi işlədin.

## Mühit dəyişənləri

`.env.example`-a baxın. Əsasları: `DATABASE_URL`, `DIRECT_URL` (Neon), `R2_*` (Cloudflare R2), `RESEND_API_KEY`,
`EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL` (canonical/sitemap üçün real domen), `CRON_SECRET`.
`NEXT_PUBLIC_ICE_SERVERS` — ciddi NAT/korporativ şəbəkələr üçün TURN server (JSON).

## Bitmə vaxtı və təmizləmə

Server hər dəqiqə `cleanupExpired()` işlədir: vaxtı bitmiş paylaşımlar əvvəlcə R2-dən, sonra Postgres-dən silinir
(yarımçıq yükləmələr 1 saatdan sonra). Əlavə olaraq xarici cron üçün:
`POST /api/cron/cleanup` + `Authorization: Bearer $CRON_SECRET`.

## Limitlər (`.env`-dən dəyişir)

Qeydiyyatsız: fayl başına 200 MB, ən çox 7 gün. Hesabla: 2 GB, 30 günə qədər.
Ekran paylaşımı mesh-dir (hər təqdimatçı hər izləyiciyə birbaşa göndərir) — ~10-15 izləyiciyə qədər rahatdır;
daha çoxu üçün SFU (məs. LiveKit) lazımdır.
