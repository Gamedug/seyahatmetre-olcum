// topla.js — Seyahatmetre veri toplayicisi
//
// KULLANIM
//   node topla.js --test    → bir kez calisir, ne buldugunu ekrana yazar, HICBIR SEY KAYDETMEZ
//   node topla.js --once    → bir kez calisir ve kaydeder (GitHub Actions icin)
//   node topla.js           → surekli calisir (kendi sunucun icin)
//
// Hicbir npm paketi gerektirmez. Node 18+ yeterlidir.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pompaFiyatiAyikla, rssAyikla, haberAyikla, tarihCevir } from './ayikla.js';

const KOK = path.dirname(fileURLToPath(import.meta.url));
const VERI = path.join(KOK, 'veri');
const AYAR = JSON.parse(fs.readFileSync(path.join(KOK, 'kaynaklar.json'), 'utf8'));
const TEST = process.argv.includes('--test');
const TEK_SEFER = process.argv.includes('--once');

// Bazi siteler bot kimliklerini 403 ile reddediyor. Kimligi kaynaklar.json'dan
// degistirebilirsin. Istek sikligi zaten dusuk (10 dk), kimseyi yormuyoruz.
const UA = AYAR.ayarlar?.tarayici_kimligi
  || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const ZAMAN_ASIMI_MS = 20000;

// ---------- Dosya yardimcilari ----------

fs.mkdirSync(VERI, { recursive: true });

function yaz(dosya, kayit) {
  if (TEST) return;
  fs.appendFileSync(path.join(VERI, dosya), JSON.stringify(kayit) + '\n', 'utf8');
}

function durumOku() {
  const p = path.join(VERI, 'durum.json');
  if (!fs.existsSync(p)) return { son_fiyatlar: {}, gorulen_linkler: [] };
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return { son_fiyatlar: {}, gorulen_linkler: [] }; }
}

function durumYaz(durum) {
  if (TEST) return;
  durum.gorulen_linkler = durum.gorulen_linkler.slice(-3000); // sinirsiz buyumesin
  fs.writeFileSync(path.join(VERI, 'durum.json'), JSON.stringify(durum, null, 2), 'utf8');
}

// ---------- Zaman ----------

/** Istanbul saatine gore { iso, saat, tarih } */
function simdi() {
  const d = new Date();
  const tr = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d).reduce((o, p) => (o[p.type] = p.value, o), {});
  return {
    iso: d.toISOString(),
    saat: Number(tr.hour),
    dakika: Number(tr.minute),
    tarih: `${tr.year}-${tr.month}-${tr.day}`,
    yerel: `${tr.year}-${tr.month}-${tr.day} ${tr.hour}:${tr.minute}:${tr.second}`,
  };
}

function yogunSaatMi(saat) {
  const { yogun_saat_baslangic: b, yogun_saat_bitis: s } = AYAR.ayarlar;
  return b > s ? (saat >= b || saat < s) : (saat >= b && saat < s);
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Ag ----------

async function getir(url) {
  const kontrol = new AbortController();
  const zamanlayici = setTimeout(() => kontrol.abort(), ZAMAN_ASIMI_MS);
  try {
    const yanit = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      },
      signal: kontrol.signal,
      redirect: 'follow',
    });
    if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
    return await yanit.text();
  } finally {
    clearTimeout(zamanlayici);
  }
}

// ---------- Pompa fiyatlari ----------

async function pompalariTara(durum) {
  const t = simdi();
  const bulgular = [];

  for (const k of AYAR.pompa_kaynaklari) {
    try {
      const html = await getir(k.url);
      const fiyatlar = pompaFiyatiAyikla(html);
      const adet = Object.keys(fiyatlar).length;

      if (adet === 0) {
        yaz('hata.jsonl', { zaman: t.iso, kaynak: k.kod, hata: 'fiyat bulunamadi' });
        bulgular.push({ kaynak: k.kod, fiyatlar: {}, uyari: 'fiyat bulunamadi' });
        continue;
      }

      yaz('pompa.jsonl', { zaman: t.iso, yerel: t.yerel, kaynak: k.kod, sehir: k.sehir, fiyatlar });

      // Degisim var mi?
      for (const [yakit, fiyat] of Object.entries(fiyatlar)) {
        const anahtar = `${k.kod}:${yakit}`;
        const onceki = durum.son_fiyatlar[anahtar];
        if (onceki != null && Math.abs(onceki - fiyat) >= 0.01) {
          const olay = {
            zaman: t.iso, yerel: t.yerel,
            kaynak: k.kod, sehir: k.sehir, yakit,
            eski: onceki, yeni: fiyat,
            fark: Number((fiyat - onceki).toFixed(3)),
            yon: fiyat > onceki ? 'zam' : 'indirim',
          };
          yaz('olay.jsonl', olay);
          console.log(`  ★ DEGISIM  ${k.sehir} ${yakit}: ${onceki} → ${fiyat} (${olay.fark > 0 ? '+' : ''}${olay.fark})`);
        }
        durum.son_fiyatlar[anahtar] = fiyat;
      }

      bulgular.push({ kaynak: k.kod, fiyatlar });
    } catch (e) {
      yaz('hata.jsonl', { zaman: t.iso, kaynak: k.kod, hata: String(e.message || e) });
      bulgular.push({ kaynak: k.kod, hata: String(e.message || e) });
    }
    await bekle(1500); // kaynaklari yormayalim
  }

  return bulgular;
}

// ---------- Haberler ----------

async function haberleriTara(durum) {
  const t = simdi();
  const bulgular = [];
  const gorulen = new Set(durum.gorulen_linkler);

  for (const k of AYAR.haber_kaynaklari) {
    try {
      const xml = await getir(k.url);
      const kayitlar = rssAyikla(xml);
      let yeni = 0, ilgili = 0;

      for (const kayit of kayitlar) {
        const kimlik = kayit.link || kayit.baslik;
        if (gorulen.has(kimlik)) continue;
        gorulen.add(kimlik);
        durum.gorulen_linkler.push(kimlik);
        yeni++;

        const cozum = haberAyikla(`${kayit.baslik} ${kayit.ozet}`);
        if (!cozum) continue;
        ilgili++;

        const satir = {
          zaman: t.iso,                       // biz ne zaman gorduk
          yayin_ani: tarihCevir(kayit.yayin_tarihi), // haber ne zaman yayinlandi (daha dogru)
          yerel: t.yerel,
          kaynak: k.kod,
          baslik: kayit.baslik,
          link: kayit.link,
          yayin_tarihi: kayit.yayin_tarihi,
          ...cozum,
        };
        yaz('haber.jsonl', satir);

        if (cozum.kullanilabilir) {
          console.log(`  ⚡ HABER   [${k.kod}] ${cozum.yakitlar.join(',')} ${cozum.yon} ${cozum.tutar} TL — ${kayit.baslik.slice(0, 70)}`);
        }
        bulgular.push(satir);
      }

      if (TEST) console.log(`  · ${k.kod}: ${kayitlar.length} kayit, ${yeni} yeni, ${ilgili} akaryakit ilgili`);
    } catch (e) {
      yaz('hata.jsonl', { zaman: t.iso, kaynak: k.kod, hata: String(e.message || e) });
      if (TEST) console.log(`  ✗ ${k.kod}: ${e.message || e}`);
    }
    await bekle(1000);
  }

  return bulgular;
}

// ---------- Tur ----------

async function tur() {
  const t = simdi();
  const durum = durumOku();

  console.log(`\n[${t.yerel}] tur basliyor ${yogunSaatMi(t.saat) ? '(yogun saat)' : ''}`);

  const pompa = await pompalariTara(durum);
  const haber = await haberleriTara(durum);

  durumYaz(durum);

  if (TEST) {
    console.log('\n=== POMPA SONUCLARI ===');
    for (const p of pompa) {
      if (p.hata) console.log(`  ✗ ${p.kaynak}: ${p.hata}`);
      else if (p.uyari) console.log(`  ⚠ ${p.kaynak}: ${p.uyari} — sayfa yapisi degismis olabilir`);
      else console.log(`  ✓ ${p.kaynak}: ${JSON.stringify(p.fiyatlar)}`);
    }
    console.log('\n=== AKARYAKIT ILGILI HABERLER ===');
    if (haber.length === 0) console.log('  (su an yok — normal, degisim gunlerinde cikar)');
    for (const h of haber.slice(0, 10)) {
      console.log(`  · [${h.kaynak}] ${h.yon || '?'} ${h.tutar ?? '?'} ${h.yakitlar.join(',') || '?'} — ${h.baslik.slice(0, 60)}`);
    }
    console.log('\nTest bitti. Yukaridaki ciktiyi oldugu gibi Claude\'a yapistir.\n');
  }
}

// ---------- Ana dongu ----------

async function main() {
  const mod = TEST ? 'TEST MODU (kaydetmez)' : TEK_SEFER ? 'TEK SEFER (kaydeder)' : 'surekli mod';
  console.log('Seyahatmetre toplayici — ' + mod);
  console.log('Veri klasoru: ' + VERI);

  if (TEST || TEK_SEFER) { await tur(); return; }

  // Surekli mod: hata olsa da durma
  for (;;) {
    try { await tur(); }
    catch (e) {
      console.error('Tur hatasi:', e.message || e);
      yaz('hata.jsonl', { zaman: simdi().iso, kaynak: 'genel', hata: String(e.message || e) });
    }
    const t = simdi();
    const dk = yogunSaatMi(t.saat) ? AYAR.ayarlar.yogun_aralik_dakika : AYAR.ayarlar.sakin_aralik_dakika;
    console.log(`[${t.yerel}] sonraki tur ${dk} dakika sonra`);
    await bekle(dk * 60 * 1000);
  }
}

main().catch((e) => { console.error('Olumcul hata:', e); process.exit(1); });
