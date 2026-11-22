// Kartu & alur mesin — dibangun dari config agar satu sumber data.
import config, { mesinById } from '../config.js';
import { IKON } from './layout.js';
import { angka1 } from './format.js';

export function gambarMesin(m, kecil = true) {
  if (m.foto) return { src: `/assets/img/foto/${m.foto}${kecil ? '-sm' : ''}.webp`, jenis: 'foto', tag: 'Foto lapangan' };
  return { src: `/assets/img/render/${m.id}${kecil ? '-sm' : ''}.webp`, jenis: 'render', tag: 'Ilustrasi 3D' };
}

export function kartuMesin(m) {
  const g = gambarMesin(m);
  const daya = m.dayaKW > 0 ? `${angka1(m.dayaKW).replace(',0', '')} kW` : 'Tanpa listrik';
  return `<article class="kartu kartu-mesin" id="mesin-${m.id}">
    <div class="gambar"><img class="${g.jenis}" src="${g.src}" alt="${m.nama}" loading="lazy" width="480" height="360"><span class="tag-gambar">${g.tag}</span></div>
    <div class="isi">
      <h3>${m.nama}</h3>
      <p>${m.fungsi}</p>
      <div class="spek"><span class="daya">⚡ ${daya}${m.asumsi ? ' *' : ''}</span>${m.kapasitas ? `<span>${m.kapasitas}${m.asumsi ? ' *' : ''}</span>` : ''}${m.motor?.length ? `<span>${m.motor.length} motor</span>` : ''}</div>
      ${m.catatan ? `<p class="catatan">${m.catatan}</p>` : ''}
      <div class="aksi"><a class="tombol kecil garis" href="/simulasi-3d?mesin=${m.id}">Lihat 3D ${IKON.kanan}</a></div>
    </div>
  </article>`;
}

export function pasangKartuMesin(wadah, kategori) {
  const daftar = config.mesin.filter((m) => m.kategori === kategori);
  wadah.innerHTML = daftar.map(kartuMesin).join('') ;
  const ada = daftar.some((m) => m.asumsi);
  if (ada) wadah.insertAdjacentHTML('afterend', '<p class="catatan" style="margin-top:14px">* Daya dan kapasitas adalah <span class="asumsi">asumsi</span> sampai pelat nama motor diperiksa.</p>');
}

/** Alur produksi: daftar langkah (id mesin atau objek {ikon, nama, ket}). */
export function pasangAlur(wadah, langkah) {
  const bagian = [];
  langkah.forEach((l, i) => {
    if (typeof l === 'string') {
      const m = mesinById[l];
      const g = gambarMesin(m);
      bagian.push(`<a class="langkah" href="#mesin-${m.id}"><img src="${g.src}" alt="" loading="lazy"><div><b>${m.nama.replace(/^Mesin /, '')}</b><span>${m.dayaKW > 0 ? `${String(m.dayaKW).replace('.', ',')} kW` : 'pasif'}</span></div></a>`);
    } else {
      bagian.push(`<div class="langkah"><div class="ikon">${l.ikon}</div><div><b>${l.nama}</b><span>${l.ket || ''}</span></div></div>`);
    }
    if (i < langkah.length - 1) bagian.push(`<div class="panah" aria-hidden="true">${IKON.panah}</div>`);
  });
  wadah.innerHTML = bagian.join('');
}
