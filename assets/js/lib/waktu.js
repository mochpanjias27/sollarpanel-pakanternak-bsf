// Utilitas waktu WIB (UTC+7) yang sama di browser maupun server.
export const OFFSET_WIB_MS = 7 * 3600 * 1000;
export const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const NAMA_HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Objek "jam dinding" WIB: tanggal (YYYY-MM-DD), jam desimal, hari dalam pekan. */
export function wib(ms = Date.now()) {
  const d = new Date(ms + OFFSET_WIB_MS);
  const tanggal = d.toISOString().slice(0, 10);
  const jam = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  return { tanggal, jam, hari: d.getUTCDay(), ms };
}

/** Tambah n hari ke 'YYYY-MM-DD'. */
export function tambahHari(tanggal, n) {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function hariDari(tanggal) {
  return new Date(`${tanggal}T00:00:00Z`).getUTCDay();
}

export function labelTanggal(tanggal, pendek = false) {
  const d = new Date(`${tanggal}T00:00:00Z`);
  const h = d.getUTCDay();
  if (pendek) return `${NAMA_HARI_PENDEK[h]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
  return `${NAMA_HARI[h]}, ${d.getUTCDate()} ${NAMA_BULAN[d.getUTCMonth()]}`;
}

/** 10.5 → "10.30" */
export function labelJam(jamDesimal) {
  let j = Math.floor(jamDesimal + 1e-6);
  let m = Math.round((jamDesimal - j) * 60);
  if (m === 60) { j += 1; m = 0; }
  return `${String(j).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
}
