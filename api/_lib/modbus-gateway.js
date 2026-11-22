// ADAPTER gateway Modbus (Tahap 2) — meter Acrel DTSD1352-C via RS485.
//
// Fungsi Vercel tidak bisa membaca RS485 langsung. Pasang gateway di lokasi
// (mis. ESP32/Raspberry Pi/Node-RED + konverter RS485) yang membaca register
// meter Acrel & inverter Solis, lalu menyajikan JSON di URL yang bisa diakses
// internet (atau mengirim ke basis data). Alamat register: lihat manual
// Acrel DTSD1352 dan dokumen protokol Modbus Solis — jangan ditebak.
//
// ENV: ENERGY_SOURCE=modbus, MODBUS_GATEWAY_URL=https://…/energi.json,
//      MODBUS_GATEWAY_TOKEN=… (opsional, dikirim sebagai Bearer)
//
// Format JSON yang diharapkan dari gateway:
// {
//   "pvKW": 6.2, "bebanKW": 4.8, "gridKW": -1.4,      // grid: + impor, − ekspor
//   "hariIni": { "pvKWh": 21.3, "imporKWh": 3.1, "eksporKWh": 4.2, "bebanKWh": 20.2 },
//   "seri": [ { "jam": 7.0, "pv": 0.8, "beban": 0.3 }, … ],
//   "inverterStatus": "ok"
// }
import { wib } from '../../assets/js/lib/waktu.js';

export async function ambilGatewayModbus(config) {
  const url = process.env.MODBUS_GATEWAY_URL;
  if (!url) throw new Error('MODBUS_GATEWAY_URL belum diisi');
  const headers = process.env.MODBUS_GATEWAY_TOKEN ? { Authorization: `Bearer ${process.env.MODBUS_GATEWAY_TOKEN}` } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`gateway ${res.status}`);
  const g = await res.json();
  const h = g.hariIni || {};
  const terpakai = Math.max(0, (h.pvKWh || 0) - (h.eksporKWh || 0));
  return {
    mode: 'live', sumber: 'modbus-gateway', diperbarui: g.waktu || new Date().toISOString(), tanggal: wib().tanggal,
    sekarang: { pvKW: g.pvKW, bebanKW: g.bebanKW, imporKW: Math.max(0, g.gridKW), eksporKW: Math.max(0, -g.gridKW), mesinAktif: [] },
    hariIni: {
      pvKWh: h.pvKWh || 0, bebanKWh: h.bebanKWh || 0, imporKWh: h.imporKWh || 0, eksporKWh: h.eksporKWh || 0,
      pvTerpakaiKWh: terpakai,
      rasioPemakaianSurya: h.pvKWh ? terpakai / h.pvKWh : 0,
      rasioKebutuhanDariSurya: h.bebanKWh ? terpakai / h.bebanKWh : 0,
      hematRp: Math.round(terpakai * config.pln.tarifPerKWh),
    },
    seri: (g.seri || []).map((p) => ({ ...p, impor: Math.max(0, p.beban - p.pv), ekspor: Math.max(0, p.pv - p.beban) })),
    inverter: { status: g.inverterStatus === 'ok' ? 'Normal' : 'Periksa inverter', kode: g.inverterStatus || 'unknown', model: config.surya.inverter },
  };
}
