# Website Bening Saguling Foundation

Website multi-halaman untuk fasilitas pengolahan sampah organik rumah tangga di Cihampelas, Kabupaten Bandung Barat. Sampah organik diolah menjadi **pelet pakan ayam & ikan berbahan maggot** dan **pupuk kompos granul**, dengan listrik dari **panel surya on-grid tanpa baterai** (inverter Solis 5G 3 fasa).

Isinya:

- Halaman publik: Beranda, Pakan Ternak (+ Pelet Ayam, Pelet Ikan), Pupuk Kompos, Edukasi, Galeri, Kontak
- **Dasbor Energi** real-time: daya PV, beban, impor PLN, diagram aliran animasi, grafik 24 jam, rasio pemanfaatan surya, estimasi penghematan
- **Jadwal Produksi** cerdas berdasarkan prakiraan radiasi 3–7 hari (Open-Meteo)
- **Simulasi 3D** semua mesin (Three.js): nyalakan mesin, lihat aliran energi, putar ulang jadwal satu hari

> **MODE DEMO (Tahap 1):** data energi masih simulasi. Prakiraan cuaca sudah memakai Open-Meteo sungguhan dan otomatis jatuh ke simulasi bila gagal.

---

## Deploy ke Vercel lewat GitHub

1. **Buat repositori baru** di GitHub (mis. `bening-saguling-web`), lalu unggah isi folder ini:
   ```bash
   cd bening-saguling-web
   git init
   git add .
   git commit -m "Website Bening Saguling tahap 1"
   git branch -M main
   git remote add origin https://github.com/<akun-anda>/bening-saguling-web.git
   git push -u origin main
   ```
   Tanpa terminal: di halaman repo baru, pilih **Add file → Upload files**, lalu seret semua isi folder.
2. Buka **vercel.com → Add New → Project**, pilih repositori tadi.
3. Pengaturan proyek:
   - **Framework Preset:** `Other`
   - **Build Command:** kosongkan
   - **Output Directory:** kosongkan (akar proyek)
4. Klik **Deploy**. Setiap `git push` ke `main` akan men-deploy ulang secara otomatis.

Tidak ada langkah build dan tidak ada dependensi npm. Folder `api/` otomatis menjadi fungsi serverless (`/api/energy`, `/api/forecast`).

## Menjalankan di komputer sendiri

Butuh Node.js 18+.

```bash
npm run dev     # http://localhost:3000  (meniru Vercel: URL bersih + /api)
npm test        # uji cepat penjadwal & simulasi energi di terminal
```

## Mengubah data (satu file)

Semua parameter ada di **`assets/js/config.js`**:

| Bagian | Isi |
|---|---|
| `situs` | nama, alamat, **nomor WhatsApp**, koordinat |
| `surya` | kWp, jumlah modul, model & daya inverter, faktor efisiensi (0,75) |
| `pln` | tarif per kWh, batas daya, apakah ekspor dihargai |
| `mesin` | daftar mesin: daya (kW), motor, kapasitas, foto/render, fungsi |
| `produksi` | alur proses untuk penjadwal: urutan langkah, durasi, frekuensi, prioritas, pola kebiasaan |
| `penjadwal` | resolusi slot, cadangan awan, ambang warna, ambang peringatan |
| `demoHarian` | pola beban untuk simulasi dasbor |
| `dampak` | angka dampak program di beranda |

Setelah data asli dimasukkan, ubah `asumsi: true` menjadi `false`.

### Daftar asumsi yang perlu diverifikasi

| Data | Nilai sementara | Cara memastikan |
|---|---|---|
| Kapasitas PV | 10,8 kWp (20 × 540 Wp) | hitung modul di atap / dokumen instalasi |
| Inverter | Solis S5-GR3P10K, 10 kW | label samping inverter |
| Tarif PLN | Rp 1.444,70/kWh | tagihan PLN (golongan) |
| Batas daya | 14 kW | daya tersambung di tagihan (kVA) |
| Daya tiap mesin | 0,75–5,5 kW | pelat nama motor tiap mesin |
| Pemanas pengering maggot | gas LPG (listrik hanya motor drum) | cek di lapangan; bila listrik, naikkan `dayaKW` |
| Nomor WhatsApp, email | contoh | isi nomor asli |
| Koordinat | -6,9300; 107,4600 | cek di Google Maps |
| Komposisi & gizi pelet | formulasi contoh | uji laboratorium |
| Angka dampak | ilustrasi | pencatatan fasilitas |

## Penjadwal cerdas (`assets/js/lib/penjadwal.js`)

1. Estimasi PV per 30 menit = `kWp × radiasi/1000 × 0,75`, dibatasi daya inverter.
2. Pekerjaan berupa **alur**, mis. pencuci → pengering → penepung → mixer → peletizer. Langkah wajib berurutan di hari yang sama (jeda maksimal 1,5 jam).
3. Alur dengan energi terbesar ditempatkan lebih dulu, sehingga mesin terberat mendapat jam surya tertinggi.
4. Biaya posisi = tambahan impor PLN + penalti bila beban > 80% PV (cadangan untuk awan lewat).
5. Batasan: satu mesin satu pekerjaan; dua motor tidak start bersamaan; total beban ≤ batas daya; hari batch maksimal digeser ±2 hari dari kebiasaan, dengan jarak antar-batch dijaga; pencacahan tetap harian.
6. Hasil dibandingkan dengan jadwal kebiasaan untuk menghitung penghematan, lalu dibuat rekomendasi tertulis dan peringatan hari mendung/hujan.

Jadwal bisa **disimpan** (di browser perangkat), **diekspor ke WhatsApp** (memilih kontak/grup), dan **dicetak ke PDF**. Halaman Simulasi 3D memakai jadwal yang tersimpan.

## Tahap 2: data inverter & meter asli

Atur **Environment Variables** di Vercel (Project → Settings → Environment Variables). Kunci API tidak pernah ditulis di kode.

**Solis Cloud API** (`api/_lib/solis.js`)
```
ENERGY_SOURCE=solis
SOLIS_KEY_ID=...
SOLIS_KEY_SECRET=...
SOLIS_STATION_ID=...
```
Kunci API diminta melalui portal SolisCloud. Nama field respons perlu dicocokkan dengan dokumen API terbaru sebelum dipakai produksi.

**Gateway Modbus / meter Acrel DTSD1352-C** (`api/_lib/modbus-gateway.js`)
```
ENERGY_SOURCE=modbus
MODBUS_GATEWAY_URL=https://.../energi.json
MODBUS_GATEWAY_TOKEN=...   (opsional)
```
Vercel tidak bisa membaca RS485 langsung. Pasang gateway di lokasi (ESP32/Raspberry Pi/Node-RED + konverter RS485) yang membaca register meter dan menyajikan JSON sesuai format di komentar file tersebut. Alamat register: lihat manual Acrel DTSD1352.

**Prakiraan:** default Open-Meteo (gratis, tanpa kunci). Ganti dengan `FORECAST_SOURCE=simulasi` bila ingin mode demo penuh.

Bila sumber gagal, situs otomatis kembali ke simulasi dan menampilkan pesan.

## Struktur folder

```
index.html, pakan.html, pakan-ayam.html, pakan-ikan.html, pupuk.html,
energi.html, jadwal.html, simulasi-3d.html, edukasi.html, galeri.html, kontak.html, 404.html
api/
  energy.js            GET /api/energy
  forecast.js          GET /api/forecast?hari=7
  _lib/solis.js        adapter Solis Cloud
  _lib/modbus-gateway.js  adapter gateway Modbus
assets/
  css/style.css
  js/config.js         ← SATU FILE KONFIGURASI
  js/core/             layout, data, format, grafik, kartu mesin
  js/lib/              waktu, model surya, simulasi energi, prakiraan, penjadwal
  js/pages/            skrip tiap halaman
  js/three/            model 3D prosedural (mesin3d.js) & adegan (adegan.js)
  img/foto/            8 foto lapangan (WebP; wajah orang sudah dipotong)
  img/render/          gambar mesin dari model 3D (untuk mesin tanpa foto)
  vendor/three/        Three.js r170 (MIT), disertakan agar tidak bergantung CDN
tools/                 server lokal, uji penjadwal, alat render (tidak ikut deploy)
```

## Foto & gambar

- Foto lapangan: mixer bahan granul, ayak kompos, penepung maggot, peletizer, mixer bahan pakan, inverter Solis, meter Acrel, panel distribusi.
- Mesin tanpa foto (pencacah, komposter, penepung kompos, pan granulator, pencuci maggot, pengering maggot) memakai **render dari model 3D** dan diberi label "Ilustrasi 3D".
- Untuk mengganti dengan foto asli: simpan `nama-sm.webp` (±640 px) dan `nama.webp` (±1400 px) di `assets/img/foto/`, lalu isi `foto: 'nama'` di `config.js`.
- Mengubah model 3D: edit `assets/js/three/mesin3d.js`, lalu render ulang gambar dengan `tools/render-mesin.py`.
