import config, { mesinById } from '../config.js';
import { ambilPrakiraan } from '../core/data.js';
import { angka1, angka0, rupiah, persen, escapeHTML } from '../core/format.js';
import { susunJadwal } from '../lib/penjadwal.js';
import { labelJam, labelTanggal } from '../lib/waktu.js';

const $ = (id) => document.getElementById(id);
const KUNCI = 'bsf-jadwal-tersimpan';
const WARNA = { hijau: '#22a35a', kuning: '#f2b705', merah: '#d24a33' };
let hasil = null;
let horizon = 7;

// tabel mesin dari config
$('tabel-mesin').innerHTML = config.produksi.map((a) => a.langkah.map((l, i) => {
  const m = mesinById[l.mesin];
  return `<tr>${i === 0 ? `<td rowspan="${a.langkah.length}"><b>${a.nama}</b><br><span class="catatan">prioritas ${a.prioritas}</span></td>` : ''}
    <td>${m.nama}</td><td class="angka-sel">${angka1(m.dayaKW)} kW${m.asumsi ? '*' : ''}</td><td class="angka-sel">${angka1(l.durasiJam)} jam</td>
    ${i === 0 ? `<td rowspan="${a.langkah.length}">${a.perMinggu}× per minggu</td>` : ''}</tr>`;
}).join('')).join('');

document.querySelectorAll('.segmen button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.segmen button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  horizon = Number(b.dataset.hari);
  susun();
}));

async function susun() {
  $('info-sumber').textContent = 'Memuat prakiraan…';
  const pk = await ambilPrakiraan(horizon);
  hasil = susunJadwal(config, pk, { hari: horizon });
  const tersimpan = bacaTersimpan();
  $('info-sumber').innerHTML = `Prakiraan: <b>${pk.sumber === 'open-meteo' ? 'Open-Meteo (live)' : 'simulasi (MODE DEMO)'}</b>${pk.galat ? ` · ${escapeHTML(pk.galat)}` : ''} · disusun ${new Date(hasil.dibuat).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB` +
    (tersimpan ? ` · jadwal tersimpan terakhir: ${new Date(tersimpan.disimpan).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })}` : '');
  tampilRingkasan();
  tampilPeringatan();
  tampilRekomendasi();
  tampilHari();
}

function tampilRingkasan() {
  const r = hasil.ringkasan;
  const kartu = (cls, label, nilai, sub) => `<div class="kartu angka ${cls}"><div class="label"><i></i>${label}</div><div class="nilai" style="font-size:clamp(1.8rem,7vw,2.6rem)">${nilai}</div><div class="sub">${sub}</div></div>`;
  $('ringkasan').innerHTML = [
    kartu('surya', 'Hemat PLN', `${angka1(r.hematKWh)}<small>kWh</small>`, `≈ ${rupiah(r.hematRp)} dalam ${horizon} hari dibanding jadwal kebiasaan`),
    kartu('', 'Kebutuhan dari surya', persen(r.rasioSuryaOptimal), `jadwal kebiasaan: ${persen(r.rasioSuryaKebiasaan)}`),
    kartu('pln', 'Sisa impor PLN', `${angka1(r.imporOptimalKWh)}<small>kWh</small>`, `kebiasaan: ${angka1(r.imporKebiasaanKWh)} kWh (jam kerja)`),
    kartu('beban', 'Energi mesin', `${angka0(r.energiBebanKWh)}<small>kWh</small>`, `${hasil.tugas.length} pekerjaan terjadwal`),
  ].join('');
}

function tampilPeringatan() {
  const p = hasil.peringatan;
  $('blok-peringatan').classList.toggle('sembunyi', !p.length);
  $('peringatan').innerHTML = p.map((x) => `<div class="peringatan ${x.tingkat}"><div class="ikon">${x.tingkat === 'tinggi' ? '⛈️' : '🌥️'}</div><div>${escapeHTML(x.teks)}</div></div>`).join('');
}

function tampilRekomendasi() {
  const w = $('rekomendasi');
  w.classList.remove('kotak-memuat', 'gemar');
  const daftar = [...hasil.rekomendasi].sort((a, b) => b.hematKWh - a.hematKWh);
  const penting = daftar.filter((r) => r.hematKWh >= 0.1);
  const lain = daftar.filter((r) => r.hematKWh < 0.1);
  const baris = (r, i) => `<div class="rekom"><div class="no">${i + 1}</div><div><b>${escapeHTML(r.teks)}</b><div class="catatan">${escapeHTML(r.alasan)}</div></div><div class="hemat">${r.hematKWh >= 0.05 ? `−${angka1(r.hematKWh)} kWh<small>≈ ${rupiah(r.hematRp)}</small>` : '<small>sudah optimal</small>'}</div></div>`;
  w.innerHTML = (penting.length ? penting.map(baris).join('') : '<p class="catatan">Jadwal kebiasaan sudah hampir optimal untuk prakiraan ini.</p>') +
    (lain.length ? `<details style="margin-top:10px"><summary>${lain.length} pekerjaan lain (selisih kecil)</summary>${lain.map((r, i) => baris(r, penting.length + i)).join('')}</details>` : '');
}

function svgHari(h) {
  const sph = 60 / hasil.resolusiMenit;
  const tugas = hasil.tugas.filter((t) => t.tanggal === h.tanggal);
  const jalurMesin = [...new Set(tugas.map((t) => t.mesinId))];
  const W = Math.max(300, ($('hari').clientWidth || 720) - 34);
  const x0 = 6, x1 = 18, kiri = W < 520 ? 96 : 128, kanan = 8, tinggiKurva = 90, tinggiJalur = 22;
  const H = tinggiKurva + 26 + jalurMesin.length * tinggiJalur + 6;
  const sx = (x) => kiri + ((x - x0) / (x1 - x0)) * (W - kiri - kanan);
  const yMax = Math.max(config.surya.dayaInverterKW * 0.8, ...h.beban, ...h.pv);
  const sy = (y) => tinggiKurva - (y / yMax) * (tinggiKurva - 8);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Garis waktu ${h.label}">`;
  for (let j = x0; j <= x1; j += W < 520 ? 3 : 2) s += `<line x1="${sx(j)}" x2="${sx(j)}" y1="0" y2="${H}" stroke="#eef0e8"/><text x="${sx(j)}" y="${tinggiKurva + 16}" text-anchor="middle" style="font:600 11px var(--font);fill:#8a978e">${String(j).padStart(2, '0')}</text>`;
  // area PV
  let d = '';
  for (let i = x0 * sph; i <= x1 * sph; i++) d += `${d ? 'L' : 'M'}${sx(i / sph).toFixed(1)},${sy(h.pv[i] ?? 0).toFixed(1)}`;
  s += `<path d="${d}L${sx(x1)},${sy(0)}L${sx(x0)},${sy(0)}Z" fill="#f9d872" opacity=".55"/><path d="${d}" fill="none" stroke="#e0a800" stroke-width="1.6"/>`;
  // beban per slot berwarna
  for (let i = x0 * sph; i < x1 * sph; i++) {
    const w = h.slotWarna[i];
    if (!w) continue;
    s += `<rect x="${sx(i / sph) + 0.5}" y="${sy(h.beban[i])}" width="${sx(1 / sph + x0) - sx(x0) - 1}" height="${sy(0) - sy(h.beban[i])}" fill="${WARNA[w]}" opacity=".85" rx="1.5"/>`;
  }
  s += `<line x1="${kiri}" x2="${W - kanan}" y1="${sy(0)}" y2="${sy(0)}" stroke="#c9cfc6"/><text x="${kiri - 8}" y="${sy(0) - 4}" text-anchor="end" style="font:700 11px var(--font);fill:#b38600">surya ☀</text>`;
  // jalur gantt
  jalurMesin.forEach((id, r) => {
    const y = tinggiKurva + 26 + r * tinggiJalur;
    s += `<text x="${kiri - 8}" y="${y + 14}" text-anchor="end" style="font:600 11px var(--font);fill:#56665c">${mesinById[id].singkat}</text>`;
    for (const t of tugas.filter((x) => x.mesinId === id)) {
      const warna = warnaTugas(h, t, sph);
      s += `<rect x="${sx(t.mulai)}" y="${y + 2}" width="${sx(t.selesai) - sx(t.mulai)}" height="${tinggiJalur - 6}" rx="5" fill="${WARNA[warna]}"><title>${mesinById[id].nama} ${labelJam(t.mulai)}–${labelJam(t.selesai)}</title></rect>`;
    }
  });
  return `${s}</svg>`;
}

function warnaTugas(h, t, sph) {
  const hit = { hijau: 0, kuning: 0, merah: 0 };
  for (let i = Math.round(t.mulai * sph); i < Math.round(t.selesai * sph); i++) if (h.slotWarna[i]) hit[h.slotWarna[i]]++;
  return Object.entries(hit).sort((a, b) => b[1] - a[1])[0][0];
}

function tampilHari() {
  const sph = 60 / hasil.resolusiMenit;
  $('hari').innerHTML = hasil.hari.map((h) => {
    const tugas = hasil.tugas.filter((t) => t.tanggal === h.tanggal);
    const status = !h.hariKerja ? '<span class="status-hari libur">Libur</span>'
      : `<span class="status-hari ${h.warna}">${h.warna === 'hijau' ? 'Surya penuh' : h.warna === 'kuning' ? 'Campuran' : 'Dominan PLN'} · ${persen(h.rasioSurya)} dari surya</span>`;
    return `<article class="kartu hari-jadwal">
      <div class="kepala-hari"><h3>${h.label}</h3>${status}</div>
      <div class="catatan" style="margin-bottom:8px">${cuacaIkon(h.cuaca)} ${h.cuaca} · puncak PV ±${angka1(h.pvPuncakKW)} kW · estimasi surya ${angka1(h.energiPV)} kWh · beban jam kerja ${angka1(h.energiBeban)} kWh</div>
      <div class="garis-waktu">${svgHari(h)}</div>
      ${tugas.length ? `<ul class="daftar-tugas">${tugas.map((t) => `<li><span class="jam">${labelJam(t.mulai)}–${labelJam(t.selesai)}</span><span><i class="w" style="background:${WARNA[warnaTugas(h, t, sph)]}"></i>${t.mesinNama} <span class="catatan">· ${t.alurNama}</span></span><span class="catatan num">${angka1(t.dayaKW)} kW</span></li>`).join('')}</ul>` : `<p class="catatan mb0">${h.hariKerja ? 'Tidak ada pekerjaan berat terjadwal.' : 'Hari libur.'}</p>`}
    </article>`;
  }).join('');
}

const cuacaIkon = (c) => (c === 'Cerah' ? '☀️' : c === 'Berawan' ? '⛅' : '🌧️');

function teksWA() {
  const baris = [`*Jadwal Produksi — ${config.situs.nama}*`, `Disusun ${new Date(hasil.dibuat).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB`, ''];
  for (const h of hasil.hari) {
    const tugas = hasil.tugas.filter((t) => t.tanggal === h.tanggal);
    if (!tugas.length) continue;
    baris.push(`*${h.label}* (${h.cuaca}, ${persen(h.rasioSurya)} surya)`);
    for (const t of tugas) baris.push(`• ${labelJam(t.mulai)}–${labelJam(t.selesai)} ${t.mesinSingkat}`);
    baris.push('');
  }
  if (hasil.peringatan.length) { baris.push('*Peringatan cuaca*'); hasil.peringatan.forEach((p) => baris.push(`⚠️ ${p.teks}`)); baris.push(''); }
  const r = hasil.ringkasan;
  baris.push(`Perkiraan hemat PLN: ${angka1(r.hematKWh)} kWh (≈ ${rupiah(r.hematRp)}) dibanding jadwal kebiasaan.`);
  return baris.join('\n');
}

function bacaTersimpan() {
  try { return JSON.parse(localStorage.getItem(KUNCI)); } catch { return null; }
}

$('btn-simpan').addEventListener('click', () => {
  try {
    localStorage.setItem(KUNCI, JSON.stringify({ disimpan: new Date().toISOString(), horizon, hasil }));
    $('btn-simpan').textContent = '✓ Tersimpan di perangkat ini';
    setTimeout(() => { $('btn-simpan').textContent = '💾 Simpan jadwal'; }, 2500);
  } catch {
    $('btn-simpan').textContent = 'Gagal menyimpan (penyimpanan browser tidak tersedia)';
  }
});
// wa.me tanpa nomor → pengguna memilih kontak/grup tujuan sendiri
$('btn-wa').addEventListener('click', () => window.open(`https://wa.me/?text=${encodeURIComponent(teksWA())}`, '_blank', 'noopener'));
$('btn-pdf').addEventListener('click', () => window.print());

susun();
