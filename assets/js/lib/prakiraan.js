// Prakiraan radiasi per jam. Sumber: Open-Meteo (gratis, tanpa API key)
// dengan cadangan simulasi bila jaringan gagal.
import { wib, tambahHari } from './waktu.js';
import { cuacaHarian, radiasiCerah, faktorAwan } from './surya.js';

/** Prakiraan simulasi: deterministik per tanggal, bentuk sama dengan Open-Meteo. */
export function prakiraanSimulasi(config, hari = 7, nowMs = Date.now()) {
  const t = wib(nowMs);
  const jamList = [];
  for (let d = 0; d < hari; d++) {
    const tanggal = tambahHari(t.tanggal, d);
    const c = cuacaHarian(tanggal);
    for (let h = 0; h < 24; h++) {
      const jam = h + 0.5; // nilai rata-rata jam ke-h
      const cerah = radiasiCerah(jam);
      const g = cerah * faktorAwan(c, jam);
      const tutupan = cerah > 0 ? Math.round((1 - g / cerah) * 100) : Math.round(c.kedalaman * 100);
      const hujan = c.jenis === 'hujan' && h >= Math.floor(c.jamHujan) ? 75 : c.jenis === 'berawan' && h >= 13 ? 40 : 10;
      jamList.push({ waktu: `${tanggal}T${String(h).padStart(2, '0')}:00`, radiasi: Math.round(g), awan: tutupan, peluangHujan: hujan });
    }
  }
  return { sumber: 'simulasi', mode: 'demo', diperbarui: new Date(nowMs).toISOString(), jam: jamList };
}

export function urlOpenMeteo(config, hari = 7) {
  const p = new URLSearchParams({
    latitude: config.situs.lintang,
    longitude: config.situs.bujur,
    hourly: 'shortwave_radiation,cloud_cover,precipitation_probability',
    timezone: config.situs.zonaWaktu,
    forecast_days: String(Math.min(16, Math.max(1, hari))),
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

/** Ubah respons Open-Meteo ke bentuk internal. */
export function parseOpenMeteo(json) {
  const h = json.hourly;
  const jam = h.time.map((w, i) => ({
    waktu: w,
    // Open-Meteo: radiasi rata-rata jam SEBELUM label waktu → geser 1 jam agar label = awal jam
    radiasi: Math.round(h.shortwave_radiation[i + 1] ?? 0),
    awan: h.cloud_cover?.[i] ?? null,
    peluangHujan: h.precipitation_probability?.[i] ?? null,
  }));
  return { sumber: 'open-meteo', mode: 'live', diperbarui: new Date().toISOString(), jam };
}

/** Ambil prakiraan langsung dari Open-Meteo (browser atau server). */
export async function ambilOpenMeteo(config, hari = 7, fetchFn = fetch) {
  const res = await fetchFn(urlOpenMeteo(config, hari), { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return parseOpenMeteo(await res.json());
}
