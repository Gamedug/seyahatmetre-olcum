// test.js — ayikla.js dogru calisiyor mu? `node test.js`
import { haberAyikla, pompaFiyatiAyikla, rssAyikla, yakitBul, sayiCevir } from './ayikla.js';

let gecen = 0, kalan = 0;
function esit(ad, bulunan, beklenen) {
  const a = JSON.stringify(bulunan), b = JSON.stringify(beklenen);
  if (a === b) { gecen++; console.log(`  ✓ ${ad}`); }
  else { kalan++; console.log(`  ✗ ${ad}\n     beklenen: ${b}\n     bulunan : ${a}`); }
}

console.log('\n— sayiCevir —');
esit('virgullu', sayiCevir('54,18'), 54.18);
esit('binlik ayirici', sayiCevir('1.170'), 1170);
esit('bos', sayiCevir('abc'), null);

console.log('\n— yakitBul —');
esit('motorin', yakitBul('Motorine zam geldi'), ['motorin']);
esit('mazot esanlam', yakitBul('mazota indirim'), ['motorin']);
esit('benzin+motorin', yakitBul('Benzin ve motorin fiyatlari'), ['motorin', 'benzin']);
esit('ilgisiz', yakitBul('Dolar kuru yukseldi'), []);

console.log('\n— haberAyikla —');
esit('net zam',
  haberAyikla('Motorine gece yarisi 1,42 TL zam geldi'),
  { yakitlar: ['motorin'], yon: 'zam', tutar: 1.42, tum_tutarlar: [1.42], belirsiz: false, kullanilabilir: true });

esit('kurus birimi',
  haberAyikla('Benzine 85 kurus indirim'),
  { yakitlar: ['benzin'], yon: 'indirim', tutar: 0.85, tum_tutarlar: [0.85], belirsiz: false, kullanilabilir: true });

esit('tutarsiz baslik',
  haberAyikla('Akaryakita zam bekleniyor'),
  { yakitlar: [], yon: 'zam', tutar: null, tum_tutarlar: [], belirsiz: false, kullanilabilir: false });

esit('hem zam hem indirim (belirsiz)',
  haberAyikla('Motorine zam mi indirim mi geliyor? 1,00 TL'),
  { yakitlar: ['motorin'], yon: null, tutar: 1, tum_tutarlar: [1], belirsiz: true, kullanilabilir: false });

esit('alakasiz haber', haberAyikla('Merkez Bankasi faiz karari'), null);

esit('pompa fiyati zam tutari sanilmasin',
  haberAyikla('Motorin 54,18 TL oldu, zam 1,42 TL'),
  { yakitlar: ['motorin'], yon: 'zam', tutar: 1.42, tum_tutarlar: [1.42], belirsiz: false, kullanilabilir: true });

console.log('\n— pompaFiyatiAyikla —');
const ornekHtml = `
<div class="fiyat-tablo">
  <div class="satir"><span class="ad">Kursunsuz 95</span><span class="deger">52,74 TL</span></div>
  <div class="satir"><span class="ad">Motorin</span><span class="deger">54,18 TL</span></div>
  <div class="satir"><span class="ad">Otogaz (LPG)</span><span class="deger">27,05 TL</span></div>
</div>`;
esit('uc yakit', pompaFiyatiAyikla(ornekHtml), { motorin: 54.18, benzin: 52.74, lpg: 27.05 });
esit('bos sayfa', pompaFiyatiAyikla('<html><body>Sayfa bulunamadi</body></html>'), {});

console.log('\n— rssAyikla —');
const ornekRss = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[Motorine 1,42 TL zam]]></title>
<description>Bu gece 00:00 itibariyla</description>
<link>https://ornek.com/1</link><pubDate>Mon, 10 Aug 2026 19:02:00 +0300</pubDate></item>
<item><title>Dolar kuru</title><description>x</description>
<link>https://ornek.com/2</link><pubDate>Mon, 10 Aug 2026 18:00:00 +0300</pubDate></item>
</channel></rss>`;
const rss = rssAyikla(ornekRss);
esit('iki kayit', rss.length, 2);
esit('cdata basligi', rss[0].baslik, 'Motorine 1,42 TL zam');
esit('link', rss[0].link, 'https://ornek.com/1');

console.log(`\n${gecen} gecti, ${kalan} kaldi\n`);
process.exit(kalan === 0 ? 0 : 1);
