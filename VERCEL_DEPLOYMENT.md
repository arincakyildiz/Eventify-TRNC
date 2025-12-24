# Vercel Deployment Guide

## Backend ve Frontend Ayrı Deployment

Eğer backend ve frontend Vercel'de ayrı projeler olarak deploy ediliyorsa:

### 1. Backend Deployment
- Backend'i ayrı bir Vercel projesi olarak deploy et
- Backend URL'i: `https://your-backend-api.vercel.app`

### 2. Frontend Deployment
- Frontend'i deploy et
- `index.html` dosyasında `data-api-base-url` attribute'una backend URL'ini ekle:

```html
<body data-api-base-url="https://your-backend-api.vercel.app">
```

### 3. Environment Variables
Backend'de şu environment variable'ları ayarla:
- `CORS_ORIGIN`: Frontend URL'ini ekle (örn: `https://your-frontend.vercel.app`)
- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: JWT secret key
- `ADMIN_EMAIL`: Admin email
- `ADMIN_PASSWORD`: Admin password

## Monorepo Deployment (Aynı Proje)

Eğer backend ve frontend aynı Vercel projesinde deploy ediliyorsa:

### 1. Vercel.json Yapılandırması
`vercel.json` dosyasına backend route'larını ekle:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/server/server.js"
    }
  ]
}
```

### 2. Build Settings
- Root Directory: `.` (proje root)
- Build Command: `cd server && npm install`
- Output Directory: `.` (frontend dosyaları root'ta)

## Sorun Giderme

### Görsel Yükleme Çalışmıyor
1. Browser console'u aç (F12)
2. Network tab'ında upload request'ini kontrol et
3. Hata mesajını kontrol et
4. API URL'inin doğru olduğundan emin ol

### CORS Hatası
1. Backend'de `CORS_ORIGIN` environment variable'ına frontend URL'ini ekle
2. Vercel'de environment variable'ları güncelle
3. Backend'i yeniden deploy et

### API Bağlantı Hatası
1. Backend'in çalıştığını kontrol et: `https://your-backend-api.vercel.app/api/health`
2. Frontend'de `data-api-base-url` attribute'unun doğru olduğundan emin ol
3. Browser console'da API URL'ini kontrol et

