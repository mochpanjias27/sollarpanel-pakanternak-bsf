// Grafik SVG ringan tanpa pustaka.
const NS = 'http://www.w3.org/2000/svg';

/**
 * Grafik garis/area 24 jam.
 * seri: [{ nama, warna, data:[{x,y}], area?:bool, garisPutus?:bool }]
 */
export function grafikGaris(wadah, seri, { xMin = 0, xMax = 24, yMax, tinggi = 260, labelY = 'kW', penandaX = null, langkahX = 3 } = {}) {
  // lebar viewBox = lebar wadah sebenarnya, agar teks tetap terbaca di ponsel
  const W = Math.max(300, Math.round(wadah.clientWidth || 720)), H = tinggi, kiri = 40, kanan = 12, atas = 24, bawah = 28;
  if (W < 520) langkahX = Math.max(langkahX, 4);
  const maks = yMax ?? Math.max(1, ...seri.flatMap((s) => s.data.map((p) => p.y))) * 1.12;
  const yTick = langkahNice(maks / 5);
  const yTop = Math.ceil(maks / yTick) * yTick;
  const sx = (x) => kiri + ((x - xMin) / (xMax - xMin)) * (W - kiri - kanan);
  const sy = (y) => atas + (1 - y / yTop) * (H - atas - bawah);
  let svg = `<svg class="grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik ${seri.map((s) => s.nama).join(', ')}">`;
  for (let y = 0; y <= yTop + 1e-9; y += yTick) {
    svg += `<line x1="${kiri}" x2="${W - kanan}" y1="${sy(y)}" y2="${sy(y)}" stroke="#e3e7dc"/>`;
    svg += `<text x="${kiri - 8}" y="${sy(y) + 4}" text-anchor="end">${fmt(y)}</text>`;
  }
  for (let x = xMin; x <= xMax; x += langkahX) {
    svg += `<text x="${sx(x)}" y="${H - 8}" text-anchor="middle">${String(x).padStart(2, '0')}</text>`;
  }
  svg += `<text x="${kiri - 8}" y="${atas - 12}" text-anchor="end" style="font-weight:800">${labelY}</text>`;
  for (const s of seri) {
    if (!s.data.length) continue;
    const d = s.data.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
    if (s.area) {
      const a = `${d}L${sx(s.data[s.data.length - 1].x).toFixed(1)},${sy(0)}L${sx(s.data[0].x).toFixed(1)},${sy(0)}Z`;
      svg += `<path d="${a}" fill="${s.warna}" opacity="${s.opasitas ?? 0.18}"/>`;
    }
    svg += `<path d="${d}" fill="none" stroke="${s.warna}" stroke-width="${s.tebal ?? 2.4}" stroke-linejoin="round" ${s.garisPutus ? 'stroke-dasharray="5 5"' : ''}/>`;
  }
  if (penandaX != null) {
    svg += `<line x1="${sx(penandaX)}" x2="${sx(penandaX)}" y1="${atas}" y2="${sy(0)}" stroke="#13241b" stroke-dasharray="3 4" opacity=".5"/>`;
    svg += `<text x="${sx(penandaX) + 4}" y="${atas + 10}" style="font-weight:800;fill:#13241b">sekarang</text>`;
  }
  svg += '</svg>';
  wadah.innerHTML = svg;
}

function langkahNice(x) {
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const n = x / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
function fmt(y) { return Number.isInteger(y) ? y : y.toFixed(1).replace('.', ','); }

export { NS };
