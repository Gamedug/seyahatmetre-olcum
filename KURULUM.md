# Kurulum — adım adım

**Kime göre yazıldı:** Windows kullanıyorsun, terminal deneyimin yok, VPS kiralayacaksın.

Her adımda **ne yapacağını** ve **ne görmen gerektiğini** yazdım. Beklenenden farklı bir şey görürsen dur, ekrandakini bana yapıştır.

> Toplam süre: yaklaşık 30–40 dakika. Aylık maliyet: ~4,5 €.

---

## Adım 1 — VPS kirala

1. [hetzner.com/cloud](https://www.hetzner.com/cloud) adresine gir, hesap aç.
2. **New Project** → adını `seyahatmetre` koy.
3. **Add Server** de ve şunları seç:
   - **Location:** Nuremberg veya Falkenstein (Almanya)
   - **Image:** `Ubuntu 24.04`
   - **Type:** `CX22` (en küçüğü, ~4,5 €/ay)
   - **SSH Key:** şimdilik boş bırak, **root password** seçeneğini kullan
4. **Create & Buy Now**

Sunucu 30 saniyede hazır olur. Ekranda bir **IP adresi** göreceksin — `95.216.x.x` gibi. Ve e-postana bir **şifre** gelecek.

**Bu ikisini bir yere kaydet.** Bundan sonra lazım olacak.

---

## Adım 2 — Sunucuya bağlan

Windows'ta **PowerShell**'i aç: Başlat menüsüne `powershell` yaz, çıkan uygulamaya tıkla.

Siyah bir pencere açılır. Şunu yaz (IP'yi kendi IP'nle değiştir) ve Enter'a bas:

```powershell
ssh root@95.216.1.2
```

İlk bağlantıda şunu sorar:

```
Are you sure you want to continue connecting (yes/no)?
```

`yes` yaz, Enter.

Sonra şifreni ister. **Şifreyi yazarken ekranda hiçbir şey görünmez** — bu normal, bozuk değil. Yaz ve Enter'a bas.

İçeri girdiğinde satır başı şuna benzer:

```
root@ubuntu-2gb-nbg1-1:~#
```

İlk girişte yeni şifre belirlemeni isteyebilir. İsterse: önce mevcut şifreyi, sonra iki kez yeni şifreni yazarsın.

> **Not:** Bundan sonraki tüm komutlar bu pencerede, `#` işaretinden sonra yazılıyor.

---

## Adım 3 — Node.js kur

Şu iki komutu **sırayla** yaz (birincisi bitince ikincisini):

```bash
apt update && apt install -y nodejs npm
```

```bash
node --version
```

İkincisi `v18.19.1` veya daha büyük bir şey yazmalı. Yazdıysa tamam.

---

## Adım 4 — Dosyaları sunucuya yükle

**Yeni bir PowerShell penceresi aç** (öncekini kapatma).

Sana gönderdiğim `seyahatmetre-olcum` klasörünü bilgisayarında bir yere çıkart — mesela Masaüstü'ne.

Sonra bu komutu yaz (IP'yi değiştir):

```powershell
scp -r "$env:USERPROFILE\Desktop\seyahatmetre-olcum" root@95.216.1.2:/root/
```

Şifreni ister, yazarsın. Dosya isimleri akıp geçer.

Şimdi **ilk pencereye** (sunucuya bağlı olan) dön ve şunu yaz:

```bash
cd /root/seyahatmetre-olcum && ls
```

Şunları görmelisin:

```
KURULUM.md  ayikla.js  kaynaklar.json  package.json  rapor.js  test.js  topla.js
```

---

## Adım 5 — Önce testleri çalıştır

```bash
node test.js
```

Sonda **`18 gecti, 0 kaldi`** yazmalı. Yazmıyorsa dur, ekrandakini bana gönder.

---

## Adım 6 — Gerçek kaynakları dene

```bash
node topla.js --test
```

Bu komut kaynaklara bir kez gider ve ne bulduğunu yazar. Şöyle bir çıktı bekliyorum:

```
=== POMPA SONUCLARI ===
  ✓ opet_istanbul_avrupa: {"motorin":54.18,"benzin":52.74,"lpg":27.05}
  ...
=== AKARYAKIT ILGILI HABERLER ===
  (su an yok — normal, degisim gunlerinde cikar)
```

**Bu çıktıyı olduğu gibi bana yapıştır.** Muhtemelen bazı kaynaklar çalışmayacak (site yapısı değişmiş, RSS adresi taşınmış olabilir) — onları birlikte düzelteceğiz. Bu adımda hata çıkması normal, hatta bekleniyor.

---

## Adım 7 — Sürekli çalışır hale getir

Adım 6'daki çıktıyı birlikte düzelttikten sonra bu adıma geçeceğiz.

Toplayıcıyı, sen bağlantıyı kapatsan da çalışmaya devam edecek şekilde kuruyoruz. Şu komutu **tek parça halinde** kopyala-yapıştır:

```bash
cat > /etc/systemd/system/seyahatmetre.service << 'SON'
[Unit]
Description=Seyahatmetre toplayici
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/seyahatmetre-olcum
ExecStart=/usr/bin/node /root/seyahatmetre-olcum/topla.js
Restart=always
RestartSec=30
StandardOutput=append:/root/seyahatmetre-olcum/calisma.log
StandardError=append:/root/seyahatmetre-olcum/calisma.log

[Install]
WantedBy=multi-user.target
SON
```

Sonra sırayla:

```bash
systemctl daemon-reload
```

```bash
systemctl enable --now seyahatmetre
```

```bash
systemctl status seyahatmetre
```

Yeşil renkte **`active (running)`** görmelisin. `q` tuşuna basarak çık.

Artık PowerShell penceresini kapatabilirsin. Toplayıcı sunucuda çalışmaya devam eder — sen uyurken de, bilgisayarın kapalıyken de.

---

## Günlük kontrol

Ara sıra bağlanıp bakmak istersen:

```bash
cd /root/seyahatmetre-olcum
```

**Şu an ne yapıyor:**
```bash
tail -20 calisma.log
```

**Rapor al:**
```bash
node rapor.js
```

Bu raporu bana yapıştır, birlikte yorumlarız.

---

## Sık karşılaşılanlar

| Ekranda gördüğün | Anlamı | Ne yap |
|---|---|---|
| `Permission denied` | Şifre yanlış | Tekrar dene, e-postadaki şifreyi kopyala |
| `command not found: node` | Node kurulmamış | Adım 3'ü tekrarla |
| `fiyat bulunamadi` | Sitenin yapısı değişmiş | Çıktıyı bana gönder, ayıklayıcıyı düzeltirim |
| `HTTP 404` | RSS adresi taşınmış | O kaynağı `kaynaklar.json`'dan çıkarırız |
| `ECONNREFUSED` / `timeout` | Site geçici erişilemez | Kendi kendine düzelir, bir sonraki turda dener |

**Sunucuyu tamamen durdurmak istersen:**
```bash
systemctl stop seyahatmetre
```

**Tekrar başlatmak:**
```bash
systemctl start seyahatmetre
```

---

## Ne zaman ne bekliyoruz

| Zaman | Beklenen |
|---|---|
| 1. gün | Kaynakların çalıştığını doğrularız |
| 1. hafta | İlk 2–3 fiyat değişimi yakalanır |
| 3–4. hafta | 8–12 değişim birikir, karar verecek veri oluşur |

**Karar metriği:** değişimlerin en az **%80'ini gece yarısından 2 saat önce** yakalayabiliyor muyuz?

- Evet → yakıt bildirimi çalışır, uygulamayı yazmaya başlarız
- Hayır → kaynakları değiştiririz, ya da takip tarafını ana ürün yaparız

Her iki durumda da bunu **uygulama yazmadan** öğrenmiş oluruz. Zaten bu adımın tüm amacı bu.
