// rapor.js — toplanan veriden olcum raporu uretir
// KULLANIM: node rapor.js
//
// Cevapladigi soru: "Zam/indirim haberini, fiyat yururluge girmeden
// ne kadar once yakalayabiliyoruz?"

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.dirname(fileURLToPath(import.meta.url));
const VERI = path.join(KOK, 'veri');

function oku(dosya) {
  const p = path.join(VERI, dosya);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8')
    .split('\n').filter(Boolean)
    .map((s) => { try { return JSON.parse(s); } catch { return null; } })
    .filter(Boolean);
}

const olaylar = oku('olay.jsonl');
const haberler = oku('haber.jsonl');
const hatalar = oku('hata.jsonl');
const pompa = oku('pompa.jsonl');

function trTarih(iso) {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul', hour12: false,
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/** Bir olayin yururluge girdigi an: o gunun 00:00'i (Istanbul) */
function yururlukAni(olayIso) {
  const d = new Date(olayIso);
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  return new Date(`${p}T00:00:00+03:00`);
}

console.log('\n════════ SEYAHATMETRE — OLCUM RAPORU ════════\n');

console.log(`Toplanan veri`);
console.log(`  Pompa gozlemi   : ${pompa.length}`);
console.log(`  Fiyat degisimi  : ${olaylar.length}`);
console.log(`  Akaryakit haberi: ${haberler.length} (${haberler.filter(h => h.kullanilabilir).length} tanesi kullanilabilir)`);
console.log(`  Hata            : ${hatalar.length}`);

if (pompa.length) {
  console.log(`  Ilk kayit       : ${trTarih(pompa[0].zaman)}`);
  console.log(`  Son kayit       : ${trTarih(pompa[pompa.length - 1].zaman)}`);
}

// ---- Degisim basina yakalama analizi ----

if (olaylar.length === 0) {
  console.log('\n⚠ Henuz fiyat degisimi yakalanmadi. Birkac gun daha bekle.\n');
} else {
  console.log('\n──── DEGISIMLER ve YAKALAMA ────\n');

  const gecikmeler = [];

  // Ayni gun + ayni yakit icin tek olay say (farkli sehirler tekrarlamasin)
  const benzersiz = new Map();
  for (const o of olaylar) {
    const gun = trTarih(o.zaman).slice(0, 5);
    const anahtar = `${gun}|${o.yakit}|${o.yon}`;
    if (!benzersiz.has(anahtar)) benzersiz.set(anahtar, o);
  }

  // Haberin gercek ani: yayin_ani varsa onu kullan (tarama gecikmesinden etkilenmez)
  const haberAni = (h) => new Date(h.yayin_ani || h.zaman);
  const taramaGecikmeleri = [];

  for (const [anahtar, o] of benzersiz) {
    const yururluk = yururlukAni(o.zaman);
    const pencereBaslangic = new Date(yururluk.getTime() - 48 * 3600 * 1000);

    // Bu degisimi onceden haber veren ilk kullanilabilir haber
    const aday = haberler
      .filter((h) => h.kullanilabilir
        && h.yakitlar.includes(o.yakit)
        && h.yon === o.yon
        && haberAni(h) >= pencereBaslangic
        && haberAni(h) < yururluk)
      .sort((a, b) => haberAni(a) - haberAni(b))[0];

    const satirBas = `${anahtar.padEnd(24)} ${o.yon === 'zam' ? '+' : ''}${o.fark} TL`;

    if (!aday) {
      console.log(`  ✗ ${satirBas}  → onceden yakalanamadi`);
      gecikmeler.push(null);
      continue;
    }

    const oncelikDk = Math.round((yururluk - haberAni(aday)) / 60000);
    const saat = Math.floor(oncelikDk / 60), dk = oncelikDk % 60;
    const tutarUyum = aday.tutar != null && Math.abs(Math.abs(aday.tutar) - Math.abs(o.fark)) <= 0.05;

    // Bizim tarayicimiz haberi kac dakika sonra gordu?
    let gecikmeNotu = '';
    if (aday.yayin_ani) {
      const gecikmeDk = Math.round((new Date(aday.zaman) - new Date(aday.yayin_ani)) / 60000);
      if (gecikmeDk >= 0) {
        taramaGecikmeleri.push(gecikmeDk);
        gecikmeNotu = ` · biz ${gecikmeDk} dk sonra gorduk`;
      }
    }

    console.log(`  ${oncelikDk >= 120 ? '✓' : '~'} ${satirBas}  → ${saat} sa ${dk} dk once (${aday.kaynak}) ${tutarUyum ? '· tutar tutuyor' : '· tutar farkli'}${gecikmeNotu}`);
    gecikmeler.push(oncelikDk);
  }

  const yakalanan = gecikmeler.filter((g) => g != null);
  const erken = gecikmeler.filter((g) => g != null && g >= 120);

  console.log('\n──── OZET ────\n');
  console.log(`  Toplam degisim         : ${benzersiz.size}`);
  console.log(`  Onceden yakalanan      : ${yakalanan.length}  (%${Math.round(yakalanan.length / benzersiz.size * 100)})`);
  console.log(`  2+ saat once yakalanan : ${erken.length}  (%${Math.round(erken.length / benzersiz.size * 100)})   ← KARAR METRIGI`);

  if (yakalanan.length) {
    const ort = Math.round(yakalanan.reduce((a, b) => a + b, 0) / yakalanan.length);
    const sirali = [...yakalanan].sort((a, b) => a - b);
    const ortanca = sirali[Math.floor(sirali.length / 2)];
    console.log(`  Ortalama onceden haber : ${Math.floor(ort / 60)} sa ${ort % 60} dk`);
    console.log(`  Ortanca                : ${Math.floor(ortanca / 60)} sa ${ortanca % 60} dk`);
  }

  if (taramaGecikmeleri.length) {
    const ortG = Math.round(taramaGecikmeleri.reduce((a, b) => a + b, 0) / taramaGecikmeleri.length);
    const enKotu = Math.max(...taramaGecikmeleri);
    console.log(`\n  Tarama gecikmemiz    : ortalama ${ortG} dk, en kotu ${enKotu} dk`);
    console.log(`  (Yukaridaki oranlar haberin YAYIN anina gore. Tarama gecikmesi`);
    console.log(`   olcumu bozmaz ama gercek uygulamada bildirim o kadar gec gider.)`);
  }

  const oran = benzersiz.size ? erken.length / benzersiz.size : 0;
  console.log('\n──── KARAR ────\n');
  if (benzersiz.size < 8) {
    console.log('  ⏳ Henuz erken. En az 8-10 degisim gorulmeli. Toplamaya devam.');
  } else if (oran >= 0.8) {
    console.log('  ✅ Yakit bildirimi CALISIR. Degisimlerin %80+\'ini 2 saatten once yakaliyoruz.');
  } else if (oran >= 0.5) {
    console.log('  ⚠️  Sinirda. Kaynak listesini genislet, tekrar olc.');
  } else {
    console.log('  ❌ Bu kaynaklarla yakit bildirimi calismaz.');
    console.log('     Ya kaynaklari degistir, ya da takip tarafini ana urun yap.');
  }
}

// ---- Kaynak sagligi ----

if (hatalar.length) {
  console.log('\n──── KAYNAK SAGLIGI ────\n');
  const sayac = {};
  for (const h of hatalar) sayac[h.kaynak] = (sayac[h.kaynak] || 0) + 1;
  for (const [k, n] of Object.entries(sayac).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(24)} ${n} hata`);
  }
  console.log('\n  Cok hata veren kaynak varsa kaynaklar.json\'dan cikar veya duzelt.');
}

// ---- Haber kaynagi performansi ----

const kullanilabilir = haberler.filter((h) => h.kullanilabilir);
if (kullanilabilir.length) {
  console.log('\n──── HANGI KAYNAK ISE YARIYOR ────\n');
  const sayac = {};
  for (const h of kullanilabilir) sayac[h.kaynak] = (sayac[h.kaynak] || 0) + 1;
  for (const [k, n] of Object.entries(sayac).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(24)} ${n} kullanilabilir haber`);
  }
}

console.log('\n════════════════════════════════════════════\n');
