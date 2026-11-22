import config, { waLink } from '../config.js';

const s = config.situs;
document.getElementById('alamat').textContent = s.alamat;
document.getElementById('wa-utama').href = waLink('Halo Bening Saguling, saya ingin bertanya.');
document.getElementById('wa-utama').textContent = `WhatsApp ${s.whatsappTampil}`;
document.getElementById('arah').href = `https://www.google.com/maps/dir/?api=1&destination=${s.lintang},${s.bujur}`;
document.getElementById('peta').src = `https://www.google.com/maps?q=${encodeURIComponent(s.alamat)}&z=15&output=embed`;

const tab = (nama) => {
  document.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === nama)));
  document.getElementById('form-kunjungan').classList.toggle('sembunyi', nama !== 'kunjungan');
  document.getElementById('form-pesan').classList.toggle('sembunyi', nama !== 'pesan');
};
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => tab(b.dataset.tab)));
if (location.hash === '#pesan') tab('pesan');
window.addEventListener('hashchange', () => tab(location.hash === '#pesan' ? 'pesan' : 'kunjungan'));

const tgl = document.querySelector('[name="tanggal"]');
tgl.min = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

document.querySelectorAll('form[data-form]').forEach((f) => f.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  const teks = f.dataset.form === 'kunjungan'
    ? `*Pengajuan kunjungan*\nNama: ${d.nama}\nInstansi: ${d.instansi || '-'}\nTanggal: ${d.tanggal}\nJumlah: ${d.jumlah} orang\nMinat: ${d.minat}\nCatatan: ${d.catatan || '-'}`
    : `*Pemesanan produk*\nNama: ${d.nama}\nNo. HP: ${d.hp || '-'}\nProduk: ${d.produk}\nJumlah: ${d.jumlah} kg\nPengambilan: ${d.kirim}\nCatatan: ${d.catatan || '-'}`;
  window.open(waLink(teks), '_blank', 'noopener');
}));
