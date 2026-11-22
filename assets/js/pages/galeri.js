import config from '../config.js';

// Tambahkan foto kegiatan baru di sini: { src, teks, jenis: 'foto' }
const FOTO = [
  { src: 'mixer-bahan-granul', teks: 'Mixer bahan granul dengan screw conveyor; di latar, poster alur proses fasilitas.' },
  { src: 'mesin-ayak-kompos', teks: 'Mesin ayak kompos: tabung ayakan berputar.' },
  { src: 'peletizer-pakan', teks: 'Peletizer pakan tipe flat die; di latar, mesin pengering maggot.' },
  { src: 'mixer-bahan-pakan', teks: 'Mixer bahan pakan tipe ribbon.' },
  { src: 'mesin-penepung-maggot', teks: 'Mesin penepung maggot dan hasil pelet.' },
  { src: 'inverter-solis', teks: 'Inverter Solis 5G 3 fasa on-grid dengan data logger dan panel AC.' },
  { src: 'meter-acrel', teks: 'Meter multi-fungsi Acrel DTSD1352-C dan pengaman surja (SPD).' },
  { src: 'panel-distribusi', teks: 'Panel distribusi: MCCB, dua kWh meter 3 fasa, dan CT 100/5 A.' },
].map((f) => ({ ...f, jenis: 'foto', besar: `/assets/img/foto/${f.src}.webp`, kecil: `/assets/img/foto/${f.src}-sm.webp` }));

const RENDER = config.mesin.filter((m) => !m.foto).map((m) => ({
  jenis: 'render', teks: `${m.nama} (ilustrasi 3D)`, besar: `/assets/img/render/${m.id}.webp`, kecil: `/assets/img/render/${m.id}-sm.webp`,
}));

const semua = [...FOTO, ...RENDER];
const g = document.getElementById('galeri');
function tampil(saring) {
  g.innerHTML = semua.filter((x) => saring === 'semua' || x.jenis === saring).map((x, i) => `
    <figure data-i="${semua.indexOf(x)}"><img class="${x.jenis}" src="${x.kecil}" alt="${x.teks}" loading="${i < 4 ? 'eager' : 'lazy'}"><figcaption>${x.teks}</figcaption></figure>`).join('');
}
tampil('semua');
document.querySelectorAll('[data-saring]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-saring]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  tampil(b.dataset.saring);
}));

const lb = document.getElementById('lightbox');
g.addEventListener('click', (e) => {
  const f = e.target.closest('figure');
  if (!f) return;
  const x = semua[Number(f.dataset.i)];
  document.getElementById('lb-img').src = x.besar;
  document.getElementById('lb-img').alt = x.teks;
  document.getElementById('lb-teks').textContent = x.teks;
  lb.showModal();
});
lb.addEventListener('click', () => lb.close());
