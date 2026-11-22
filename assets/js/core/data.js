// Lapisan data sisi browser. Selalu lewat /api dulu; bila /api tidak tersedia
// (mis. dibuka sebagai file statis), jatuh ke modul simulasi yang sama.
import config from '../config.js';
import { simulasiEnergi } from '../lib/energi-sim.js';
import { ambilOpenMeteo, prakiraanSimulasi } from '../lib/prakiraan.js';

async function getJSON(url, ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json' } });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error(r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

export async function ambilEnergi() {
  try { return await getJSON('/api/energy'); }
  catch { return simulasiEnergi(config); }
}

const cachePrakiraan = new Map();
export async function ambilPrakiraan(hari = 7) {
  const kunci = `pk-${hari}`;
  const c = cachePrakiraan.get(kunci);
  if (c && Date.now() - c.t < 15 * 60e3) return c.data;
  let data;
  try { data = await getJSON(`/api/forecast?hari=${hari}`); }
  catch {
    try { data = config.mode.prakiraan === 'open-meteo' ? await ambilOpenMeteo(config, hari) : prakiraanSimulasi(config, hari); }
    catch { data = prakiraanSimulasi(config, hari); }
  }
  cachePrakiraan.set(kunci, { t: Date.now(), data });
  return data;
}
