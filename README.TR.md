# 🎯 Loyalty System API - Türkçe Dokümantasyon

## Proje Hakkında

Bu proje, dummy JSON dosyalarından gerçek bir **Node.js REST API**'ye dönüştürülmüş, çok kiracılı (multi-tenant) bir sadakat ve koleksiyon yönetim sistemidir.

### Özellikler

✅ **Rol Bazlı Kimlik Doğrulama**
- Admin: Sistem yönetimi
- İşletme: Kendi verilerini yönetir
- Kullanıcı: Mobil uygulama kullanıcısı

✅ **OAuth Desteği**
- Google Sign In
- Apple Sign In

✅ **Çift Ekonomi Sistemi**
- TL Ekonomisi: Gerçek para, puan kazandırır
- Puan Ekonomisi: Sadakat puanları, puan kazandırmaz

✅ **Multi-Tenant İzolasyon**
- Her işletme bağımsız hesap
- Veriler businessId ile filtrelenir
- Puanlar işletmeye özel

✅ **Koleksiyon Yönetimi**
- Admin koleksiyon setleri oluşturur
- İşletmelere kargolar
- Kargo takip sistemi

✅ **Analitikler**
- Satış istatistikleri
- En çok satanlar
- Gelir raporları

## Teknolojiler

- **Node.js** - Runtime
- **Express.js** - Web framework
- **MongoDB** - Veritabanı
- **Mongoose** - ODM
- **JWT** - Token authentication
- **bcryptjs** - Şifre hashleme
- **Google Auth Library** - Google OAuth
- **Apple Sign In** - Apple authentication

## Kurulum

### Hızlı Başlangıç

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Environment dosyasını oluştur
cp .env.example .env

# 3. MongoDB'yi başlat (Docker ile)
docker run -d -p 27017:27017 --name mongodb mongo:7

# 4. Veritabanını seed et
npm run seed

# 5. Sunucuyu başlat
npm run dev
```

Sunucu `http://localhost:3000` adresinde çalışacak.

### Docker ile Kurulum

```bash
# Tüm servisleri başlat
docker-compose up -d

# Seed çalıştır
docker-compose exec api npm run seed

# Logları görüntüle
docker-compose logs -f api
```

## Test Kullanıcıları

Seed script çalıştırıldıktan sonra:

**Admin:**
- Email: `admin@system.com`
- Şifre: `admin123`

**İşletme:**
- Email: `info@kahvedukkani.com`
- Şifre: `business123`

## API Endpoint'leri

### 🔐 Authentication

```bash
# Admin Login
POST /api/auth/admin
{
  "email": "admin@system.com",
  "password": "admin123"
}

# İşletme Login
POST /api/auth/business
{
  "email": "info@kahvedukkani.com",
  "password": "business123"
}

# Google OAuth
POST /api/auth/google
{
  "idToken": "google-id-token"
}

# Apple Sign In
POST /api/auth/apple
{
  "identityToken": "apple-identity-token"
}
```

### 👨‍💼 Admin Routes (Token gerekli)

```bash
GET    /api/admin/businesses           # Tüm işletmeler
POST   /api/admin/businesses           # İşletme oluştur
GET    /api/admin/businesses/:id       # İşletme detayı
PUT    /api/admin/businesses/:id       # İşletme güncelle
GET    /api/admin/collection-sets      # Koleksiyon setleri
POST   /api/admin/collection-sets      # Set oluştur
GET    /api/admin/shipments            # Tüm kargolar
POST   /api/admin/shipments            # Kargo oluştur
PATCH  /api/admin/shipments/:id        # Kargo güncelle
GET    /api/admin/system               # Sistem istatistikleri
GET    /api/admin/logs                 # Sistem logları
```

### 🏪 Business Routes (Token gerekli)

```bash
GET    /api/business/me                # İşletme profili
PUT    /api/business/me                # Profil güncelle
GET    /api/business/categories        # Kategoriler
POST   /api/business/categories        # Kategori oluştur
GET    /api/business/collections       # Koleksiyonlar
POST   /api/business/collections       # Koleksiyon oluştur
GET    /api/business/products-tl       # TL ürünleri
POST   /api/business/products-tl       # TL ürün oluştur
PUT    /api/business/products-tl/:id   # TL ürün güncelle
GET    /api/business/products-point    # Puan ürünleri
POST   /api/business/products-point    # Puan ürün oluştur
GET    /api/business/orders-tl         # TL siparişleri
PATCH  /api/business/orders-tl/:id     # Sipariş durumu güncelle
GET    /api/business/orders-point      # Puan siparişleri
GET    /api/business/shipments         # Kargolar
PATCH  /api/business/shipments/:id/confirm  # Kargoyu onayla
GET    /api/business/analytics         # Analitikler
POST   /api/business/qr                # QR oluştur
```

### 📱 Mobile Routes (Token gerekli)

```bash
GET    /api/mobile/profile             # Kullanıcı profili
PUT    /api/mobile/profile             # Profil güncelle
GET    /api/mobile/businesses          # Tüm işletmeler
GET    /api/mobile/businesses/:id      # İşletme detayı
POST   /api/mobile/order-tl            # TL sipariş oluştur
POST   /api/mobile/order-point         # Puan sipariş oluştur
GET    /api/mobile/orders-history      # Sipariş geçmişi
GET    /api/mobile/loyalty/:businessId # Puan bakiyesi
GET    /api/mobile/loyalties           # Tüm puanlar
GET    /api/mobile/point-earned        # Kazanılan puanlar
```

### 🖥️ Kiosk Routes (Token gereksiz)

```bash
GET    /api/kiosk/menu/:businessId     # Menü
POST   /api/kiosk/session              # Session oluştur
GET    /api/kiosk/session/:qrCode      # Session bilgisi
DELETE /api/kiosk/session/:qrCode      # Session kapat
```

## Örnek Kullanım

### 1. Admin Login ve İşletme Oluşturma

```bash
# Login
curl -X POST http://localhost:3000/api/auth/admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@system.com","password":"admin123"}'

# Response'dan token al
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Yeni işletme oluştur
curl -X POST http://localhost:3000/api/admin/businesses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Yeni Kahveci",
    "email": "yeni@kahveci.com",
    "password": "password123",
    "address": "İstanbul, Türkiye",
    "phone": "+905551112233"
  }'
```

### 2. İşletme Login ve Ürün Ekleme

```bash
# İşletme login
curl -X POST http://localhost:3000/api/auth/business \
  -H "Content-Type: application/json" \
  -d '{"email":"info@kahvedukkani.com","password":"business123"}'

# Token al
BUSINESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Kategorileri listele
curl http://localhost:3000/api/business/categories \
  -H "Authorization: Bearer $BUSINESS_TOKEN"

# Yeni ürün ekle
curl -X POST http://localhost:3000/api/business/products-tl \
  -H "Authorization: Bearer $BUSINESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cappuccino",
    "description": "Kremalı cappuccino",
    "categoryId": "CATEGORY_ID",
    "priceTL": 85,
    "stock": 20,
    "imageUrl": "https://example.com/cappuccino.jpg"
  }'
```

### 3. Mobil Kullanıcı Sipariş Verme

```bash
# Kullanıcı token'ı (OAuth'dan gelir)
USER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# İşletmeleri listele
curl http://localhost:3000/api/mobile/businesses \
  -H "Authorization: Bearer $USER_TOKEN"

# TL sipariş oluştur
curl -X POST http://localhost:3000/api/mobile/order-tl \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "BUSINESS_ID",
    "paymentMethod": "credit_card",
    "items": [
      {
        "productId": "PRODUCT_ID",
        "quantity": 2,
        "note": "Şekersiz lütfen"
      }
    ]
  }'

# Puan bakiyesini kontrol et
curl http://localhost:3000/api/mobile/loyalty/BUSINESS_ID \
  -H "Authorization: Bearer $USER_TOKEN"
```

## Veritabanı Modelleri

### User
- OAuth kullanıcıları (Google/Apple)
- name, email, provider, providerId

### Admin
- Sistem yöneticileri
- email, password (hashed)

### Business
- İşletme hesapları
- email, password (hashed), businessId
- Multi-tenant izolasyon için kritik

### Category
- Ürün kategorileri
- businessId ile ilişkili

### Collection
- Koleksiyon grupları
- businessId ile ilişkili

### ProductTL
- TL ile satılan ürünler
- businessId, categoryId

### ProductPoint
- Puan ile satılan ürünler
- businessId, collectionId

### OrderTL
- TL siparişleri
- businessId (ZORUNLU), userId
- Puan kazandırır

### OrderPoint
- Puan siparişleri
- businessId (ZORUNLU), userId
- Puan kazandırmaz

### Loyalty
- Kullanıcı-işletme puan bakiyesi
- userId + businessId (unique)

### CollectionSet
- Admin'in oluşturduğu setler
- İşletmelere kargolar

### Shipment
- Kargo takip kayıtları
- status: pending, in_transit, delivered

### KioskSession
- QR kod session'ları
- Süreli (15 dakika)

## İş Mantığı

### Multi-Tenant İzolasyon

Her işletme bağımsız bir hesap gibi çalışır:

1. İşletme login olur → `businessId` alır
2. Tüm sorgular `businessId` ile filtrelenir
3. Diğer işletmelerin verileri görünmez

```javascript
// Örnek: İşletme siparişlerini çekerken
const orders = await OrderTL.find({ 
  businessId: req.businessId  // Middleware'den gelir
});
```

### Çift Ekonomi Sistemi

**TL Ekonomisi:**
- Gerçek para ile ödeme
- Sipariş sonrası puan kazanılır (toplam tutarın %10'u)
- Örnek: 100 TL sipariş = 10 puan

**Puan Ekonomisi:**
- Sadece puan ile ödeme
- Puan kazandırmaz
- İşletmeye özel (A işletmesinin puanı B'de kullanılamaz)

**Kritik Kural:** TL ve Puan aynı sepette karıştırılamaz!

### Koleksiyon Seti Akışı

1. **Admin** → Koleksiyon seti oluşturur
2. **Admin** → Seti işletmeye kargolar
3. **Kargo** → Takip numarası ile izlenir
4. **İşletme** → Kargoyu görüntüler
5. **İşletme** → Teslimatı onaylar
6. **Sistem** → Ürünler işletme stoğuna eklenir

## Güvenlik

- ✅ JWT token authentication
- ✅ bcrypt ile şifre hashleme
- ✅ Helmet.js güvenlik başlıkları
- ✅ Rate limiting (15 dk / 100 istek)
- ✅ CORS yapılandırması
- ✅ Rol bazlı yetkilendirme

## Postman Collection

`postman_collection.json` dosyasını Postman'e import ederek tüm endpoint'leri test edebilirsin.

Collection otomatik olarak:
- Login sonrası token'ları kaydeder
- Her istekte token'ı ekler
- Environment variable'ları yönetir

## Geliştirme

```bash
# Development mode (hot reload)
npm run dev

# Production mode
npm start

# Seed database
npm run seed
```

## Deployment

### Heroku

```bash
heroku create loyalty-api
heroku addons:create mongolab
git push heroku main
heroku run npm run seed
```

### Docker

```bash
docker-compose up -d
```

### Environment Variables

Production'da mutlaka değiştir:
- `JWT_SECRET` - Güçlü bir secret key
- `MONGODB_URI` - Production MongoDB URL
- `CORS_ORIGIN` - Frontend domain'leri

## Sorun Giderme

### MongoDB bağlanamıyor
```bash
# MongoDB'nin çalıştığını kontrol et
mongosh
```

### Port kullanımda
```bash
# .env dosyasında PORT değiştir
PORT=3001
```

### Seed hatası
```bash
# Veritabanını temizle
mongosh loyalty-system --eval "db.dropDatabase()"
npm run seed
```

## Katkıda Bulunma

1. Fork et
2. Feature branch oluştur (`git checkout -b feature/amazing`)
3. Commit et (`git commit -m 'Add amazing feature'`)
4. Push et (`git push origin feature/amazing`)
5. Pull Request aç

## Lisans

MIT

## İletişim

Sorular için issue aç veya pull request gönder.

---

**Not:** Bu API, dummy JSON dosyalarından tam fonksiyonel bir backend'e dönüştürülmüştür. Tüm endpoint'ler çalışır durumda ve production-ready'dir.
