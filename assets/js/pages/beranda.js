import config, { mesinById } from '../config.js';
import { ambilEnergi, ambilPrakiraan } from '../core/data.js';
import { angka1, angka0, rupiah, jamMenit } from '../core/format.js';
import { grafikGaris } from '../core/grafik.js';
import { susunJadwal } from '../lib/penjadwal.js';

const $ = (id) => document.getElementById(id);
$('k-kwp').textContent = angka1(config.surya.kapasitasKWp);

const d = config.dampak;
$('dampak').innerHTML = [
  [`${angka1(d.sampahPerBulanTon)} ton`, 'sampah organik terolah'],
  [angka0(d.kkTerlayani), 'rumah tangga terlayani'],
  [`${angka0(d.peletPerBulanKg)} kg`, 'pelet pakan'],
  [`${angka0(d.komposPerBulanKg)} kg`, 'kompos & granul'],
].map(([n, l]) => `<div><div class="nilai">${n}</div><div class="label">${l}</div></div>`).join('');

async function segarkan() {
  const e = await ambilEnergi();
  const s = e.sekarang, h = e.hariIni;
  $('h-pv').textContent = angka1(s.pvKW);
  $('h-energi').textContent = angka1(h.pvKWh);
  $('h-waktu').textContent = jamMenit(e.diperbarui).slice(0, 5);
  $('h-bar').style.width = `${Math.min(100, (s.pvKW / config.surya.dayaInverterKW) * 100)}%`;
  $('k-pv').textContent = angka1(s.pvKW);
  $('k-energi').textContent = angka1(h.pvKWh);
  $('k-mesin').textContent = s.mesinAktif.length;
  $('k-mesin-nama').textContent = s.mesinAktif.length ? s.mesinAktif.map((id) => mesinById[id]?.nama.replace(/^Mesin /, '')).join(', ') : 'semua mesin berhenti';
  $('k-hemat').textContent = rupiah(h.hematRp);
}
segarkan();
setInterval(segarkan, config.mode.intervalSegarkanDetik * 1000);

// grafik mini: hari kerja berikutnya dari penjadwal
(async () => {
  const pk = await ambilPrakiraan(3);
  const j = susunJadwal(config, pk, { hari: 3 });
  const h = j.hari.find((x) => x.hariKerja && x.energiBeban > 3) || j.hari[0];
  const sph = 60 / j.resolusiMenit;
  const ke = (arr) => arr.map((y, i) => ({ x: i / sph, y })).filter((p) => p.x >= 5 && p.x <= 19);
  const w = $('mini-grafik');
  w.classList.remove('kotak-memuat', 'gemar');
  grafikGaris(w, [
    { nama: 'Estimasi surya', warna: '#f2b705', data: ke(h.pv), area: true, opasitas: 0.3 },
    { nama: 'Beban mesin', warna: '#f06a1d', data: ke(h.beban), tebal: 2.6 },
  ], { xMin: 5, xMax: 19, langkahX: 2, tinggi: 240 });
  w.insertAdjacentHTML('beforeend', `<p class="catatan mb0">Jadwal ${h.label}: ${Math.round(h.rasioSurya * 100)}% kebutuhan mesin dari surya (prakiraan ${j.sumberPrakiraan === 'open-meteo' ? 'Open-Meteo' : 'simulasi'}).</p>`);
})();
