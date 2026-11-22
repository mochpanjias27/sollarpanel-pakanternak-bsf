// Server lokal tanpa dependensi: meniru Vercel (cleanUrls + /api/*.js).
// Jalankan: npm run dev  → http://localhost:3000
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const TIPE = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const f = path.join(AKAR, 'api', `${url.pathname.slice(5)}.js`);
      const mod = await import(`${pathToFileURL(f)}?t=${Date.now()}`);
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      return await mod.default(req, res);
    }
    let p = path.join(AKAR, decodeURIComponent(url.pathname));
    if (!p.startsWith(AKAR)) throw new Error('jalur tidak sah');
    let stat = await fs.stat(p).catch(() => null);
    if (stat?.isDirectory()) { p = path.join(p, 'index.html'); stat = await fs.stat(p).catch(() => null); }
    if (!stat && !path.extname(p)) { p += '.html'; stat = await fs.stat(p).catch(() => null); }
    if (!stat) { res.statusCode = 404; res.setHeader('Content-Type', TIPE['.html']); return res.end(await fs.readFile(path.join(AKAR, '404.html'))); }
    res.setHeader('Content-Type', TIPE[path.extname(p)] || 'application/octet-stream');
    res.end(await fs.readFile(p));
  } catch (err) {
    res.statusCode = 500; res.end(String(err));
  }
}).listen(PORT, () => console.log(`Bening Saguling dev: http://localhost:${PORT}`));
