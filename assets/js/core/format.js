const nf1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export const angka1 = (x) => nf1.format(x ?? 0);
export const angka2 = (x) => nf2.format(x ?? 0);
export const angka0 = (x) => nf0.format(x ?? 0);
export const rupiah = (x) => `Rp ${nf0.format(Math.round(x ?? 0))}`;
export const persen = (x) => `${nf0.format(Math.round((x ?? 0) * 100))}%`;
export const jamMenit = (iso) =>
  new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });

export function el(tag, attrs = {}, ...anak) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const a of anak.flat()) if (a != null) e.append(a.nodeType ? a : document.createTextNode(a));
  return e;
}

export function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
