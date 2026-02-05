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

* **Admin** → Sistemi ve işletmeleri yönetir
* **İşletme** → Kendi ürünlerini, siparişlerini ve QR’ını yönetir
* **Kullanıcı (Mobil)** → Sipariş verir, puan kazanır ve harcar
* **Tablet/Kiosk** → Menü gösterir ve sipariş oluşturur

Bu API **rol bazlı ayrım içermez**, sadece veri döner. Yetki frontend tarafında varsayılır.

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

* Giriş yapıldığını varsayan dummy response üretir

### Admin

* İşletmeler
* Abonelikler
* Sistem istatistikleri
* Loglar

### Business (İşletme)

* Koleksiyonlar
* TL ürünleri
* Puan ürünleri
* Siparişler (TL / Puan ayrı)
* QR üretimi

### Kiosk / Tablet

* Menü (TL ürün + koleksiyon + puan ürün)
* QR session

### Mobile

* İşletme listesi
* Sipariş oluşturma (TL / Puan ayrı)
* İşletmeye bağlı sadakat puanı

---

## 📦 Dummy API Kullanım Şekli

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
