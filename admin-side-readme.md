---

# Proje Genel Tanımı

## Bu Proje Ne?

Bu proje, **işletmelerin kasasız ve personelsiz sipariş alabilmesini** sağlayan
**QR tabanlı, self-service bir sipariş sistemidir**.

Sistem;
müşteri, işletme ve sistem sahibi arasında **net sınırlarla ayrılmış**
birden fazla bağımsız uygulamadan oluşur.

Amaç:

> Sipariş alma sürecini sadeleştirmek, işletmenin operasyon yükünü azaltmak ve müşteriye hızlı bir deneyim sunmak.

---

## Temel Fikir

Bu sistemde:

* Kasiyer yok
* Garson yok
* Sipariş doğrudan müşteriden sisteme gider
* İşletme sadece siparişi hazırlar

Müşteri:

* QR okutur
* Menüye bakar
* Sipariş verir

İşletme:

* Ürünleri tanımlar
* Siparişleri yönetir
* Sistemi kontrol eder

Admin:

* Sistemi ayakta tutar
* Denetler
* Müdahale etmez

---

## Sistem Nasıl Parçalanıyor?

Bu proje **tek bir uygulama değildir**.
Bilinçli olarak **ayrı ayrı geliştirilen** 4 ana projeden oluşur.

### 1️⃣ Admin Panel

* Sistemin merkezidir
* İşletmeleri ve abonelikleri denetler
* Günlük operasyona karışmaz

### 2️⃣ İşletme Paneli

* İşletmenin kendi yönetim alanıdır
* Ürün, koleksiyon ve sipariş buradan yönetilir
* İşletme tek aktördür

### 3️⃣ Tablet / Kiosk Panel

* İşletme içinde çalışır
* Müşterinin sipariş başlattığı ekrandır
* Sadece vitrin ve sipariş kapısıdır

### 4️⃣ Mobil Uygulama

* Müşterinin kişisel alanıdır
* İşletme keşfi ve sadakat burada olur
* QR ile sipariş bu uygulamadan verilir

Her proje:

* Kendi başına ayağa kalkabilir
* Diğerlerinden UI olarak bağımsızdır
* Aynı merkezi API’ye bağlıdır

---

## Ne Yapıyoruz, Ne Yapmıyoruz?

### Yapıyoruz

* QR ile sipariş
* Self-service deneyim
* İşletme bazlı sadakat puanı
* Basit ve hızlı akışlar

### Yapmıyoruz

* Klasik POS sistemi
* Masa yönetimi
* Garson / kasiyer rolleri
* Karmaşık kampanya motorları

Bu sınırlar bilerek çizilmiştir.

---

## Temel Tasarım Prensipleri

Bu sistem:

* Az konuşur
* Net çalışır
* Gereksiz özellik barındırmaz

Her eklenen şey şu soruya cevap vermelidir:

> “Bu gerçekten sipariş sürecini iyileştiriyor mu?”

Cevap hayırsa, eklenmez.

---

## Vibe Coding İçin Ana Mesaj

Bu projede kod yazarken şunu akılda tut:

* Bu bir **operasyon sistemi**
* Bir “her şey olsun” projesi değil
* Her panelin görevi bellidir
* Paneller birbirinin işine karışmaz

Kod:

* Sade olmalı
* Okunabilir olmalı
* Genişlemeye açık ama şişkin olmamalı

---

## Özet

Bu proje:

* Siparişi sadeleştirir
* İşletmeyi rahatlatır
* Müşteriyi yormaz

Bu bir **kasasız sipariş sistemi**dir.

---
