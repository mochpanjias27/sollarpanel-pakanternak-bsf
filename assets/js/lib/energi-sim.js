// Simulasi data energi (Tahap 1 / MODE DEMO).
// Bentuk keluaran SAMA dengan yang nanti dihasilkan adapter Solis/Modbus,
// sehingga halaman tidak perlu diubah saat data asli tersambung.
import { wib } from './waktu.js';
import { cuacaHarian, radiasiCerah, faktorAwan, dayaPV, hariKerja, acak } from './surya.js';

const LANGKAH_MENIT = 5;

/** Daya beban (kW) pada jam tertentu menurut jadwal demo. */
export function bebanPada(jam, tanggal, config, rnd = Math.random) {
  if (!config.demoSetiapHari && !hariKerja(tanggal, config)) return { p: config.bebanMalamKW, aktif: [] };
  const { mulai, selesai } = config.jamKerja;
  let p = jam >= mulai && jam < selesai ? config.bebanDasarKW : config.bebanMalamKW;
  const aktif = [];
  for (const j of config.demoHarian) {
    if (jam >= j.mulai && jam < j.selesai) {
      const m = config.mesin.find((x) => x.id === j.mesin);
      if (m) {
        p += m.dayaKW * (0.88 + rnd() * 0.12); // motor jarang bekerja di 100% beban
        aktif.push(m.id);
      }
    }
  }
  return { p, aktif };
}

/**
 * Data energi sehari sampai "sekarang".
 * @returns {{mode, sumber, diperbarui, tanggal, sekarang, hariIni, seri, inverter}}
 */
export function simulasiEnergi(config, nowMs = Date.now()) {
  const t = wib(nowMs);
  const cuaca = cuacaHarian(t.tanggal);
  const rnd = acak(`beban-${t.tanggal}`);
  const seri = [];
  let ePV = 0, eBeban = 0, eImpor = 0, eEkspor = 0, ePakaiLangsung = 0;
  const dt = LANGKAH_MENIT / 60;

  for (let m = 0; m <= t.jam * 60; m += LANGKAH_MENIT) {
    const jam = m / 60;
    const g = radiasiCerah(jam) * faktorAwan(cuaca, jam, (rnd() - 0.5) * 0.06);
    const pv = dayaPV(g, config.surya);
    const b = bebanPada(jam, t.tanggal, config, rnd);
    const beban = b.p;
    const impor = Math.max(0, beban - pv);
    const ekspor = Math.max(0, pv - beban);
    seri.push({ jam: +jam.toFixed(3), pv: +pv.toFixed(3), beban: +beban.toFixed(3), impor: +impor.toFixed(3), ekspor: +ekspor.toFixed(3) });
    ePV += pv * dt; eBeban += beban * dt; eImpor += impor * dt; eEkspor += ekspor * dt;
    ePakaiLangsung += Math.min(pv, beban) * dt;
  }

  const akhir = seri[seri.length - 1] || { pv: 0, beban: 0, impor: 0, ekspor: 0 };
  const bAkhir = bebanPada(t.jam, t.tanggal, config, () => 0.94);
  const tarif = config.pln.tarifPerKWh;

  return {
    mode: 'demo',
    sumber: 'simulasi',
    diperbarui: new Date(nowMs).toISOString(),
    tanggal: t.tanggal,
    cuaca: cuaca.jenis,
    sekarang: {
      pvKW: akhir.pv,
      bebanKW: akhir.beban,
      imporKW: akhir.impor,
      eksporKW: akhir.ekspor,
      mesinAktif: bAkhir.aktif,
    },
    hariIni: {
      pvKWh: +ePV.toFixed(2),
      bebanKWh: +eBeban.toFixed(2),
      imporKWh: +eImpor.toFixed(2),
      eksporKWh: +eEkspor.toFixed(2),
      pvTerpakaiKWh: +ePakaiLangsung.toFixed(2),
      // Self-consumption: porsi produksi surya yang benar-benar dipakai mesin
      rasioPemakaianSurya: ePV > 0 ? +(ePakaiLangsung / ePV).toFixed(3) : 0,
      // Solar fraction: porsi kebutuhan listrik yang dipenuhi surya
      rasioKebutuhanDariSurya: eBeban > 0 ? +(ePakaiLangsung / eBeban).toFixed(3) : 0,
      hematRp: Math.round(ePakaiLangsung * tarif),
    },
    seri,
    inverter: {
      status: akhir.pv > 0.05 ? 'Normal — memproduksi' : 'Standby (malam)',
      kode: akhir.pv > 0.05 ? 'ok' : 'standby',
      model: config.surya.inverter,
    },
  };
}
