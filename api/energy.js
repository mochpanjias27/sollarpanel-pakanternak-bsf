// GET /api/energy — data surya & beban saat ini + seri hari ini.
// Sumber dipilih dari ENV ENERGY_SOURCE atau config.mode.energi:
//   'simulasi' (Tahap 1) | 'solis' (Solis Cloud API) | 'modbus' (gateway meter Acrel)
import config from '../assets/js/config.js';
import { simulasiEnergi } from '../assets/js/lib/energi-sim.js';
import { ambilSolis } from './_lib/solis.js';
import { ambilGatewayModbus } from './_lib/modbus-gateway.js';

export default async function handler(req, res) {
  const sumber = process.env.ENERGY_SOURCE || config.mode.energi;
  let data;
  try {
    if (sumber === 'solis') data = await ambilSolis(config);
    else if (sumber === 'modbus') data = await ambilGatewayModbus(config);
    else data = simulasiEnergi(config);
  } catch (err) {
    data = simulasiEnergi(config);
    data.galat = `Sumber '${sumber}' gagal (${err.message}); menampilkan simulasi.`;
  }
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
  res.status(200).json(data);
}
