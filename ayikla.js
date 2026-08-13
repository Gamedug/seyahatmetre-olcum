// ayikla.js — metinden ve HTML'den bilgi cikaran fonksiyonlar
// Bagimlilik yok. Test edilebilir olsun diye ayri dosyada.

// ---------- Yardimcilar ----------

/** HTML etiketlerini temizler, bosluklari sadelestirir */
export function htmlTemizle(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "54,18" veya "54.18" -> 54.18 ; gecersizse null */
export function sayiCevir(s) {
  if (s == null) return null;
  const t = String(s).trim().replace(/\./g, '').replace(',', '.');
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/** Turkce buyuk/kucuk harf sorunlarini asmak icin sadelestirir */
export function sadelestir(s) {
  return String(s)
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .toLowerCase();
}

// ---------- Yakit turu tespiti ----------

const YAKIT_DESENLERI = [
  { kod: 'motorin', kelimeler: ['motorin', 'mazot', 'dizel', 'euro diesel', 'eurodiesel'] },
  { kod: 'benzin',  kelimeler: ['benzin', 'kursunsuz'] },
  { kod: 'lpg',     kelimeler: ['lpg', 'otogaz'] },
];

/** Metinde gecen yakit turlerini dondurur. Bulamazsa bos dizi. */
export function yakitBul(metin) {
  const d = sadelestir(metin);
  const bulunan = [];
  for (const y of YAKIT_DESENLERI) {
    if (y.kelimeler.some((k) => d.includes(k))) bulunan.push(y.kod);
  }
  return bulunan;
}

// ---------- Zam / indirim haberi ayiklama ----------

const ZAM_KELIMELERI = ['zam', 'zamlan', 'artis', 'arti', 'yukselis', 'pahalan'];
const INDIRIM_KELIMELERI = ['indirim', 'ucuzla', 'dusus', 'dusu', 'geriled'];

// "1,42 TL", "1.42 lira", "42 kurus"
const TUTAR_DESENI = /(\d{1,3}(?:[.,]\d{1,2})?)\s*(tl|lira|kurus|kuruş)/gi;

/**
 * Bir haber basligindan/ozetinden zam-indirim bilgisi cikarir.
 * Emin olamadigi hicbir seyi uydurmaz; alan null kalir.
 */
export function haberAyikla(metin) {
  const ham = String(metin || '');
  const d = sadelestir(ham);

  const yakitlar = yakitBul(ham);

  // Akaryakitla ilgisi yoksa hic ugrasma
  const akaryakitIlgili =
    yakitlar.length > 0 || d.includes('akaryakit') || d.includes('pompa fiyat');
  if (!akaryakitIlgili) return null;

  const zamVar = ZAM_KELIMELERI.some((k) => d.includes(k));
  const indirimVar = INDIRIM_KELIMELERI.some((k) => d.includes(k));

  let yon = null;
  if (zamVar && !indirimVar) yon = 'zam';
  else if (indirimVar && !zamVar) yon = 'indirim';
  // ikisi birden geciyorsa yon belirsiz -> null birakiyoruz

  // Tutarlari topla
  const tutarlar = [];
  let m;
  TUTAR_DESENI.lastIndex = 0;
  while ((m = TUTAR_DESENI.exec(ham)) !== null) {
    let deger = sayiCevir(m[1]);
    if (deger == null) continue;
    const birim = sadelestir(m[2]);
    if (birim === 'kurus') deger = deger / 100;
    // Pompa fiyatinin kendisi olabilir (orn 54,18 TL) — zam tutari degil.
    // 0,01 ile 15 TL arasi degisim tutari kabul ediyoruz.
    if (deger > 0 && deger <= 15) tutarlar.push(Number(deger.toFixed(3)));
  }

  const belirsiz = zamVar && indirimVar;

  return {
    yakitlar,                                  // ['motorin'] gibi
    yon,                                       // 'zam' | 'indirim' | null
    tutar: tutarlar.length ? tutarlar[0] : null,
    tum_tutarlar: tutarlar,
    belirsiz,                                  // hem zam hem indirim geciyorsa true
    // Bildirim tetiklemeye yeter mi?
    kullanilabilir: Boolean(yon && yakitlar.length > 0 && tutarlar.length > 0),
  };
}

// ---------- Pompa fiyati ayiklama ----------

// Sayfada "Motorin ... 54,18" gibi gecen yapiyi arar.
// Fiyat araligi 5-500 TL arasinda tutulur ki tarih/yuzde gibi sayilar karismasin.
const FIYAT_ARALIK_MIN = 5;
const FIYAT_ARALIK_MAX = 500;

/**
 * HTML icinden yakit turu -> fiyat eslemesi cikarmaya calisir.
 * Sayfa yapisi degisirse bos donebilir; bu yuzden --test modu var.
 */
export function pompaFiyatiAyikla(html) {
  const metin = htmlTemizle(html);
  const sonuc = {};

  for (const y of YAKIT_DESENLERI) {
    let enIyi = null;

    for (const kelime of y.kelimeler) {
      const d = sadelestir(metin);
      let idx = 0;
      while ((idx = d.indexOf(kelime, idx)) !== -1) {
        // Kelimeden sonraki 120 karakter icinde ilk makul sayiyi ara
        const pencere = metin.slice(idx, idx + 120);
        const sayilar = pencere.match(/\d{1,3}[.,]\d{2}/g) || [];
        for (const s of sayilar) {
          const v = sayiCevir(s);
          if (v != null && v >= FIYAT_ARALIK_MIN && v <= FIYAT_ARALIK_MAX) {
            if (enIyi == null) enIyi = v;
            break;
          }
        }
        if (enIyi != null) break;
        idx += kelime.length;
      }
      if (enIyi != null) break;
    }

    if (enIyi != null) sonuc[y.kod] = enIyi;
  }

  return sonuc; // orn { motorin: 54.18, benzin: 52.74 }
}

// ---------- RSS ayiklama ----------

/**
 * RSS tarihini ISO'ya cevirir. Cevrilemezse null.
 * ONEMLI: Yayin ani, bizim gordugumuz andan daha dogru bir olcumdur —
 * tarayici gecikse bile haberin gercekten ne zaman ciktigini soyler.
 */
export function tarihCevir(s) {
  if (!s) return null;
  const d = new Date(String(s).trim());
  if (Number.isNaN(d.getTime())) return null;
  // Cok eski veya gelecekteki tarihleri ele (bozuk besleme)
  const fark = Math.abs(Date.now() - d.getTime());
  if (fark > 400 * 24 * 3600 * 1000) return null;
  return d.toISOString();
}

/** RSS/Atom icinden baslik + ozet + link + tarih cikarir */
export function rssAyikla(xml) {
  const kayitlar = [];
  const bloklar = String(xml).split(/<item[\s>]|<entry[\s>]/i).slice(1);

  for (const blok of bloklar) {
    const al = (etiket) => {
      const re = new RegExp(`<${etiket}[^>]*>([\\s\\S]*?)</${etiket}>`, 'i');
      const m = blok.match(re);
      if (!m) return '';
      return htmlTemizle(m[1].replace(/<!\[CDATA\[|\]\]>/g, ''));
    };

    const baslik = al('title');
    if (!baslik) continue;

    let link = al('link');
    if (!link) {
      const m = blok.match(/<link[^>]*href="([^"]+)"/i);
      if (m) link = m[1];
    }

    kayitlar.push({
      baslik,
      ozet: al('description') || al('summary') || '',
      link,
      yayin_tarihi: al('pubDate') || al('published') || al('updated') || '',
    });
  }

  return kayitlar;
}
