/**
 * KONFIGURASI TUNGGAL — Bening Saguling Foundation
 * ------------------------------------------------------------------
 * Semua parameter situs ada di sini: data fasilitas, sistem surya,
 * tarif, daftar mesin, alur produksi, dan aturan penjadwal.
 * Ubah angka di file ini saja; kode lain membaca dari sini.
 *
 * Nilai bertanda  asumsi: true  atau komentar "ASUMSI" BELUM diverifikasi
 * di lapangan. Ganti dengan data asli (pelat nama motor, label inverter,
 * tagihan PLN) lalu ubah  asumsi  menjadi false.
 *
 * File ini dipakai di browser DAN di fungsi /api (Vercel), jadi
 * jangan taruh rahasia (API key) di sini — pakai Environment Variables.
 */

const config = {
  situs: {
    nama: 'Bening Saguling Foundation',
    namaFasilitas: 'Rumah Olah Sampah Organik',
    tagline: 'Dari Sampah Dapur Jadi Pakan dan Pupuk',
    alamat: 'Jl. SDN Cianjur, Babakan, Cihampelas, Kec. Cihampelas, Kabupaten Bandung Barat, Jawa Barat 40562',
    whatsapp: '6281200000000', // ASUMSI: ganti nomor WA asli (format 62…)
    whatsappTampil: '0812-0000-0000', // ASUMSI
    email: 'info@beningsaguling.org', // ASUMSI
    zonaWaktu: 'Asia/Jakarta',
    // ASUMSI: perkiraan dari alamat, verifikasi di peta
    lintang: -6.9300,
    bujur: 107.4600,
  },

  // Tahap 1: energi selalu simulasi. Prakiraan bisa live dari Open-Meteo.
  mode: {
    energi: 'simulasi', // 'simulasi' | 'solis' | 'modbus'
    prakiraan: 'open-meteo', // 'open-meteo' | 'simulasi'  (otomatis jatuh ke simulasi bila gagal)
    intervalSegarkanDetik: 30,
  },

  surya: {
    kapasitasKWp: 10.8, // ASUMSI: mis. 20 modul × 540 Wp
    jumlahModul: 20, // ASUMSI
    wpPerModul: 540, // ASUMSI
    inverter: 'Solis 5G 3 fasa on-grid (S5-GR3P10K)', // model ASUMSI, seri dari foto
    dayaInverterKW: 10, // ASUMSI
    faktorEfisiensi: 0.75, // sesuai instruksi: PV = kWp × radiasi/1000 × 0,75
    baterai: false,
    asumsi: true,
  },

  pln: {
    tarifPerKWh: 1444.70, // ASUMSI: tarif non-subsidi (cek tagihan; golongan sosial bisa lebih murah)
    batasDayaKW: 14, // ASUMSI: perkiraan batas aman daya tersambung (mis. 16,5 kVA × pf 0,85)
    eksporDihargai: false, // aturan PLTS atap terbaru: ekspor tidak mengurangi tagihan (verifikasi kontrak)
    asumsi: true,
  },

  // Beban dasar fasilitas (lampu, pompa, perangkat) saat jam kerja
  bebanDasarKW: 0.3, // ASUMSI
  bebanMalamKW: 0.08, // ASUMSI

  jamKerja: { mulai: 7, selesai: 17 }, // WIB
  hariKerja: [1, 2, 3, 4, 5, 6], // 0=Minggu … 6=Sabtu

  /* ----------------------------------------------------------------
   * DAFTAR MESIN
   * singkat: nama pendek untuk grafik & label 3D
 * dayaKW: daya listrik total saat bekerja (semua motor dijumlah)
   * foto: file di assets/img/foto (null = pakai render 3D)
   * ---------------------------------------------------------------- */
  mesin: [
    {
      id: 'pencacah', singkat: 'Pencacah', nama: 'Mesin Pencacah Sampah Organik', kategori: 'pupuk',
      dayaKW: 4.0, motor: ['Motor 3 fasa 4 kW (5,5 HP)'], foto: null, warna: '#2048a8',
      fungsi: 'Mencacah sisa dapur dan sayuran menjadi potongan kecil agar cepat terurai di komposter dan mudah dimakan maggot.',
      kapasitas: '± 300 kg/jam', asumsi: true,
    },
    {
      id: 'komposter', singkat: 'Komposter', nama: 'Komposter Bata Terawang', kategori: 'pupuk',
      dayaKW: 0, motor: [], foto: null, warna: '#b5653a',
      fungsi: 'Bak kompos dari bata berlubang. Udara masuk dari celah bata sehingga pengomposan berjalan aerob tanpa listrik.',
      kapasitas: '3 ruang, ± 1 m³ per ruang', asumsi: true, pasif: true,
    },
    {
      id: 'ayak-kompos', singkat: 'Ayak kompos', nama: 'Mesin Ayak Kompos', kategori: 'pupuk',
      dayaKW: 0.75, motor: ['Motor 0,75 kW + gearbox'], foto: 'mesin-ayak-kompos', warna: '#2048a8',
      fungsi: 'Tabung ayakan berputar yang memisahkan kompos halus dari bagian kasar. Bagian kasar dikembalikan ke komposter.',
      kapasitas: '± 200 kg/jam', asumsi: true,
    },
    {
      id: 'penepung-kompos', singkat: 'Penepung kompos', nama: 'Mesin Penepung Kompos', kategori: 'pupuk',
      dayaKW: 3.0, motor: ['Motor 3 kW'], foto: null, warna: '#1f9a4c',
      fungsi: 'Menggiling kompos hasil ayakan menjadi tepung halus sebagai bahan baku granul.',
      kapasitas: '± 100 kg/jam', asumsi: true,
    },
    {
      id: 'mixer-granul', singkat: 'Mixer granul', nama: 'Mixer Bahan Granul', kategori: 'pupuk',
      dayaKW: 2.25, motor: ['Motor mixer 1,5 kW + gearbox', 'Motor screw conveyor 0,75 kW'], foto: 'mixer-bahan-granul', warna: '#f06a1d',
      fungsi: 'Mencampur tepung kompos dengan bahan perekat dan air. Screw conveyor miring mengangkut bahan ke pan granulator.',
      kapasitas: '± 100 kg/batch', asumsi: true,
    },
    {
      id: 'pan-granulator', singkat: 'Pan granulator', nama: 'Pan Granulator', kategori: 'pupuk',
      dayaKW: 1.5, motor: ['Motor 1,5 kW + gearbox'], foto: null, warna: '#f06a1d',
      fungsi: 'Piringan miring berputar yang menggulung campuran kompos menjadi butiran (granul) bulat.',
      kapasitas: '± 80 kg/jam', asumsi: true,
    },
    {
      id: 'pencuci-maggot', singkat: 'Pencuci maggot', nama: 'Mesin Pencuci Maggot', kategori: 'pakan',
      dayaKW: 0.75, motor: ['Motor 0,75 kW', 'Pompa air 0,125 kW'], foto: null, warna: '#9aa4ad',
      fungsi: 'Membersihkan maggot segar dari sisa media dan kotoran sebelum dikeringkan.',
      kapasitas: '± 50 kg/batch', asumsi: true,
    },
    {
      id: 'pengering-maggot', singkat: 'Pengering maggot', nama: 'Mesin Pengering Maggot', kategori: 'pakan',
      dayaKW: 0.75, motor: ['Motor pemutar drum 0,75 kW'], foto: null, warna: '#c9ced3',
      fungsi: 'Drum stainless berputar di atas pemanas untuk mengeringkan maggot hingga kadar air rendah dan tahan simpan.',
      kapasitas: '± 30 kg maggot basah/batch',
      catatan: 'ASUMSI: pemanas memakai gas LPG (terlihat selang di foto), sehingga beban listrik hanya motor drum. Bila pemanas listrik, ubah dayaKW.',
      asumsi: true,
    },
    {
      id: 'penepung-maggot', singkat: 'Penepung maggot', nama: 'Mesin Penepung Maggot', kategori: 'pakan',
      dayaKW: 2.2, motor: ['Motor 2,2 kW'], foto: 'mesin-penepung-maggot', warna: '#1f9a4c',
      fungsi: 'Menggiling maggot kering menjadi tepung maggot, sumber protein utama pakan.',
      kapasitas: '± 50 kg/jam', asumsi: true,
    },
    {
      id: 'mixer-pakan', singkat: 'Mixer pakan', nama: 'Mixer Bahan Pakan', kategori: 'pakan',
      dayaKW: 1.5, motor: ['Motor 1,5 kW + gearbox'], foto: 'mixer-bahan-pakan', warna: '#2048a8',
      fungsi: 'Mixer pita (ribbon) yang mencampur tepung maggot, dedak, jagung giling, dan bahan lain secara merata.',
      kapasitas: '± 100 kg/batch', asumsi: true,
    },
    {
      id: 'peletizer', singkat: 'Peletizer', nama: 'Peletizer Pakan', kategori: 'pakan',
      dayaKW: 5.5, motor: ['Motor 3 fasa 5,5 kW (7,5 HP)'], foto: 'peletizer-pakan', warna: '#1f9a4c',
      fungsi: 'Mesin cetak pelet tipe flat die: adonan ditekan roller melewati lubang cetakan menjadi pelet padat.',
      kapasitas: '± 80–120 kg/jam', asumsi: true,
    },
  ],

  /* ----------------------------------------------------------------
   * ALUR PRODUKSI (untuk penjadwal)
   * Langkah dalam satu alur harus BERURUTAN di hari yang sama.
   * jedaMaksJam: jeda maksimum antar-langkah.
   * perMinggu: berapa kali alur dijalankan dalam seminggu kerja.
   * geserMaksHari: batas pergeseran hari dari jadwal kebiasaan.
 * jadwalKebiasaan: pola manual sebelum dioptimalkan (pembanding hemat).
   * ---------------------------------------------------------------- */
  produksi: [
    {
      id: 'batch-pakan', nama: 'Batch pelet pakan', kategori: 'pakan', prioritas: 1,
      perMinggu: 3, jarakMinHari: 1, jedaMaksJam: 1.5, geserMaksHari: 2,
      langkah: [
        { mesin: 'pencuci-maggot', durasiJam: 1 },
        { mesin: 'pengering-maggot', durasiJam: 3 },
        { mesin: 'penepung-maggot', durasiJam: 1 },
        { mesin: 'mixer-pakan', durasiJam: 0.5 },
        { mesin: 'peletizer', durasiJam: 1.5 },
      ],
      jadwalKebiasaan: { hari: [1, 3, 5], jamMulai: 7.5 },
    },
    {
      id: 'batch-granul', nama: 'Batch pupuk granul', kategori: 'pupuk', prioritas: 2,
      perMinggu: 2, jarakMinHari: 2, jedaMaksJam: 1.5, geserMaksHari: 2,
      langkah: [
        { mesin: 'ayak-kompos', durasiJam: 1.5 },
        { mesin: 'penepung-kompos', durasiJam: 1.5 },
        { mesin: 'mixer-granul', durasiJam: 1 },
        { mesin: 'pan-granulator', durasiJam: 2 },
      ],
      jadwalKebiasaan: { hari: [2, 4], jamMulai: 8 },
    },
    {
      id: 'cacah-harian', nama: 'Pencacahan sampah harian', kategori: 'pupuk', prioritas: 3,
      perMinggu: 6, jarakMinHari: 0, jedaMaksJam: 0, geserMaksHari: 0,
      langkah: [{ mesin: 'pencacah', durasiJam: 1.5 }],
      jadwalKebiasaan: { hari: [1, 2, 3, 4, 5, 6], jamMulai: 7.5 },
    },
  ],

  penjadwal: {
    resolusiMenit: 30,
    cadanganAwan: 0.2, // sisakan 20% PV sebagai penyangga awan
    larangStartBersamaan: true, // motor besar tidak start di slot yang sama (lonjakan arus)
    ambangHijau: 0.8, // ≥80% beban dari surya
    ambangKuning: 0.5, // 50–80% campuran; <50% dominan PLN
    ambangMendung: 0.45, // hari dengan energi surya < 45% hari tercerah → peringatan
    ambangHujanPersen: 70,
  },

  // Beban demo untuk simulasi dasbor energi (jam desimal WIB)
  demoSetiapHari: true, // MODE DEMO: tampilkan mesin bekerja juga di hari libur
  demoHarian: [
    { mesin: 'pencacah', mulai: 9.0, selesai: 10.5 },
    { mesin: 'pencuci-maggot', mulai: 8.0, selesai: 9.0 },
    { mesin: 'pengering-maggot', mulai: 9.0, selesai: 12.0 },
    { mesin: 'penepung-maggot', mulai: 12.0, selesai: 13.0 },
    { mesin: 'mixer-pakan', mulai: 13.0, selesai: 13.5 },
    { mesin: 'peletizer', mulai: 10.5, selesai: 12.0 },
    { mesin: 'ayak-kompos', mulai: 14.0, selesai: 15.0 },
    { mesin: 'pan-granulator', mulai: 13.5, selesai: 15.0 },
  ],

  dampak: { // ASUMSI: angka ilustrasi program
    sampahPerBulanTon: 6.5,
    kkTerlayani: 420,
    maggotPerBulanKg: 900,
    peletPerBulanKg: 600,
    komposPerBulanKg: 2200,
    asumsi: true,
  },
};

export default config;

/* Pembantu kecil yang dipakai di banyak tempat */
export const mesinById = Object.fromEntries(config.mesin.map((m) => [m.id, m]));
export const waLink = (pesan = '') =>
  `https://wa.me/${config.situs.whatsapp}${pesan ? `?text=${encodeURIComponent(pesan)}` : ''}`;
