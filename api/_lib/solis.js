// ADAPTER Solis Cloud API (Tahap 2).
// Aktifkan dengan ENV di Vercel:
//   ENERGY_SOURCE=solis
//   SOLIS_KEY_ID=…   SOLIS_KEY_SECRET=…   SOLIS_STATION_ID=…
//   SOLIS_API_URL=https://www.soliscloud.com:13333   (opsional)
// Kunci API diminta ke Solis (portal SolisCloud → layanan API).
// Tanda tangan: HMAC-SHA1 sesuai dokumen "SolisCloud Platform API".
// PENTING: nama field respons di bawah perlu dicek ulang dengan dokumen API
// versi terbaru dan data stasiun Anda sebelum dipakai produksi.
import crypto from 'node:crypto';
import { wib } from '../../assets/js/lib/waktu.js';

async function panggil(path, body) {
  const base = process.env.SOLIS_API_URL || 'https://www.soliscloud.com:13333';
  const id = process.env.SOLIS_KEY_ID;
  const secret = process.env.SOLIS_KEY_SECRET;
  if (!id || !secret) throw new Error('SOLIS_KEY_ID/SOLIS_KEY_SECRET belum diisi');
  const isi = JSON.stringify(body);
  const md5 = crypto.createHash('md5').update(isi).digest('base64');
  const tipe = 'application/json';
  const tanggal = new Date().toUTCString();
  const teks = `POST\n${md5}\n${tipe}\n${tanggal}\n${path}`;
  const tanda = crypto.createHmac('sha1', secret).update(teks).digest('base64');
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-MD5': md5, 'Content-Type': tipe, Date: tanggal, Authorization: `API ${id}:${tanda}` },
    body: isi,
  });
  if (!res.ok) throw new Error(`Solis ${res.status}`);
  const json = await res.json();
  if (json.success === false || (json.code && json.code !== '0')) throw new Error(`Solis: ${json.msg || json.code}`);
  return json.data;
}

const kw = (v, satuan) => (satuan === 'W' ? Number(v) / 1000 : Number(v) || 0);

export async function ambilSolis(config) {
  const sid = process.env.SOLIS_STATION_ID;
  if (!sid) throw new Error('SOLIS_STATION_ID belum diisi');
  const t = wib();
  const [st, hari] = await Promise.all([
    panggil('/v1/api/stationDetail', { id: sid }),
    panggil('/v1/api/stationDay', { id: sid, money: 'IDR', time: t.tanggal, timeZone: 7 }).catch(() => []),
  ]);

  const pv = kw(st.power, st.powerStr);
  const beban = kw(st.familyLoadPower, st.familyLoadPowerStr);
  const grid = kw(st.psum, st.psumStr); // >0 ekspor, <0 impor (cek tanda di stasiun Anda)
  const impor = Math.max(0, -grid, beban - pv);
  const ePV = Number(st.dayEnergy) || 0;
  const eImpor = Number(st.gridPurchasedTodayEnergy) || 0;
  const eBeban = Number(st.homeLoadTodayEnergy) || ePV + eImpor;
  const eEkspor = Number(st.gridSellTodayEnergy) || 0;
  const terpakai = Math.max(0, ePV - eEkspor);

  const seri = (Array.isArray(hari) ? hari : []).map((p) => {
    const d = new Date(Number(p.dataTimestamp) + 7 * 3600e3);
    const jam = d.getUTCHours() + d.getUTCMinutes() / 60;
    const pvp = kw(p.power, p.powerStr);
    const bb = kw(p.familyLoadPower, p.familyLoadPowerStr) || pvp;
    return { jam, pv: pvp, beban: bb, impor: Math.max(0, bb - pvp), ekspor: Math.max(0, pvp - bb) };
  });

  return {
    mode: 'live', sumber: 'solis-cloud', diperbarui: new Date().toISOString(), tanggal: t.tanggal,
    sekarang: { pvKW: pv, bebanKW: beban, imporKW: impor, eksporKW: Math.max(0, pv - beban), mesinAktif: [] },
    hariIni: {
      pvKWh: ePV, bebanKWh: eBeban, imporKWh: eImpor, eksporKWh: eEkspor, pvTerpakaiKWh: terpakai,
      rasioPemakaianSurya: ePV ? terpakai / ePV : 0,
      rasioKebutuhanDariSurya: eBeban ? terpakai / eBeban : 0,
      hematRp: Math.round(terpakai * config.pln.tarifPerKWh),
    },
    seri,
    inverter: { status: st.state === 1 ? 'Normal — online' : st.state === 3 ? 'Alarm' : 'Offline', kode: st.state === 1 ? 'ok' : 'alarm', model: config.surya.inverter },
  };
}
