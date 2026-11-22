// Uji cepat penjadwal & simulasi: npm test
import config from '../assets/js/config.js';
import { prakiraanSimulasi } from '../assets/js/lib/prakiraan.js';
import { susunJadwal } from '../assets/js/lib/penjadwal.js';
import { simulasiEnergi } from '../assets/js/lib/energi-sim.js';
const pk = prakiraanSimulasi(config, 7);
const t0=Date.now(); const j = susunJadwal(config, pk, {hari:7}); console.log('ms',Date.now()-t0);
console.log(j.ringkasan, j.tidakMuat);
for (const h of j.hari) console.log(h.labelPendek, h.cuaca, h.energiPV, h.energiBeban, h.energiImpor, h.energiImporKebiasaan, h.warna);
for (const r of j.rekomendasi) console.log('-', r.teks, '|', r.alasan, r.hematKWh, r.hematRp);
for (const p of j.peringatan) console.log('!', p.teks);
for (const t of j.tugas.slice(0,12)) console.log(t.tanggal, t.mulai, t.selesai, t.mesinId);
const e = simulasiEnergi(config); console.log(e.sekarang, e.hariIni, e.cuaca, e.seri.length);
