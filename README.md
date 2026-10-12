# Venola (Ops-OS)

SaaS tabanlı operasyon ve işletme yönetim sistemi (ERP).

## Özellikler

- **Çok Kiracılı Mimari (Multi-tenant):** İzole işletme yönetimi ve yetkilendirme.
- **Stok & Hareket Defteri (Event-Ledger):** Append-only mantığıyla çalışan hareket geçmişi ve bakiye takibi.
- **Reçete & Üretim Yönetimi (BOM):** Reçete tanımlama, gerçek zamanlı maliyet hesaplama ve üretim akışları.
- **Sipariş & Satış Yönetimi:** Satış emirleri, faturalandırma ve otomatik stok/finans entegrasyonu.
- **Cari Hesaplar:** Kasa, banka, müşteri ve tedarikçi hesapları, cari ekstre ve bakiye dökümü.

## Teknolojiler

- Next.js (App Router, Turbopack)
- TypeScript
- tRPC
- Prisma ORM & PostgreSQL
- NextAuth.js
- TanStack React Query

## Kurulum ve Çalıştırma

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Ortam değişkenlerini ayarlayın:
```bash
cp .env.example .env
```
`.env` dosyasındaki veritabanı ve auth ayarlarını güncelleyin.

3. Veritabanı şemasını uygulayın:
```bash
npx prisma db push
```

4. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.
