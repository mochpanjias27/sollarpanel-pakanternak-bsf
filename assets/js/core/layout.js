// Kerangka bersama: navigasi menempel, laci menu ponsel, footer, tombol WA melayang.
import config, { waLink } from '../config.js';

const MENU = [
  { href: '/', label: 'Beranda', id: 'beranda' },
  { href: '/pakan', label: 'Pakan Ternak', pendek: 'Pakan', id: 'pakan', sub: [
    { href: '/pakan', label: 'Alur & mesin pakan', id: 'pakan' },
    { href: '/pakan-ayam', label: 'Pelet Ayam', id: 'pakan-ayam' },
    { href: '/pakan-ikan', label: 'Pelet Ikan', id: 'pakan-ikan' },
  ] },
  { href: '/pupuk', label: 'Pupuk Kompos', pendek: 'Pupuk', id: 'pupuk' },
  { href: '/energi', label: 'Energi Surya', pendek: 'Energi', id: 'energi' },
  { href: '/jadwal', label: 'Jadwal Produksi', pendek: 'Jadwal', id: 'jadwal' },
  { href: '/simulasi-3d', label: 'Simulasi 3D', id: 'simulasi-3d' },
  { href: '/edukasi', label: 'Edukasi', id: 'edukasi' },
  { href: '/galeri', label: 'Galeri', id: 'galeri' },
  { href: '/kontak', label: 'Kontak', id: 'kontak' },
];

export const IKON = {
  wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.36A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.08.8.82-3-.2-.31a8.2 8.2 0 1 1 6.96 3.84Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.22-.08-.39-.12-.55.13-.16.24-.63.8-.78.96-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.33.08-.16.04-.3-.02-.42l-.75-1.8c-.2-.48-.4-.4-.55-.41h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.86 2.04 4.77 4.77 0 0 0 1 2.53 10.9 10.9 0 0 0 4.18 3.7c1.55.67 2.16.73 2.93.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.1-.22-.16-.47-.28Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  tutup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  panah: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  kanan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

export const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true">
  <circle cx="20" cy="20" r="19" fill="#10372a"/>
  <circle cx="27" cy="12" r="5" fill="#f2b705"/>
  <path d="M10 29c0-9 6-15 17-15-1 10-7 16-17 15Z" fill="#1fa34a"/>
  <path d="M10 29c4-5 8-8 13-10" stroke="#e3f0dc" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <rect x="9" y="30.5" width="7" height="2.4" rx="1" fill="#f06a1d"/><rect x="17.5" y="30.5" width="7" height="2.4" rx="1" fill="#2f63d6"/>
</svg>`;

function aktif(id, halaman) {
  return id === halaman ? ' aria-current="page"' : '';
}

export function pasangLayout() {
  const halaman = document.body.dataset.halaman || '';
  const induk = MENU.find((m) => m.sub?.some((s) => s.id === halaman));

  const nav = MENU.map((m) => m.sub
    ? `<div class="grup${induk === m || m.id === halaman ? ' aktif' : ''}"><a href="${m.href}">${m.pendek || m.label} ▾</a><div class="menu-turun">${m.sub.map((s) => `<a href="${s.href}"${aktif(s.id, halaman)}>${s.label}</a>`).join('')}</div></div>`
    : `<a href="${m.href}"${aktif(m.id, halaman)}>${m.pendek || m.label}</a>`).join('');

  const laci = MENU.map((m) => m.sub
    ? `<a href="${m.href}"${aktif(m.id, halaman)}>${m.label}<span>›</span></a>${m.sub.slice(1).map((s) => `<a class="sub" href="${s.href}"${aktif(s.id, halaman)}>${s.label}</a>`).join('')}`
    : `<a href="${m.href}"${aktif(m.id, halaman)}>${m.label}<span>›</span></a>`).join('');

  const kepala = document.createElement('header');
  kepala.className = 'kepala';
  kepala.innerHTML = `<div class="wadah">
      <a class="logo" href="/" aria-label="Beranda ${config.situs.nama}">${LOGO}<span><b>Bening Saguling</b><small>${config.situs.namaFasilitas}</small></span></a>
      <nav class="nav" aria-label="Menu utama">${nav}</nav>
      <a class="lencana-demo" href="/energi" title="Data energi masih simulasi (Tahap 1)"><i></i>MODE DEMO</a>
      <button class="tombol-menu" aria-label="Buka menu" aria-expanded="false" aria-controls="laci">${IKON.menu}</button>
    </div>`;
  const laciEl = document.createElement('nav');
  laciEl.className = 'laci'; laciEl.id = 'laci'; laciEl.setAttribute('aria-label', 'Menu');
  laciEl.innerHTML = laci + `<p style="margin-top:22px"><a class="tombol wa" style="font:700 1rem var(--font);border:0;justify-content:center" href="${waLink('Halo Bening Saguling, saya ingin bertanya.')}" target="_blank" rel="noopener">${IKON.wa} Chat WhatsApp</a></p>`;
  document.body.prepend(laciEl);
  document.body.prepend(kepala);

  const tbl = kepala.querySelector('.tombol-menu');
  tbl.addEventListener('click', () => {
    const buka = !laciEl.classList.contains('buka');
    laciEl.classList.toggle('buka', buka);
    tbl.setAttribute('aria-expanded', String(buka));
    tbl.innerHTML = buka ? IKON.tutup : IKON.menu;
    document.documentElement.style.overflow = buka ? 'hidden' : '';
  });

  if (!document.body.classList.contains('tanpa-kaki')) {
    const kaki = document.createElement('footer');
    kaki.className = 'kaki';
    kaki.innerHTML = `<div class="wadah">
      <div class="kisi-kaki">
        <div>
          <a class="logo" href="/" style="color:#fff;margin-bottom:14px">${LOGO}<span><b>${config.situs.nama}</b><small style="color:#9fc1ab">${config.situs.namaFasilitas}</small></span></a>
          <p>Mengolah sampah organik rumah tangga menjadi pelet pakan berbahan maggot dan pupuk kompos granul, dengan listrik dari panel surya.</p>
          <p class="catatan" style="color:#9fc1ab">${config.situs.alamat}</p>
        </div>
        <div><h4>Jelajahi</h4><ul>
          <li><a href="/pakan">Pakan ternak</a></li><li><a href="/pupuk">Pupuk kompos</a></li>
          <li><a href="/energi">Dasbor energi</a></li><li><a href="/jadwal">Jadwal produksi</a></li><li><a href="/simulasi-3d">Simulasi 3D</a></li>
        </ul></div>
        <div><h4>Hubungi</h4><ul>
          <li><a href="${waLink()}" target="_blank" rel="noopener">WhatsApp ${config.situs.whatsappTampil}</a></li>
          <li><a href="/kontak#kunjungan">Ajukan kunjungan</a></li><li><a href="/kontak#pesan">Pesan produk</a></li><li><a href="/edukasi">Edukasi &amp; FAQ</a></li>
        </ul></div>
      </div>
      <p class="kecil">MODE DEMO: data energi masih simulasi. Angka bertanda <span class="asumsi">asumsi</span> belum diverifikasi di lapangan dan bisa diubah di satu file konfigurasi. © ${new Date().getFullYear()} ${config.situs.nama}.</p>
    </div>`;
    document.body.append(kaki);
  }

  const wa = document.createElement('a');
  wa.className = 'wa-melayang';
  wa.href = waLink('Halo Bening Saguling, saya ingin bertanya tentang pakan/pupuk.');
  wa.target = '_blank'; wa.rel = 'noopener';
  wa.setAttribute('aria-label', 'Chat WhatsApp');
  wa.innerHTML = IKON.wa;
  document.body.append(wa);
}

pasangLayout();
