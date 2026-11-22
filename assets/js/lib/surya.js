// Model radiasi & daya PV — dipakai simulasi dasbor dan prakiraan simulasi.
import { hariDari } from './waktu.js';

/** PRNG deterministik (mulberry32) dari string. */
export function acak(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TERBIT = 5.65; // ≈ Bandung Barat, rata-rata (WIB)
const TERBENAM = 17.85;

/** Radiasi langit cerah (W/m²) pada jam desimal. */
export function radiasiCerah(jam) {
  if (jam <= TERBIT || jam >= TERBENAM) return 0;
  const x = Math.PI * (jam - TERBIT) / (TERBENAM - TERBIT);
  return 985 * Math.pow(Math.sin(x), 1.25);
}

/** Karakter cuaca harian (deterministik per tanggal). Musim hujan: Nov–Mar. */
export function cuacaHarian(tanggal) {
  const r = acak(`cuaca-${tanggal}`);
  const bulan = Number(tanggal.slice(5, 7));
  const musimHujan = bulan >= 11 || bulan <= 3;
  const p = r();
  let jenis;
  if (musimHujan) jenis = p < 0.32 ? 'cerah' : p < 0.75 ? 'berawan' : 'hujan';
  else jenis = p < 0.6 ? 'cerah' : p < 0.9 ? 'berawan' : 'hujan';
  return {
    jenis,
    musimHujan,
    fase: [r() * 6.28, r() * 6.28, r() * 6.28],
    jamHujan: 12.5 + r() * 3, // hujan konvektif sore
    kedalaman: jenis === 'cerah' ? 0.12 : jenis === 'berawan' ? 0.4 : 0.7,
    r,
  };
}

/** Faktor tembus awan 0..1 pada jam tertentu (halus + gangguan cepat). */
export function faktorAwan(c, jam, gangguan = 0) {
  const [a, b, d] = c.fase;
  const lambat = 0.5 + 0.5 * Math.sin(jam * 0.9 + a) * Math.sin(jam * 0.37 + b);
  const cepat = 0.5 + 0.5 * Math.sin(jam * 7.3 + d) * Math.sin(jam * 3.1 + a);
  let tutupan = c.kedalaman * (0.55 * lambat + 0.45 * cepat);
  if (c.musimHujan && jam > c.jamHujan) tutupan += c.jenis === 'hujan' ? 0.45 : c.jenis === 'berawan' ? 0.2 : 0.05;
  tutupan += gangguan;
  return Math.max(0.08, Math.min(1, 1 - tutupan));
}

/** Radiasi simulasi (W/m²) untuk tanggal + jam. */
export function radiasiSimulasi(tanggal, jam, c = cuacaHarian(tanggal)) {
  return radiasiCerah(jam) * faktorAwan(c, jam);
}

/** Estimasi daya PV (kW) = kWp × G/1000 × efisiensi, dibatasi daya inverter. */
export function dayaPV(radiasi, surya) {
  const p = surya.kapasitasKWp * (radiasi / 1000) * surya.faktorEfisiensi;
  return Math.max(0, Math.min(surya.dayaInverterKW, p));
}

export function hariKerja(tanggal, config) {
  return config.hariKerja.includes(hariDari(tanggal));
}
