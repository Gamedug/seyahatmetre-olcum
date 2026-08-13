# Kurulum — bedava, terminal yok

**Tamamen tarayıcıdan yapılır.** Komut satırı, SSH, kredi kartı gerekmez.

GitHub Actions kullanacağız: GitHub'ın sunucuları senin yerine kodu belirli aralıklarla çalıştırır, sonucu deponda saklar. **Açık (public) depolarda ücretsiz ve sınırsızdır.**

> Süre: ~15 dakika. Maliyet: 0 TL.

---

## Adım 1 — GitHub hesabı aç

[github.com/signup](https://github.com/signup) → e-posta, şifre, kullanıcı adı. Ücretsiz plan yeterli.

---

## Adım 2 — Depo (repository) oluştur

1. Sağ üstteki **+** işaretine bas → **New repository**
2. **Repository name:** `seyahatmetre-olcum`
3. **Public** seç (önemli — ücretsiz sınırsız çalışma hakkı bunda)
4. **Add a README file** kutusunu işaretle
5. **Create repository**

> **Public olması sorun mu?** Hayır. Bu depoda sadece toplayıcı kodu ve kamuya açık fiyat verileri var. Şifre, kişisel bilgi, ticari sır yok. Uygulamanın asıl kodunu ileride ayrı ve kapalı bir depoda tutarız.

---

## Adım 3 — Dosyaları yükle

1. Depo sayfasında **Add file** → **Upload files**
2. Sana gönderdiğim zip'i bilgisayarında çıkart
3. `seyahatmetre-olcum` klasörünün **içindeki** dosyaları seç ve sürükleyip bırak:
   - `ayikla.js`, `topla.js`, `rapor.js`, `test.js`, `kaynaklar.json`, `package.json`, `.gitignore`
4. Alttaki yeşil **Commit changes** düğmesine bas

Şimdi gizli klasörü ekleyelim (sürükle-bırak bazen gizli klasörleri atlar):

5. Tekrar **Add file** → **Create new file**
6. Dosya adı kutusuna tam olarak şunu yaz:
   ```
   .github/workflows/topla.yml
   ```
   (eğik çizgileri yazdıkça GitHub klasörleri kendisi oluşturur)
7. Zip'teki `.github/workflows/topla.yml` dosyasının içeriğini kopyala, kutuya yapıştır
8. **Commit changes**
9. Aynı işlemi `.github/workflows/rapor.yml` için tekrarla

---

## Adım 4 — İlk denemeyi elle çalıştır

1. Üstteki **Actions** sekmesine gir
2. Soldaki listeden **Veri topla**'ya tıkla
3. Sağda **Run workflow** düğmesi → tekrar **Run workflow**
4. Sayfayı yenile, sarı bir daire göreceksin. Bitince yeşil ✓ ya da kırmızı ✗ olur.
5. Çalışmaya tıkla → **topla** → **Toplayiciyi calistir** satırını aç

Burada ne bulduğunu göreceksin. **Bu çıktıyı olduğu gibi bana yapıştır.**

Kırmızı ✗ olsa bile sorun değil — çıktıyı görmem yeterli.

---

## Adım 5 — Otomatik çalışmayı aç

Adım 4'ten sonra kaynakları birlikte düzelteceğiz. Sonrasında hiçbir şey yapmana gerek yok:

- **16:00–01:00** arası her 10 dakikada bir
- Diğer saatlerde saatte bir

kendiliğinden çalışır. Topladığı veri deponun `veri/` klasörüne düşer, tarayıcıdan görebilirsin.

---

## Rapor almak

1. **Actions** → **Rapor al** → **Run workflow**
2. Bitince çalışmaya tıkla — rapor **Summary** sayfasında görünür

Her pazartesi sabahı da kendiliğinden bir rapor üretir.

Raporu bana yapıştır, birlikte yorumlarız.

---

## Bilmen gereken üç sınır

**1. Zamanlama garantili değil.**
GitHub yoğun olduğunda görevler 5–30 dakika gecikebilir. **Ama ölçümümüzü bozmaz** — çünkü haber beslemeleri kendi yayın saatlerini taşıyor. Rapor "haber saat 19:02'de yayınlandı" der, biz onu 19:20'de görmüş olsak bile. Rapor ayrıca kendi gecikmemizi de ayrıca gösterir.

**2. 60 gün kuralı.**
Açık depolarda, 60 gün hiç hareket olmazsa zamanlanmış görevler sessizce durur. Bizde her çalışma veri kaydettiği için hareket sürekli var — sorun olmaz. Yine de ayda bir Actions sekmesine göz at.

**3. Bu ölçüm için yeterli, gerçek uygulama için değil.**
GitHub Actions bildirim gönderemez ve 10 dakikalık gecikmeyle çalışır. Uygulama yayına çıkarken gerçek bir sunucu gerekecek (aylık ~4,5 €). Ama o karara, ürünün çalıştığını **bildikten sonra** geleceksin.

---

## Diğer bedava seçenek: Oracle Cloud

Oracle'ın "Always Free" katmanı gerçek ve süresiz bir sunucu veriyor (ARM, 4 çekirdek / 24 GB'a kadar). Cazip ama gerçek dezavantajları var:

| | |
|---|---|
| Kredi kartı | **Gerekli** (doğrulama için) |
| Hesap onayı | Belirsiz; başvurular sık reddediliyor |
| Kapasite | ARM sunucular çoğu bölgede "dolu" veriyor |
| Boşta kalma | Kullanım düşerse sunucu **kapatılabiliyor** |
| Yedek | Yok |
| Terminal | **Gerekli** — SSH kullanman şart |

Senin durumunda (terminal deneyimi yok, kredi kartı vermek istemeyebilirsin) **GitHub Actions daha uygun.** Oracle'ı, ilerideki gerçek sunucu ihtiyacında değerlendirebiliriz — ama o noktada 4,5 €/ay ödeyip Hetzner almak, harcayacağın zamanın karşılığında muhtemelen daha ucuza gelir.

---

## Karşılaştırma

| | GitHub Actions | Oracle Free | Hetzner (ücretli) |
|---|---|---|---|
| Ücret | **0 TL** | 0 TL | ~230 TL/ay |
| Kredi kartı | Hayır | **Evet** | Evet |
| Terminal | **Hayır** | Evet | Evet |
| Kurulum | 15 dk | 1–2 saat | 30 dk |
| Zamanlama | 5–30 dk gecikebilir | Kesin | Kesin |
| Kapanma riski | Yok | **Var** | Yok |
| Bildirim gönderebilir mi | Hayır | Evet | Evet |
| **Ölçüm için** | **✅ yeterli** | ✅ | ✅ |
| **Yayındaki uygulama için** | ❌ | ~ | ✅ |

**Önerim:** Ölçümü GitHub Actions ile bedava yap. Sonuç olumluysa, uygulamayı yazarken gerçek sunucuya geçeriz — o zaman aylık 230 lira, elindeki kanıtın yanında hiç kalır.
