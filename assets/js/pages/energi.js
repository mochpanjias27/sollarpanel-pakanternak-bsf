import config, { mesinById } from '../config.js';
import { ambilEnergi } from '../core/data.js';
import { angka1, angka2, rupiah, persen, jamMenit } from '../core/format.js';
import { grafikGaris } from '../core/grafik.js';
import { wib } from '../lib/waktu.js';

const $ = (id) => document.getElementById(id);
$('inv-kw').textContent = angka1(config.surya.dayaInverterKW);
$('tarif').textContent = rupiah(config.pln.tarifPerKWh);

$('tabel-sistem').innerHTML = [
  ['Kapasitas PV', `${angka1(config.surya.kapasitasKWp)} kWp (${config.surya.jumlahModul} × ${config.surya.wpPerModul} Wp)`, true],
  ['Inverter', config.surya.inverter, true],
  ['Daya inverter', `${angka1(config.surya.dayaInverterKW)} kW`, true],
  ['Baterai', 'Tidak ada (on-grid murni)', false],
  ['Meter', 'Acrel DTSD1352-C 3 fasa + 2 kWh meter 3 fasa', false],
  ['Tarif PLN', `${rupiah(config.pln.tarifPerKWh)}/kWh`, true],
  ['Ekspor ke PLN', config.pln.eksporDihargai ? 'Mengurangi tagihan' : 'Tidak mengurangi tagihan (verifikasi kontrak)', true],
].map(([k, v, a]) => `<tr><th style="width:38%">${k}</th><td>${v}${a ? ' <span class="asumsi">asumsi</span>' : ''}</td></tr>`).join('');

function cincin(el, nilai, warna, label) {
  const r = 46, k = 2 * Math.PI * r, p = Math.max(0, Math.min(1, nilai));
  el.innerHTML = `<svg viewBox="0 0 120 120" style="width:min(150px,100%);display:block;margin:auto">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#e7ebe1" stroke-width="13"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${warna}" stroke-width="13" stroke-linecap="round"
      stroke-dasharray="${k * p} ${k}" transform="rotate(-90 60 60)" style="transition:stroke-dasharray .8s"/>
    <text x="60" y="66" text-anchor="middle" style="font:800 24px var(--font-judul);fill:#10372a">${label}</text></svg>`;
}

function diagramAliran(e) {
  const s = e.sekarang;
  const pvKeMesin = Math.min(s.pvKW, s.bebanKW);
  const tebal = (p) => (p > 0.02 ? 3 + Math.min(14, p * 1.6) : 3);
  const durasi = (p) => `${Math.max(0.35, 2.2 - p * 0.22).toFixed(2)}s`;
  const jalur = (d, p, warna, id) => `
    <path class="jalur jalur-latar" d="${d}" stroke-width="${tebal(p) + 6}"/>
    ${p > 0.02 ? `<path class="jalur jalur-aktif" d="${d}" stroke="${warna}" stroke-width="${tebal(p)}" style="animation-duration:${durasi(p)}"/>` : ''}
    <text class="lbl-${id}"></text>`;
  const node = (x, y, judul, nilai, warna, ikon) => `
    <g transform="translate(${x},${y})">
      <rect x="-60" y="-42" width="120" height="84" rx="18" fill="#fff" stroke="${warna}" stroke-width="3"/>
      <text x="0" y="-12" text-anchor="middle" style="font-size:20px">${ikon}</text>
      <text x="0" y="10" text-anchor="middle" style="font:700 13px var(--font);fill:#56665c">${judul}</text>
      <text x="0" y="30" text-anchor="middle" style="font:800 19px var(--font-judul);fill:#10372a">${nilai}</text>
    </g>`;
  const W = Math.max(320, Math.min(560, $('aliran').clientWidth || 520));
  const xM = W - 68, a = 132, b = W - 132, tengah = W / 2;
  $('aliran').innerHTML = `<svg class="aliran-svg" viewBox="0 0 ${W} 300" role="img" aria-label="Diagram aliran energi: surya ${angka1(s.pvKW)} kW, PLN ${angka1(s.imporKW)} kW, mesin ${angka1(s.bebanKW)} kW">
    ${jalur(`M ${a} 70 C ${tengah} 70 ${tengah} 150 ${b} 150`, pvKeMesin, '#f2b705', 'pv')}
    ${jalur(`M ${a} 230 C ${tengah} 230 ${tengah} 150 ${b} 150`, s.imporKW, '#2f63d6', 'pln')}
    ${s.eksporKW > 0.05 ? `<path class="jalur jalur-aktif" d="M 68 112 L 68 188" stroke="#f2b705" stroke-width="${tebal(s.eksporKW) * 0.6}" style="animation-duration:${durasi(s.eksporKW)};opacity:.6"/>
      <text x="80" y="146" style="font:700 12px var(--font);fill:#8a6d00">surplus ${angka1(s.eksporKW)} kW</text><text x="80" y="162" style="font:700 12px var(--font);fill:#8a6d00">→ jaringan PLN</text>` : ''}
    ${node(68, 70, 'Panel surya', `${angka1(s.pvKW)} kW`, '#f2b705', '☀️')}
    ${node(68, 230, 'PLN', `${angka1(s.imporKW)} kW`, '#2f63d6', '🔌')}
    ${node(xM, 150, 'Mesin', `${angka1(s.bebanKW)} kW`, '#f06a1d', '⚙️')}
    <text x="${tengah}" y="96" text-anchor="middle" style="font:800 13px var(--font);fill:#8a6d00">${angka1(pvKeMesin)} kW</text>
    <text x="${tengah}" y="218" text-anchor="middle" style="font:800 13px var(--font);fill:#2048a8">${angka1(s.imporKW)} kW</text>
  </svg>`;
}

async function segarkan() {
  const e = await ambilEnergi();
  const s = e.sekarang, h = e.hariIni;
  $('pv').textContent = angka2(s.pvKW);
  $('beban').textContent = angka2(s.bebanKW);
  $('impor').textContent = angka2(s.imporKW);
  $('e-pv').textContent = angka1(h.pvKWh);
  $('e-terpakai').textContent = angka1(h.pvTerpakaiKWh);
  $('e-pln').textContent = angka1(h.imporKWh);
  $('mesin-aktif').textContent = s.mesinAktif?.length ? `Aktif: ${s.mesinAktif.map((id) => mesinById[id]?.nama.replace(/^Mesin /, '')).join(', ')}` : 'Tidak ada mesin bekerja';
  $('surplus').textContent = s.eksporKW > 0.05 ? `Surplus ${angka1(s.eksporKW)} kW mengalir ke PLN` : 'Tidak ada surplus';
  $('hemat').textContent = rupiah(h.hematRp);
  $('waktu').textContent = jamMenit(e.diperbarui);
  $('sumber').textContent = e.sumber === 'simulasi' ? 'simulasi (MODE DEMO)' : e.sumber;
  $('galat').textContent = e.galat || '';
  const inv = $('status-inv');
  inv.textContent = `Inverter: ${e.inverter.status}`;
  inv.className = `status-hari ${e.inverter.kode === 'ok' ? 'hijau' : e.inverter.kode === 'standby' ? 'libur' : 'merah'}`;
  cincin($('cincin-1'), h.rasioPemakaianSurya, '#f2b705', persen(h.rasioPemakaianSurya));
  cincin($('cincin-2'), h.rasioKebutuhanDariSurya, '#1fa34a', persen(h.rasioKebutuhanDariSurya));
  diagramAliran(e);
  const g = $('grafik');
  g.classList.remove('kotak-memuat', 'gemar');
  const ke = (k) => e.seri.map((p) => ({ x: p.jam, y: p[k] }));
  grafikGaris(g, [
    { nama: 'Daya PV', warna: '#f2b705', data: ke('pv'), area: true, opasitas: 0.28 },
    { nama: 'Beban', warna: '#f06a1d', data: ke('beban') },
    { nama: 'Impor PLN', warna: '#2f63d6', data: ke('impor'), area: true, opasitas: 0.15, tebal: 1.8 },
  ], { yMax: Math.max(config.surya.dayaInverterKW, ...e.seri.map((p) => p.beban)) * 1.05, penandaX: wib().jam, tinggi: 280 });
}
segarkan();
setInterval(segarkan, config.mode.intervalSegarkanDetik * 1000);
