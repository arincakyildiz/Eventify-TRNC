# Vercel API Test Rehberi

## 1. Browser Console ile Test

### Adımlar:
1. Vercel'de deploy edilmiş siteni aç
2. Browser'da **F12** tuşuna bas (Developer Tools)
3. **Console** tab'ına git
4. Şu komutları çalıştır:

```javascript
// API Base URL'i kontrol et
console.log('API Base URL:', window.EventifyAPI ? 'Available' : 'Not available');

// Health check
fetch('/api/health')
  .then(res => res.json())
  .then(data => console.log('Health Check:', data))
  .catch(err => console.error('Health Check Error:', err));

// Events listesi
fetch('/api/events')
  .then(res => res.json())
  .then(data => console.log('Events:', data))
  .catch(err => console.error('Events Error:', err));
```

## 2. Network Tab ile Test

1. **F12** → **Network** tab
2. Sayfada bir işlem yap (örneğin event listesi yükle)
3. Network tab'ında API isteklerini gör
4. Her isteğe tıkla ve kontrol et:
   - **Status**: 200 (başarılı) olmalı
   - **Response**: JSON data görmeli
   - **Headers**: CORS headers kontrol et

## 3. Vercel Dashboard'dan Test

1. Vercel Dashboard'a git
2. Projeni seç
3. **Functions** tab'ına git
4. **Logs** bölümünde API çağrılarını gör
5. Hata varsa burada görünecek

## 4. Postman/curl ile Test

### Health Check:
```bash
curl https://your-project.vercel.app/api/health
```

### Events List:
```bash
curl https://your-project.vercel.app/api/events
```

### Admin Login:
```bash
curl -X POST https://your-project.vercel.app/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@eventify.trnc","password":"admin123"}'
```

## 5. Frontend'den Test

### Browser Console'da:
```javascript
// API'nin yüklendiğini kontrol et
if (window.EventifyAPI) {
  console.log('✅ EventifyAPI loaded');
  
  // Health check
  window.EventifyAPI.checkHealth()
    .then(result => console.log('Health:', result))
    .catch(err => console.error('Health Error:', err));
    
  // Events test
  window.EventifyAPI.Events.getAll()
    .then(data => console.log('Events:', data))
    .catch(err => console.error('Events Error:', err));
} else {
  console.error('❌ EventifyAPI not loaded');
}
```

## 6. Yaygın Sorunlar ve Çözümleri

### Sorun: "Failed to fetch" veya CORS hatası
**Çözüm**: 
- Backend'de `CORS_ORIGIN` environment variable'ına frontend URL'ini ekle
- Vercel'de environment variables'ı kontrol et

### Sorun: "Route not found"
**Çözüm**:
- `vercel.json` routing yapılandırmasını kontrol et
- `/api/*` route'larının `api/index.js`'e yönlendirildiğinden emin ol

### Sorun: "Cannot connect to MongoDB"
**Çözüm**:
- `MONGODB_URI` environment variable'ını kontrol et
- MongoDB Atlas Network Access'te IP whitelist'i kontrol et

### Sorun: "Unauthorized" veya 401 hatası
**Çözüm**:
- Token'ın doğru gönderildiğini kontrol et
- JWT_SECRET'ın doğru olduğundan emin ol

## 7. Hızlı Test Scripti

Browser console'da çalıştır:

```javascript
async function testVercelAPI() {
  console.log('🧪 Testing Vercel API...\n');
  
  const baseURL = window.location.origin;
  
  // Test 1: Health Check
  try {
    const health = await fetch(`${baseURL}/api/health`);
    const healthData = await health.json();
    console.log('✅ Health Check:', healthData);
  } catch (err) {
    console.error('❌ Health Check Failed:', err);
  }
  
  // Test 2: Events
  try {
    const events = await fetch(`${baseURL}/api/events`);
    const eventsData = await events.json();
    console.log('✅ Events:', eventsData);
  } catch (err) {
    console.error('❌ Events Failed:', err);
  }
  
  // Test 3: API Client
  if (window.EventifyAPI) {
    try {
      const isHealthy = await window.EventifyAPI.checkHealth();
      console.log('✅ API Client Health:', isHealthy);
    } catch (err) {
      console.error('❌ API Client Failed:', err);
    }
  } else {
    console.error('❌ EventifyAPI not available');
  }
}

// Çalıştır
testVercelAPI();
```

