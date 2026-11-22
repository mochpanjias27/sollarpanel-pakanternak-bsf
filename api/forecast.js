// GET /api/forecast?hari=7 — prakiraan radiasi per jam (3–7 hari).
// Default Open-Meteo (tanpa API key). Bila gagal → simulasi, dengan penanda.
import config from '../assets/js/config.js';
import { ambilOpenMeteo, prakiraanSimulasi } from '../assets/js/lib/prakiraan.js';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const hari = Math.min(7, Math.max(3, Number(url.searchParams.get('hari')) || 7));
  const sumber = process.env.FORECAST_SOURCE || config.mode.prakiraan;
  let data;
  try {
    data = sumber === 'open-meteo' ? await ambilOpenMeteo(config, hari) : prakiraanSimulasi(config, hari);
  } catch (err) {
    data = prakiraanSimulasi(config, hari);
    data.galat = `Open-Meteo tidak dapat dihubungi (${err.message}); memakai simulasi.`;
  }
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.status(200).json(data);
}
