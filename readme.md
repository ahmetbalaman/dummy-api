# Core API – Genel Tanım ve Geliştirme Rehberi

Bu doküman, sistemde kullanılan **ortak API sözleşmesini** açıklar. Amaç; Admin Paneli, İşletme Paneli, Tablet/Kiosk ve Mobil Uygulama'nın **aynı veri modeli ve kurallarla** geliştirilmesini sağlamaktır.

Bu API şu an **dummy JSON veriler** ile temsil edilir. Ancak yapı, birebir gerçek backend’e taşınabilecek şekilde tasarlanmıştır.

---

## 🎯 API’nin Amacı

* Tüm paneller için **tek veri kaynağı mantığı** oluşturmak
* Frontend projelerinin backend beklemeden geliştirilebilmesi
* Gerçek backend yazıldığında **sadece baseURL değiştirerek** devam edebilmek
* Feature creep ve hayali ekranların önüne geçmek

---

## 🧠 Temel Sistem Mantığı

### Roller

* **Admin** → Sistemi ve işletmeleri yönetir, koleksiyon setlerini oluşturur ve kargolar
* **İşletme** → Kendi ürünlerini, siparişlerini yönetir, gelen kargoları takip eder
* **Kullanıcı (Mobil)** → Sipariş verir, puan kazanır ve harcar
* **Tablet/Kiosk** → Menü gösterir ve sipariş oluşturur

Bu API **rol bazlı ayrım içermez**, sadece veri döner. Yetki frontend tarafında varsayılır.

### 🏪 İşletme Hesap Sistemi

**Her işletme bağımsız bir hesap olarak çalışır:**

1. **Admin panelinden işletme eklenir** → Sistem'e yeni işletme kaydedilir (ID: b1, b2, vb.)
2. **İşletme login olur** → `auth.json`'dan `businessId` alır (örn: b1)
3. **İşletme sadece kendi verilerini görür:**
   - Sipariş listelerken → Sadece `businessId: "b1"` olan siparişler
   - Ürünlerini yönetir → Sadece kendi ürünleri
   - Kargolarını takip eder → Sadece kendine gelen kargolar
4. **Kullanıcılar tüm işletmeleri görebilir** → Mobil uygulamada tüm işletmeler listelenir
5. **Sipariş oluşturulduğunda `businessId` mutlaka atanır** → Hangi işletmeye ait olduğu belli olur

⚠️ **Kritik:** Tüm siparişlerde `businessId` **zorunludur**. Aksi takdirde işletme hangi siparişin kendisine ait olduğunu bilemez.

---

## 🎁 Koleksiyon Seti Sistemi (Admin → İşletme)

**Admin merkezi olarak koleksiyon setlerini yönetir:**

1. Admin → Koleksiyon setleri tanımlar (örn: 10 kupa + 5 tabak)
2. Admin → Setleri işletmelere atar ve kargolar
3. Kargo şirketi ile takip sistemi (pending → in_transit → delivered)
4. İşletme → Kargoları görüntüler, teslimatı onaylar
5. Ürünler işletme stoğuna otomatik eklenir

❌ İşletmeler kendi koleksiyon ürünlerini **oluşturamaz**
✅ İşletmeler sadece **admin'den gelen setleri** kullanır
✅ Koleksiyon ürünler **puanla satılır**

---

## 💰 Ekonomi Modeli (ÇOK ÖNEMLİ)

Sistemde **iki ayrı ve asla karışmayan ekonomi vardır**:

### 1️⃣ TL Ekonomisi

* Kahve, yiyecek vb.
* Gerçek ödeme gerektirir
* Sipariş sonrası **puan kazandırır**

### 2️⃣ Puan Ekonomisi

* Koleksiyon / hediyelik ürünler
* Sadece puanla alınır
* Puanla yapılan sipariş **puan kazandırmaz**

❌ TL + Puan aynı sepette kullanılamaz
❌ Puanın TL karşılığı yoktur

---

## 🔒 Puan Kuralı (İşletmeye Özel)

* Puanlar **işletme bazlıdır**
* Kullanıcı A işletmesinde kazandığı puanı B işletmesinde kullanamaz

Veri modeli:

```
userId + businessId → points
```

Global puan kavramı yoktur.

---

## 🧩 Ana Kaynaklar (Resource’lar)

### Auth

* Üç farklı rol için giriş örnekleri içerir: **admin**, **business**, **user**
* Her rol kendi token ve kullanıcı bilgilerini döner
* İşletme girişinde `businessId` döner (önemli: siparişleri filtrelemek için kullanılır)

### Admin

* İşletmeler (detaylı bilgilerle: adres, telefon, logo, çalışma saatleri, rating)
* Koleksiyon Setleri (admin tarafından oluşturulur, işletmelere kargolanır)
* Kargolama Yönetimi (set gönderimi, takip, durum)
* Abonelikler
* Sistem istatistikleri
* Loglar

### Business (İşletme)

* Koleksiyonlar (görseller ve detaylarla)
* Kategoriler (ürün kategorileri)
* TL ürünleri (görseller, kategori, açıklama ile)
* Puan ürünleri (görseller ve detaylarla)
* Kargolar (admin'den gelen koleksiyon setleri, takip, teslim alma)
* Siparişler (TL / Puan ayrı, detaylı items listesi ile)
* Sipariş detayları (ürün, miktar, birim fiyat, notlar)
* Puan işlemleri
* İstatistikler ve analitikler (günlük/aylık satış, en çok satanlar)
* QR üretimi

### Kiosk / Tablet

* Menü (TL ürün + koleksiyon + puan ürün, görseller dahil)
* QR session

### Mobile

* İşletme listesi (detaylı bilgilerle: adres, rating, mesafe)
* Kullanıcı profili (ad, email, telefon, avatar)
* Sipariş oluşturma (TL / Puan ayrı, ödeme yöntemi ile)
* Sipariş geçmişi (tüm geçmiş siparişler)
* İşletmeye bağlı sadakat puanı
* Kazanılan puan detayları

---

## � Auth ve İşletme Login Akışı

### Admin Login
```json
GET /auth.json → admin objesi
{
  "token": "dummy-admin-token-123",
  "user": {
    "id": "admin1",
    "role": "admin",
    "name": "Admin User",
    "email": "admin@system.com"
  }
}
```

**Kullanım:** Admin paneli bu token ile tüm sisteme erişir.

---

### İşletme Login
```json
GET /auth.json → business objesi
{
  "token": "dummy-business-token-456",
  "user": {
    "id": "b1",
    "role": "business",
    "businessId": "b1",  ← ÇOK ÖNEMLİ
    "businessName": "Kahve Dükkanı",
    "email": "info@kahvedukkani.com"
  }
}
```

**Kullanım:** 
1. İşletme paneli login yapar
2. `businessId: "b1"` alır
3. Sipariş çekerken: `orders-tl.json` → Sadece `businessId === "b1"` olanları gösterir
4. Ürünlerini listeler: `products-tl.json` → Sadece kendi ürünleri

**Neden önemli?**  
Aksi takdirde **tüm işletmelerin siparişleri** karışır. Her işletme sadece kendine ait verileri görmelidir.

---

### Kullanıcı Login
```json
GET /auth.json → user objesi
{
  "token": "dummy-user-token-789",
  "user": {
    "id": "u1",
    "role": "user",
    "name": "Ayşe Yılmaz",
    "email": "ayse@example.com",
    "phone": "+905551234567"
  }
}
```

**Kullanım:** Mobil uygulama, kullanıcı profili ve sipariş geçmişi için kullanır.

---

## �📦 Dummy API Kullanım Şekli

Bu API gerçek bir server değildir.

Frontend projeleri veriyi:

* GitHub üzerindeki JSON dosyalarından
* HTTP `GET` isteği atıyormuş gibi

kullanır.

Bu sayede:

* Flutter
* Web (Admin / İşletme / Tablet)

aynı sözleşmeyi tüketir.

---

## 📁 Veri Yapısı Prensipleri

* Tüm response’lar JSON
* ID’ler string
* Tarihler ISO-8601 formatında
* Dummy API **validation yapmaz**
* Frontend, backend varmış gibi davranır

---

## 🚫 Bilinçli Olarak Olmayan Şeyler

Bu API şunları **özellikle içermez**:

* Kampanya / kupon sistemi
* Split payment
* Puan satın alma
* Çalışan / barista rolleri
* Offline çalışma senaryosu

Amaç: **kontrollü, sürdürülebilir ve geliştirilebilir bir çekirdek**.

---

## 🧠 Geliştirirken Uyulması Gereken Kural

> API’de endpoint yoksa, frontend’de ekran da yok.

Bu kural bozulursa:

* sistem şişer
* backend yazımı zorlaşır
* kararlar geri alınamaz hale gelir

---

## 🔁 Gerçek Backend’e Geçiş

Gerçek backend yazılırken:

* Alan isimleri değişmez
* Veri yapıları korunur
* Sadece baseURL değiştirilir

Bu doküman, **backend için de bağlayıcıdır**.

---

## 📌 Özet

Bu API:

* Küçük başlar
* Net kurallarla ilerler
* Genişlemeye açıktır ama kontrolsüz değildir

Bu yapı korunduğu sürece:

* UI rahat gelişir
* Backend sağlam olur
* Sistem ölçeklenebilir kalır

---

> Bu doküman, projenin teknik omurgasıdır. Değişiklik yapılacaksa önce burada düşünülür, sonra kod yazılır.



BaseURL : https://raw.githubusercontent.com/ahmetbalaman/dummy-api/main/



Map:

tamam. şimdi **vibe coding’e tek seferde verebileceğin FULL MAP**’i çıkarıyorum.
Bu bir **akış + ilişki + sınır haritası**.
Bunu verdiğinde model **neye dokunacağını / neye dokunmayacağını** bilir.

Aşağıyı **aynen** kullanabilirsin.

---

# 🗺️ FULL SYSTEM MAP (Vibe Coding Reference)

## 1️⃣ Sistem Bileşenleri (Üstten Bakış)

```
                ┌──────────────┐
                │   ADMIN UI   │
                └──────┬───────┘
                       │
                       ▼
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│  MOBILE  │◀──▶│   CORE API   │◀──▶│  BUSINESS UI │
└────┬─────┘    └──────┬───────┘    └──────┬───────┘
     │                 │                    │
     ▼                 ▼                    ▼
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  KIOSK   │     │  DUMMY JSON  │     │  REAL API    │
└──────────┘     └──────────────┘     └──────────────┘
```

> Şu an sadece **DUMMY JSON** kullanılır
> Gerçek API geldiğinde **CORE API sözleşmesi değişmez**

---

## 2️⃣ Roller ve Yetki Algısı

> API yetki kontrolü yapmaz
> Her panel **kendi rolünü varsayar**
> İşletme paneli **businessId** ile kendi verilerini filtreler

| Panel       | Rol Varsayımı | businessId Gerekli? |
| ----------- | ------------- | ------------------- |
| Admin UI    | admin         | ❌ (tüm verileri görür) |
| Business UI | business      | ✅ (sadece kendi siparişleri) |
| Kiosk       | session-based | ✅ (işletme bağlamında çalışır) |
| Mobile      | user          | ❌ (kullanıcı tüm işletmeleri görebilir) |

---

## 3️⃣ Ana Varlıklar (Entities)

```
User
 └─ id
 └─ name
 └─ email
 └─ phone
 └─ avatarUrl

Business
 └─ id
 └─ name
 └─ description
 └─ address
 └─ phone
 └─ logoUrl
 └─ workingHours
 └─ rating
 └─ subscriptionStatus

Category
 └─ id
 └─ name
 └─ iconUrl

CollectionSet (Admin creates)
 └─ id
 └─ name
 └─ description
 └─ category
 └─ products[]
 └─ totalItems

Shipment
 └─ id
 └─ collectionSetId
 └─ businessId
 └─ status (pending/in_transit/delivered)
 └─ trackingNumber
 └─ products[]

Collection
 └─ id
 └─ name
 └─ description
 └─ imageUrl
 └─ businessId

ProductTL
 └─ id
 └─ name
 └─ description
 └─ categoryId
 └─ imageUrl
 └─ businessId
 └─ priceTL

ProductPoint
 └─ id
 └─ name
 └─ description
 └─ collectionId
 └─ imageUrl
 └─ businessId
 └─ pricePoint

OrderTL
 └─ id
 └─ businessId (⚠️ ZORUNLU - Her sipariş bir işletmeye aittir)
 └─ userId
 └─ items[]
    └─ productId
    └─ quantity
    └─ unitPrice
    └─ note
 └─ totalTL
 └─ paymentMethod

OrderPoint
 └─ id
 └─ businessId (⚠️ ZORUNLU - Her sipariş bir işletmeye aittir)
 └─ userId
 └─ items[]
    └─ productId
    └─ quantity
    └─ unitPoint
    └─ note
 └─ totalPoint

Loyalty
 └─ userId
 └─ businessId
 └─ points
```

---

## 4️⃣ Ekonomi Haritası (EN KRİTİK KISIM)

```
           ┌────────────┐
           │  TL ORDER  │
           └─────┬──────┘
                 │
                 ▼
         ┌─────────────────┐
         │  POINT EARNED   │
         │ (business only) │
         └─────────────────┘
```

```
           ┌──────────────┐
           │ POINT ORDER  │
           └─────┬────────┘
                 │
                 ▼
        ┌──────────────────┐
        │ POINT DECREASED  │
        │ (same business)  │
        └──────────────────┘
```

### ❌ Yasak Akışlar

* TL + Puan aynı sipariş
* Puan → TL dönüşümü
* A işletmesinin puanı → B işletmesi

---

## 🏪 Yeni İşletme Ekleme ve Sipariş Akışı

### Adım 1: Admin İşletme Ekler
```json
// admin/businesses.json
{
  "id": "b2",
  "name": "Yeni Kahveci",
  "email": "info@yenikahveci.com",
  "subscriptionStatus": "active",
  ...
}
```

### Adım 2: İşletme Login Olur
```json
// auth.json → business objesi
{
  "businessId": "b2",
  "businessName": "Yeni Kahveci"
}
```

### Adım 3: Kullanıcı Sipariş Verir
```json
// Mobil uygulama → POST /order-tl
{
  "userId": "u1",
  "businessId": "b2",  ← İşletme bilgisi
  "items": [...],
  "totalTL": 150
}
```

### Adım 4: İşletme Siparişi Görür
```javascript
// business/orders-tl.json
const orders = allOrders.filter(o => o.businessId === currentUser.businessId)
// b2 sadece kendi siparişlerini görür
```

**✅ Sonuç:** Her işletme bağımsız hesap gibi çalışır, veriler karışmaz.

---

## 5️⃣ Panel → API Haritası

### ADMIN PANEL

```
/admin/businesses
/admin/collection-sets
/admin/shipments
/admin/subscriptions
/admin/system
/admin/logs
```

Amaç:

* sistem durumu
* işletme kontrolü
* koleksiyon seti yönetimi
* kargolama ve takip
* ödeme takibi

---

### BUSINESS PANEL

```
/business/me
/business/categories
/business/collections
/business/products-tl
/business/products-point
/business/shipments
/business/orders-tl
/business/orders-point
/business/qr
/business/point-transactions
/business/analytics
```

Amaç:

* menü yönetimi
* kategori düzenleme
* kargo ve stok takibi
* sipariş takibi
* puan hareketleri
* satış analitiği

---

### KIOSK / TABLET

```
/kiosk/menu
/kiosk/session
/kiosk/order-tl
/kiosk/order-point
```

Amaç:

* kullanıcıya menü göstermek
* sipariş başlatmak
* ödeme **yapmamak**

---

### MOBILE

```
/mobile/profile
/mobile/businesses
/mobile/business/:id
/mobile/order-tl
/mobile/order-point
/mobile/orders-history
/mobile/loyalty
/mobile/loyalties
/mobile/point-earned
```

Amaç:

* kullanıcı profili yönetimi
* sipariş vermek
* sipariş geçmişi görüntüleme
* puan görmek
* puan harcamak

---

## 📂 API Dosya Yapısı

```
dummy-api/
├── auth.json                    (🔑 Rol bazlı login örnekleri: admin, business, user)
├── admin/
│   ├── businesses.json          (detaylı işletme bilgileri)
│   ├── collection-sets.json     (🆕 admin'in oluşturduğu koleksiyon setleri)
│   ├── shipments.json           (🆕 kargolama kayıtları ve takip)
│   ├── subscriptions.json
│   ├── system.json
│   └── logs.json
├── business/
│   ├── me.json
│   ├── categories.json          (🆕 ürün kategorileri)
│   ├── collections.json         (🔄 görsel ve detay eklendi)
│   ├── products-tl.json         (🔄 görsel, kategori, açıklama eklendi)
│   ├── products-point.json      (🔄 görsel ve detay eklendi)
│   ├── shipments.json           (🆕 gelen kargolar ve teslim takibi)
│   ├── orders-tl.json           (🔄 items, ödeme, notlar eklendi)
│   ├── orders-point.json        (🔄 items ve notlar eklendi)
│   ├── point-transactions.json
│   ├── analytics.json           (🆕 satış analitiği ve istatistikler)
│   └── qr.json
├── mobile/
│   ├── profile.json             (🆕 kullanıcı profili)
│   ├── businesses.json          (🔄 detaylı işletme bilgileri)
│   ├── orders-history.json      (🆕 tüm sipariş geçmişi)
│   ├── loyalties.json
│   ├── loyalty.json
│   ├── order-tl.json
│   ├── order-point.json
│   └── point-earned.json
└── kiosk/
    ├── menu.json
    └── session.json
```

**🆕** = Yeni eklendi  
**🔄** = Güncellendi ve zenginleştirildi

---

## 🎨 Yeni Özellikler

### ✅ Rol Bazlı Auth Sistemi
Üç farklı rol için giriş senaryoları:
- **Admin:** Tüm sistemi yönetir, işletme ekler/çıkarır
- **Business:** Sadece kendi işletmesinin verilerini görür (`businessId` ile filtreleme)
- **User:** Mobil kullanıcı, tüm işletmelere sipariş verebilir

**Önemli:** İşletme login'de dönen `businessId` sayesinde işletme paneli sadece kendi siparişlerini gösterir.

### ✅ Sipariş Detayları
Artık her sipariş **hangi ürünlerin** alındığını içerir:
- Ürün ID ve ismi
- Miktar
- Birim fiyat/puan
- Kullanıcı notu (ör: "şekersiz")

### ✅ Kullanıcı Profili
Mobil kullanıcılar için profil bilgileri:
- Ad, email, telefon
- Avatar görseli
- Kayıt tarihi

### ✅ Görsel Sistem
Tüm ürünler ve koleksiyonlar görsel içerir:
- Ürün görselleri
- Koleksiyon kapak görselleri
- İşletme logo ve kapak görselleri

### ✅ Kategori Sistemi
Ürünler kategorilere ayrılır:
- Sıcak İçecekler
- Soğuk İçecekler
- Tatlılar
- Atıştırmalıklar

### ✅ İşletme Analitiği
Business paneli için detaylı istatistikler:
- Günlük/aylık satış verileri
- En çok satan ürünler
- Saatlik sipariş dağılımı
- Müşteri istatistikleri

### ✅ Sipariş Geçmişi
Mobil uygulama için tam sipariş geçmişi:
- TL ve Puan siparişleri bir arada
- İşletme bilgileri dahil
- Sipariş durumu takibi

### ✅ Ödeme Yöntemi
TL siparişlerinde ödeme bilgisi:
- Kredi kartı
- Nakit
- QR kod

### ✅ İşletme Detayları
İşletmeler için zengin bilgiler:
- Adres, telefon, email
- Logo ve kapak görseli
- Çalışma saatleri
- Değerlendirme puanı

### ✅ Koleksiyon Setleri ve Kargolama (ÇOK ÖNEMLİ)
Admin paneli özelliği - Merkezi koleksiyon yönetimi:
- Admin koleksiyon setleri oluşturur
- Setler işletmelere kargolar
- Kargo takip sistemi (pending → in_transit → delivered)
- İşletme kargolarını görüntüler ve teslim alır
- Detaylı ürün listesi ve miktarlar

**İş Akışı:**
1. Admin → Koleksiyon Set tanımlar (örn: 10 kupa + 5 tabak)
2. Admin → Seti işletmeye kargolar
3. Kargo şirketi ile takip numarası
4. İşletme → Kargoyu görüntüler, teslimatı onaylar
5. Ürünler işletme stoğuna girer

---

## 6️⃣ QR & Session Akışı

```
Business Panel
   └─ QR oluşturur (time-based)

Kiosk
   └─ QR okur
       └─ Session açılır (timeout'lu)

Mobile
   └─ QR scan
       └─ Aynı session'a bağlanır
```

Kurallar:

* QR süreli
* Session süreli
* Session bitince sipariş alınmaz

---

## 7️⃣ Bilinçli Olarak OLMAYAN ŞEYLER

Bu haritada **yoksa**, projede de yok:

* barista / çalışan rolleri
* offline mode
* kampanya / kupon
* split payment
* push marketing sistemi

---

## 8️⃣ VIBE CODING’E VERİLECEK ALTIN KURAL

> “Bu sistem iki ekonomili, işletme bazlı,
> role değil panele göre davranan,
> backend’den bağımsız ama backend-ready bir sistemdir.”

Bunu anladıysa, **yanlış yere feature eklemez**.

---

## 9️⃣ Senin İçin Net Gerçek

Bu noktadan sonra:

* API bozulmaz
* scope kaçmaz
* frontend rahat akar
* backend yazmak **kolaylaşır**

----