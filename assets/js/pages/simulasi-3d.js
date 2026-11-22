import config, { mesinById } from '../config.js';
import { ambilEnergi, ambilPrakiraan } from '../core/data.js';
import { angka1, persen } from '../core/format.js';
import { susunJadwal } from '../lib/penjadwal.js';
import { labelJam, wib } from '../lib/waktu.js';
import { gambarMesin } from '../core/mesin-ui.js';

const $ = (id) => document.getElementById(id);
const pendek = (m) => m.nama.replace(/^Mesin /, '');
const namaMesin = Object.fromEntries(config.mesin.map((m) => [m.id, m.singkat || pendek(m)]));

let adegan;
try {
  const { buatAdegan } = await import('../three/adegan.js');
  adegan = buatAdegan($('kanvas'), { mode: 'pabrik', namaMesin });
  $('memuat').remove();
} catch (err) {
  $('memuat').textContent = 'Perangkat ini tidak mendukung WebGL/3D. Coba buka di browser lain.';
  $('memuat').classList.remove('gemar');
  throw err;
}

let mode = 'manual';
let pvSekarang = 0;
let jadwal = null;
let hariAktif = null;
let jamSim = 7;
let putar = false;

// ---------- daftar saklar ----------
$('saklar').innerHTML = config.mesin.map((m) => `
  <li data-id="${m.id}">
    <div class="nm">${pendek(m)}<small>${m.dayaKW > 0 ? `${angka1(m.dayaKW)} kW` : 'pasif, tanpa listrik'} · ${m.kategori === 'pakan' ? 'Pakan' : 'Pupuk'}</small></div>
    <label class="saklar" onclick="event.stopPropagation()"><input type="checkbox" data-saklar="${m.id}" ${m.pasif ? 'checked disabled' : ''} aria-label="Nyalakan ${pendek(m)}"><span></span></label>
  </li>`).join('');
adegan.setAktif('komposter', true);

$('saklar').addEventListener('change', (e) => {
  const id = e.target.dataset.saklar;
  if (!id) return;
  if (mode === 'jadwal') setMode('manual');
  adegan.setAktif(id, e.target.checked);
  hitung();
});
$('saklar').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (li) { adegan.pilih(li.dataset.id); adegan.fokus(li.dataset.id); }
});

adegan.onPilih((id) => {
  document.querySelectorAll('#saklar li').forEach((li) => li.classList.toggle('dipilih', li.dataset.id === id));
  const d = $('detail');
  if (!id) { d.classList.add('sembunyi'); return; }
  const m = mesinById[id];
  const g = gambarMesin(m);
  d.classList.remove('sembunyi');
  d.innerHTML = `<div style="display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:center">
      <img src="${g.src}" alt="" style="width:72px;height:72px;object-fit:${g.jenis === 'foto' ? 'cover' : 'contain'};border-radius:10px;background:#fff">
      <div><h4>${m.nama}</h4><span style="font-size:.78rem;color:#9fc1ab">${g.tag} · ${m.dayaKW > 0 ? `${angka1(m.dayaKW)} kW${m.asumsi ? ' (asumsi)' : ''}` : 'tanpa listrik'}</span></div>
    </div>
    <p>${m.fungsi}</p>
    ${m.motor?.length ? `<p style="color:#9fc1ab">${m.motor.join(' · ')}</p>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${m.pasif ? '' : `<button class="tombol kecil oranye" id="btn-toggle">${adegan.aktif(id) ? 'Matikan' : 'Nyalakan'}</button>`}
      <button class="tombol kecil surya" id="btn-fokus">Fokus kamera</button>
      <a class="tombol kecil garis" style="--fg:#fff;box-shadow:inset 0 0 0 2px #fff6" href="/${m.kategori === 'pakan' ? 'pakan' : 'pupuk'}#mesin-${m.id}">Info</a>
    </div>`;
  $('btn-toggle')?.addEventListener('click', () => {
    if (mode === 'jadwal') setMode('manual');
    const baru = !adegan.aktif(id);
    adegan.setAktif(id, baru);
    document.querySelector(`[data-saklar="${id}"]`).checked = baru;
    $('btn-toggle').textContent = baru ? 'Matikan' : 'Nyalakan';
    hitung();
  });
  $('btn-fokus').addEventListener('click', () => adegan.fokus(id));
  bukaPanel(true);
});

// ---------- panel ----------
function bukaPanel(buka) {
  $('panel').classList.toggle('ciut', !buka);
  $('pegangan').setAttribute('aria-expanded', String(buka));
  $('pegangan-ikon').textContent = buka ? '▼' : '▲';
}
$('pegangan').addEventListener('click', () => bukaPanel($('panel').classList.contains('ciut')));
$('btn-ikhtisar').addEventListener('click', () => adegan.ikhtisar());
let label = true;
$('btn-label').addEventListener('click', () => { label = !label; adegan.setLabel(label); $('btn-label').textContent = `Label: ${label ? 'aktif' : 'mati'}`; });
$('btn-semua').addEventListener('click', () => {
  setMode('manual');
  for (const m of config.mesin) if (!m.pasif) { adegan.setAktif(m.id, false); document.querySelector(`[data-saklar="${m.id}"]`).checked = false; }
  hitung();
});

// ---------- mode ----------
document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
function setMode(m) {
  mode = m;
  document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  $('kendali-jadwal').classList.toggle('sembunyi', m !== 'jadwal');
  if (m === 'jadwal') siapkanJadwal();
  else { putar = false; $('btn-putar').textContent = '▶'; }
  hitung();
}

async function siapkanJadwal() {
  if (!jadwal) {
    $('info-jadwal').textContent = 'Menyusun jadwal dari prakiraan…';
    let tersimpan = null;
    try { tersimpan = JSON.parse(localStorage.getItem('bsf-jadwal-tersimpan')); } catch { /* abaikan */ }
    const hariIni = wib().tanggal;
    if (tersimpan?.hasil?.hari?.some((h) => h.tanggal >= hariIni)) {
      jadwal = tersimpan.hasil;
      $('info-jadwal').textContent = 'Memakai jadwal yang Anda simpan di halaman Jadwal.';
    } else {
      jadwal = susunJadwal(config, await ambilPrakiraan(7), { hari: 7 });
      $('info-jadwal').textContent = 'Jadwal disusun otomatis dari prakiraan 7 hari.';
    }
    const opsi = jadwal.hari.filter((h) => h.hariKerja);
    $('pilih-hari').innerHTML = opsi.map((h) => `<option value="${h.tanggal}">${h.label} · ${h.cuaca}</option>`).join('');
    hariAktif = opsi[0]?.tanggal;
  }
  terapkanJadwal();
}
$('pilih-hari').addEventListener('change', (e) => { hariAktif = e.target.value; terapkanJadwal(); });
$('geser-jam').addEventListener('input', (e) => { jamSim = Number(e.target.value); if (mode !== 'jadwal') setMode('jadwal'); terapkanJadwal(); });
$('btn-putar').addEventListener('click', () => {
  putar = !putar;
  $('btn-putar').textContent = putar ? '❚❚' : '▶';
  if (putar && jamSim >= 17.9) jamSim = 6;
});

function terapkanJadwal() {
  if (!jadwal || !hariAktif) return;
  const tugas = jadwal.tugas.filter((t) => t.tanggal === hariAktif && jamSim >= t.mulai && jamSim < t.selesai);
  const aktif = new Set(tugas.map((t) => t.mesinId));
  for (const m of config.mesin) {
    if (m.pasif) continue;
    adegan.setAktif(m.id, aktif.has(m.id));
    const cb = document.querySelector(`[data-saklar="${m.id}"]`);
    if (cb) cb.checked = aktif.has(m.id);
  }
  $('geser-jam').value = jamSim;
  hitung();
}

// ---------- hitung energi & HUD ----------
function hitung() {
  let pv, beban;
  if (mode === 'jadwal' && jadwal && hariAktif) {
    const h = jadwal.hari.find((x) => x.tanggal === hariAktif);
    const s = Math.min(h.pv.length - 1, Math.floor(jamSim * (60 / jadwal.resolusiMenit)));
    pv = h.pv[s]; beban = h.beban[s];
    $('hud-mode').textContent = `Jadwal · ${h.labelPendek}`;
    $('hud-jam').textContent = labelJam(jamSim);
  } else {
    pv = pvSekarang;
    const j = wib().jam;
    beban = (j >= config.jamKerja.mulai && j < config.jamKerja.selesai ? config.bebanDasarKW : config.bebanMalamKW) +
      config.mesin.filter((m) => !m.pasif && adegan.aktif(m.id)).reduce((t, m) => t + m.dayaKW, 0);
    $('hud-mode').textContent = 'Manual · surya sekarang';
    $('hud-jam').textContent = labelJam(j);
  }
  const impor = Math.max(0, beban - pv);
  adegan.setAliran(pv, impor);
  $('hud-pv').textContent = angka1(pv);
  $('hud-beban').textContent = angka1(beban);
  $('hud-impor').textContent = angka1(impor);
  $('hud-rasio').textContent = beban > 0 ? persen(Math.min(pv, beban) / beban) : '–';
}

async function segarkanEnergi() {
  const e = await ambilEnergi();
  pvSekarang = e.sekarang.pvKW;
  if (mode === 'manual') hitung();
}
segarkanEnergi();
setInterval(segarkanEnergi, config.mode.intervalSegarkanDetik * 1000);

// putar ulang jadwal: 1 jam simulasi per 4 detik
let tLalu = performance.now();
function tik(t) {
  const dt = (t - tLalu) / 1000; tLalu = t;
  if (putar && mode === 'jadwal') {
    jamSim += dt / 4;
    if (jamSim >= 18) { jamSim = 18; putar = false; $('btn-putar').textContent = '▶'; }
    terapkanJadwal();
  }
  requestAnimationFrame(tik);
}
requestAnimationFrame(tik);

// ---------- ?mesin=id dari halaman lain ----------
const q = new URLSearchParams(location.search);
const awal = q.get('mesin');
if (awal && mesinById[awal]) {
  setTimeout(() => { adegan.pilih(awal); adegan.fokus(awal); if (!mesinById[awal].pasif) { adegan.setAktif(awal, true); document.querySelector(`[data-saklar="${awal}"]`).checked = true; hitung(); } }, 300);
} else if (window.matchMedia('(min-width: 960px)').matches) {
  bukaPanel(true);
}
hitung();
