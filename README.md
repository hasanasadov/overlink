# Overlink

Fayl, kod və ekran paylaşımı — qısa linklə. (File, code & screen sharing with short links.)
Müəllif / Author: **Hasanali Asadov** — [asadov.vercel.app](https://asadov.vercel.app)

| Bölmə | Link | Texnologiya |
|---|---|---|
| Fayl paylaşımı | `/f/abc123` | Cloudflare R2 (birbaşa yükləmə) + Neon Postgres, bitmə vaxtı ilə avtomatik silinmə |
| Kod paylaşımı | `/c/abc123` | Yjs + CodeMirror 6 + Pusher, canlı kursor/seçim, 16 dil |
| Ekran paylaşımı | `/s/abc12` | WebRTC (mesh) + Pusher siqnalizasiya, ekran + səs, çat, parol, çox təqdimatçı |

Hesab (e-poçt + parol, parol sıfırlama Resend ilə), AZ/EN/RU, işıqlı/qaranlıq rejim.

Tətbiq tam serverless-dir — **Vercel-də işləyir** (öz WebSocket serveri yoxdur).

## Yerli işə salmaq

```bash
cp .env.example .env      # dəyərləri doldurun
npm install
npx prisma db push        # Neon-da cədvəlləri yaradır
npm run dev               # http://localhost:3100
```

## Vercel-ə yerləşdirmək

1. **Environment Variables** (Project → Settings): `.env.example`-dakı hamısı. `NEXT_PUBLIC_SITE_URL` = real saytın ünvanı.
2. **Pusher Channels** (pusher.com → Create app): App Keys-dən `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`,
   `NEXT_PUBLIC_PUSHER_CLUSTER`. **App Settings → "Enable client events" mütləq açıq olmalıdır.**
3. **R2 CORS** (Cloudflare → R2 → bucket → Settings → CORS policy), brauzer birbaşa R2-yə yükləsin deyə:

```json
[
  {
    "AllowedOrigins": ["https://SIZIN-DOMEN", "http://localhost:3100"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

4. `CRON_SECRET` təyin edin — `vercel.json` gündə bir dəfə `/api/cron/cleanup` çağırır (vaxtı bitmiş fayllar R2 və DB-dən silinir).
   Əlavə olaraq hər yeni yükləmədə də təmizləmə işləyir; vaxtı bitmiş linklər isə dərhal 404 verir.

## Limitlər

- Müddət: hazır seçimlər (1 saat … 30 gün), "Müddətsiz" və ya istənilən sayda saat/gün (fayllar üçün 10 ilə qədər). Daxil olmaq tələb olunmur.
- Fayl ölçüsü: qeydiyyatsız 200 MB, hesabla 2 GB (`.env`-dən dəyişir).
- Pusher pulsuz plan: 100 eyni vaxtda bağlantı, gündə 200 min mesaj. Kod redaktorunda hər yazı bütün iştirakçılara mesaj sayılır.
- Ekran paylaşımı mesh-dir (hər təqdimatçı hər izləyiciyə birbaşa göndərir) — ~10 izləyiciyə qədər rahatdır.
  Sərt NAT arxasında TURN lazım ola bilər (`NEXT_PUBLIC_ICE_SERVERS`).
- Otaq çatı yalnız qoşulduqdan sonrakı mesajları göstərir (tarixçə saxlanmır).
