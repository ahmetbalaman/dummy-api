# 🚀 Hızlı Başlangıç Rehberi

## Gereksinimler

- Node.js 18+
- MongoDB 7+
- npm veya yarn

## Kurulum Adımları

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Environment Ayarları

```bash
cp .env.example .env
```

`.env` dosyasını düzenle:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/loyalty-system
JWT_SECRET=super-secret-key-change-this
JWT_EXPIRES_IN=7d
```

### 3. MongoDB'yi Başlat

**Yerel MongoDB:**
```bash
mongod
```

**Docker ile:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7
```

### 4. Veritabanını Seed Et

```bash
npm run seed
```

Bu komut örnek veriler oluşturur:
- 1 Admin kullanıcı
- 2 İşletme
- 2 Mobil kullanıcı
- Ürünler, kategoriler, siparişler

### 5. Sunucuyu Başlat

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Sunucu `http://localhost:3000` adresinde çalışacak.

## Test Kullanıcıları

### Admin
- Email: `admin@system.com`
- Şifre: `admin123`

### İşletme
- Email: `info@kahvedukkani.com`
- Şifre: `business123`

### Mobil Kullanıcılar
OAuth ile giriş yapıyorlar (Google/Apple)

## API Test Etme

### 1. Health Check

```bash
curl http://localhost:3000/health
```

### 2. Admin Login

```bash
curl -X POST http://localhost:3000/api/auth/admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@system.com",
    "password": "admin123"
  }'
```

Response'dan `token` değerini al.

### 3. İşletmeleri Listele

```bash
curl http://localhost:3000/api/admin/businesses \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. İşletme Login

```bash
curl -X POST http://localhost:3000/api/auth/business \
  -H "Content-Type: application/json" \
  -d '{
    "email": "info@kahvedukkani.com",
    "password": "business123"
  }'
```

### 5. İşletme Siparişlerini Görüntüle

```bash
curl http://localhost:3000/api/business/orders-tl \
  -H "Authorization: Bearer BUSINESS_TOKEN_HERE"
```

## Postman ile Test

1. `postman_collection.json` dosyasını Postman'e import et
2. "Admin Login" isteğini çalıştır (token otomatik kaydedilir)
3. Diğer endpoint'leri test et

## Docker ile Çalıştırma

```bash
# Tüm servisleri başlat
docker-compose up -d

# Logları görüntüle
docker-compose logs -f

# Seed çalıştır
docker-compose exec api npm run seed

# Durdur
docker-compose down
```

## Önemli Endpoint'ler

### Authentication
- `POST /api/auth/admin` - Admin girişi
- `POST /api/auth/business` - İşletme girişi
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/apple` - Apple Sign In

### Admin (Token gerekli)
- `GET /api/admin/businesses` - Tüm işletmeler
- `POST /api/admin/businesses` - İşletme oluştur
- `GET /api/admin/shipments` - Tüm kargolar
- `GET /api/admin/system` - Sistem istatistikleri

### Business (Token gerekli)
- `GET /api/business/me` - İşletme profili
- `GET /api/business/products-tl` - TL ürünleri
- `GET /api/business/orders-tl` - TL siparişleri
- `GET /api/business/analytics` - Analitikler

### Mobile (Token gerekli)
- `GET /api/mobile/businesses` - Tüm işletmeler
- `POST /api/mobile/order-tl` - TL sipariş oluştur
- `GET /api/mobile/orders-history` - Sipariş geçmişi
- `GET /api/mobile/loyalty/:businessId` - Puan bakiyesi

### Kiosk (Token gereksiz)
- `GET /api/kiosk/menu/:businessId` - Menü

## Sorun Giderme

### MongoDB bağlantı hatası
```bash
# MongoDB'nin çalıştığından emin ol
mongosh
```

### Port zaten kullanımda
`.env` dosyasında `PORT` değerini değiştir.

### Seed hatası
```bash
# Veritabanını temizle ve tekrar dene
mongosh loyalty-system --eval "db.dropDatabase()"
npm run seed
```

## Geliştirme İpuçları

1. **Hot Reload**: `npm run dev` ile nodemon otomatik restart yapar
2. **Logging**: Development'ta tüm istekler console'a yazılır
3. **Error Handling**: Tüm hatalar JSON formatında döner
4. **Rate Limiting**: API'de 15 dakikada 100 istek limiti var

## Sonraki Adımlar

1. OAuth provider'ları yapılandır (Google/Apple)
2. Production için JWT_SECRET değiştir
3. CORS ayarlarını production domain'e göre ayarla
4. Rate limiting değerlerini ayarla
5. Logging sistemi ekle (Winston, Morgan)
6. API documentation ekle (Swagger)

## Yardım

Sorun yaşarsan:
1. `npm run dev` çıktısını kontrol et
2. MongoDB loglarını kontrol et
3. `.env` dosyasının doğru olduğundan emin ol
