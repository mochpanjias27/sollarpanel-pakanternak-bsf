/**
 * PENJADWAL CERDAS — memaksimalkan pemakaian langsung energi surya
 * (sistem on-grid tanpa baterai: surya yang tidak dipakai saat itu = hilang).
 *
 * Algoritma (greedy berbobot, resolusi 30 menit):
 *  1. Estimasi PV per slot = kWp × radiasi/1000 × efisiensi, dibatasi daya inverter.
 *  2. Pekerjaan = ALUR produksi (mis. pencuci → pengering → penepung → mixer → peletizer).
 *     Langkah dalam satu alur wajib berurutan pada hari yang sama, dengan jeda maksimum.
 *  3. Alur dengan energi terbesar ditempatkan lebih dulu (mesin terberat dapat jam PV tertinggi).
 *  4. Biaya penempatan = tambahan impor PLN (kWh) + penalti bila beban melewati
 *     (1 − cadangan awan) × PV, supaya jadwal tahan terhadap awan lewat.
 *  5. Batasan: satu mesin tidak bisa dipakai dua tugas sekaligus; dua motor tidak
 *     start di slot yang sama (lonjakan arus); total beban ≤ batas daya PLN;
 *     hari boleh digeser maksimal ±geserMaksHari dari kebiasaan; jarak antar-batch dijaga.
 *  6. Hasil dibandingkan dengan jadwal kebiasaan untuk menghitung penghematan.
 */
import { wib, tambahHari, hariDari, labelTanggal, labelJam, NAMA_HARI } from './waktu.js';
import { dayaPV, radiasiCerah } from './surya.js';

const r2 = (x) => Math.round(x * 100) / 100;
const f1 = (x) => x.toFixed(1).replace('.', ',');

export function susunJadwal(config, prakiraan, opsi = {}) {
  const jumlahHari = opsi.hari ?? 7;
  const nowMs = opsi.nowMs ?? Date.now();
  const P = config.penjadwal;
  const RES = P.resolusiMenit;
  const SPH = 60 / RES; // slot per jam
  const NS = 24 * SPH;
  const DT = RES / 60; // jam per slot
  const mesin = Object.fromEntries(config.mesin.map((m) => [m.id, m]));
  let sekarang = wib(nowMs);
  // Bila jam kerja hari ini hampir habis, rencanakan mulai besok.
  if (sekarang.jam >= config.jamKerja.selesai - 2) sekarang = { ...wib(nowMs + 864e5), jam: 0 };

  // ---------- 1. Hari & estimasi PV per slot ----------
  const radPerJam = new Map(prakiraan.jam.map((j) => [j.waktu, j]));
  const hari = [];
  for (let d = 0; d < jumlahHari; d++) {
    const tanggal = tambahHari(sekarang.tanggal, d);
    const pv = new Array(NS).fill(0);
    const awan = [], hujan = [];
    for (let s = 0; s < NS; s++) {
      const jamTengah = (s + 0.5) / SPH;
      // interpolasi linear antar nilai tengah jam
      const h0 = Math.floor(jamTengah - 0.5);
      const f = jamTengah - 0.5 - h0;
      const g0 = radPerJam.get(kunci(tanggal, h0))?.radiasi ?? 0;
      const g1 = radPerJam.get(kunci(tanggal, h0 + 1))?.radiasi ?? 0;
      pv[s] = dayaPV(g0 * (1 - f) + g1 * f, config.surya);
    }
    for (let h = 0; h < 24; h++) {
      const j = radPerJam.get(kunci(tanggal, h));
      if (h >= 8 && h < 16 && j) { awan.push(j.awan ?? 0); hujan.push(j.peluangHujan ?? 0); }
    }
    const kerja = config.hariKerja.includes(hariDari(tanggal));
    const dasar = new Array(NS).fill(config.bebanMalamKW);
    if (kerja) for (let s = config.jamKerja.mulai * SPH; s < config.jamKerja.selesai * SPH; s++) dasar[s] = config.bebanDasarKW;
    hari.push({
      d, tanggal, kerja, pv, dasar,
      energiPV: pv.reduce((a, b) => a + b, 0) * DT,
      awanRata: rata(awan), hujanMaks: Math.max(0, ...hujan),
      slotMin: d === 0 ? Math.ceil(sekarang.jam * SPH) : 0,
    });
  }
  // Acuan "cerah": hari terbaik di horizon, minimal 85% energi langit cerah teoretis
  let energiCerah = 0;
  for (let s = 0; s < NS; s++) energiCerah += dayaPV(radiasiCerah((s + 0.5) / SPH), config.surya) * DT;
  const pvTerbaik = Math.max(1e-6, 0.85 * energiCerah, ...hari.map((h) => h.energiPV));

  // ---------- 2. Jadwal kebiasaan (pembanding) ----------
  const kejadian = []; // satu entri per batch yang harus dijalankan dalam horizon
  for (const alur of config.produksi) {
    for (const h of hari) {
      if (!h.kerja) continue;
      if (!alur.jadwalKebiasaan.hari.includes(hariDari(h.tanggal))) continue;
      if (h.d === 0 && alur.jadwalKebiasaan.jamMulai * SPH < h.slotMin) continue; // sudah lewat
      kejadian.push({ alur, dKebiasaan: h.d });
    }
  }
  const kebiasaan = buatState(hari);
  const tugasKebiasaan = [];
  for (const k of kejadian) {
    let s = Math.round(k.alur.jadwalKebiasaan.jamMulai * SPH);
    for (const l of k.alur.langkah) {
      const n = Math.round(l.durasiJam * SPH);
      tambahBeban(kebiasaan, k.dKebiasaan, s, n, mesin[l.mesin].dayaKW);
      tugasKebiasaan.push(tugas(k.alur, l, hari[k.dKebiasaan], s, n));
      s += n;
    }
  }

  // ---------- 3. Optimasi ----------
  const st = buatState(hari);
  const energiAlur = (a) => a.langkah.reduce((t, l) => t + mesin[l.mesin].dayaKW * l.durasiJam, 0);
  kejadian.sort((a, b) => energiAlur(b.alur) - energiAlur(a.alur) || a.alur.prioritas - b.alur.prioritas || a.dKebiasaan - b.dKebiasaan);

  const dipilih = new Map(); // alur.id → [d,…]
  const tugasOptimal = [];
  const rekomendasi = [];
  const tidakMuat = [];

  for (const k of kejadian) {
    const { alur } = k;
    const sudah = dipilih.get(alur.id) || [];
    const geser = alur.geserMaksHari ?? (alur.perMinggu >= config.hariKerja.length ? 0 : 2);
    const kandidat = (longgar) => hari.filter((h) =>
      h.kerja && Math.abs(h.d - k.dKebiasaan) <= geser && !sudah.includes(h.d) &&
      (longgar || sudah.every((x) => Math.abs(x - h.d) >= (alur.jarakMinHari ?? 0) + 1)));
    let calon = kandidat(false);
    if (!calon.length) calon = kandidat(true);

    let terbaik = null;
    for (const h of calon) {
      const hasil = tempatkanAlur(st, h, alur);
      // penalti kecil per hari pergeseran: pindah hari hanya bila benar-benar lebih hemat
      if (hasil) hasil.biaya += 0.15 * Math.abs(h.d - k.dKebiasaan);
      if (hasil && (!terbaik || hasil.biaya < terbaik.biaya - 1e-9)) terbaik = hasil;
    }
    if (!terbaik) { tidakMuat.push(alur.nama); continue; }

    // komit
    for (const p of terbaik.penempatan) {
      tambahBeban(st, terbaik.d, p.s, p.n, mesin[p.l.mesin].dayaKW);
      for (let i = p.s; i < p.s + p.n; i++) st.sibuk[terbaik.d][p.l.mesin].add(i);
      st.start[terbaik.d].add(p.s);
      tugasOptimal.push(tugas(alur, p.l, hari[terbaik.d], p.s, p.n));
    }
    dipilih.set(alur.id, [...sudah, terbaik.d]);

    // rekomendasi tertulis: bandingkan dengan posisi kebiasaan (marginal terhadap beban dasar)
    const berat = alur.langkah.reduce((a, b) => (mesin[b.mesin].dayaKW * b.durasiJam > mesin[a.mesin].dayaKW * a.durasiJam ? b : a));
    const pBerat = terbaik.penempatan.find((p) => p.l === berat);
    const sKeb = Math.round(alur.jadwalKebiasaan.jamMulai * SPH) + slotSebelum(alur, berat, SPH);
    const impKeb = imporMarginal(hari[k.dKebiasaan], alur, Math.round(alur.jadwalKebiasaan.jamMulai * SPH), null);
    const impOpt = imporMarginal(hari[terbaik.d], alur, null, terbaik.penempatan);
    const hemat = Math.max(0, impKeb - impOpt);
    const hOpt = hari[terbaik.d];
    const pvSaat = rata(hOpt.pv.slice(pBerat.s, pBerat.s + pBerat.n));
    const pindahHari = terbaik.d !== k.dKebiasaan;
    const kondisi = labelCuaca(hOpt, pvTerbaik).toLowerCase();
    const mBerat = mesin[berat.mesin];
    rekomendasi.push({
      alur: alur.nama,
      mesin: mBerat.nama,
      teks: pindahHari
        ? `Geser ${mBerat.singkat || mBerat.nama} ke ${NAMA_HARI[hariDari(hOpt.tanggal)]} ${labelJam(pBerat.s / SPH)} (biasanya ${NAMA_HARI[hariDari(hari[k.dKebiasaan].tanggal)]} ${labelJam(sKeb / SPH)})`
        : `Jalankan ${mBerat.singkat || mBerat.nama} ${NAMA_HARI[hariDari(hOpt.tanggal)]} pukul ${labelJam(pBerat.s / SPH)}, bukan ${labelJam(sKeb / SPH)}`,
      alasan: `Prakiraan ${kondisi}, estimasi PV ±${f1(pvSaat)} kW saat mesin ${f1(mBerat.dayaKW)} kW bekerja.`,
      hematKWh: r2(hemat),
      hematRp: Math.round(hemat * config.pln.tarifPerKWh),
      tanggal: hOpt.tanggal,
      jam: pBerat.s / SPH,
    });
  }

  // ---------- 4. Ringkasan per hari ----------
  const ringkasHari = hari.map((h) => {
    const beban = st.beban[h.d];
    const bebanKeb = kebiasaan.beban[h.d];
    const e = hitungEnergi(h.pv, beban, DT, config.jamKerja, SPH);
    const eKeb = hitungEnergi(h.pv, bebanKeb, DT, config.jamKerja, SPH);
    const rasio = e.beban > 0 ? e.dariSurya / e.beban : 1;
    const warna = rasio >= P.ambangHijau ? 'hijau' : rasio >= P.ambangKuning ? 'kuning' : 'merah';
    const slotWarna = beban.map((b, s) => {
      if (b <= h.dasar[s] + 1e-6) return null;
      const r = Math.min(h.pv[s], b) / b;
      return r >= P.ambangHijau ? 'hijau' : r >= P.ambangKuning ? 'kuning' : 'merah';
    });
    return {
      tanggal: h.tanggal, label: labelTanggal(h.tanggal), labelPendek: labelTanggal(h.tanggal, true),
      hariKerja: h.kerja, cuaca: labelCuaca(h, pvTerbaik),
      awanRata: Math.round(h.awanRata), peluangHujanMaks: Math.round(h.hujanMaks),
      pv: h.pv.map(r2), beban: beban.map(r2), slotWarna,
      pvPuncakKW: r2(Math.max(...h.pv)),
      energiPV: r2(h.energiPV), energiBeban: r2(e.beban), energiImpor: r2(e.impor), energiDariSurya: r2(e.dariSurya),
      energiImporKebiasaan: r2(eKeb.impor),
      rasioSurya: r2(rasio), warna,
    };
  });

  // ---------- 5. Peringatan mendung/hujan ----------
  const peringatan = [];
  for (const h of hari) {
    const rasioPV = h.energiPV / pvTerbaik;
    if (rasioPV < P.ambangMendung || h.hujanMaks >= P.ambangHujanPersen) {
      const tugasHari = tugasOptimal.filter((t) => t.tanggal === h.tanggal && t.dayaKW >= 2);
      const hariCerah = ringkasHari.filter((x) => x.hariKerja && x.cuaca === 'Cerah' && x.tanggal !== h.tanggal).map((x) => x.label.split(',')[0]);
      peringatan.push({
        tanggal: h.tanggal,
        tingkat: rasioPV < P.ambangMendung * 0.7 ? 'tinggi' : 'sedang',
        teks: `${labelTanggal(h.tanggal)}: prakiraan ${h.hujanMaks >= P.ambangHujanPersen ? `hujan (peluang ${Math.round(h.hujanMaks)}%)` : 'mendung'}, energi surya hanya ±${Math.round(rasioPV * 100)}% dari hari tercerah.` +
          (h.kerja && tugasHari.length
            ? ` Pekerjaan berat yang masih terjadwal: ${[...new Set(tugasHari.map((t) => t.mesinSingkat))].join(', ')}. ${hariCerah.length ? `Bila bisa, geser ke ${hariCerah.slice(0, 2).join(' atau ')}.` : 'Jalankan sependek mungkin di sekitar 11.00–13.00.'}`
            : h.kerja ? ' Tidak ada pekerjaan berat terjadwal hari ini.' : ''),
      });
    }
  }

  // ---------- 6. Total ----------
  const tot = (k) => ringkasHari.reduce((a, h) => a + h[k], 0);
  const imporOpt = tot('energiImpor');
  const imporKeb = tot('energiImporKebiasaan');
  const bebanTot = tot('energiBeban');
  const dariSuryaOpt = tot('energiDariSurya');
  const dariSuryaKeb = ringkasHari.reduce((a, h, i) => a + hitungEnergi(hari[i].pv, kebiasaan.beban[i], DT, config.jamKerja, SPH).dariSurya, 0);
  const hematKWh = Math.max(0, imporKeb - imporOpt);

  tugasOptimal.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.mulai - b.mulai);
  rekomendasi.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.jam - b.jam);

  return {
    dibuat: new Date(nowMs).toISOString(),
    sumberPrakiraan: prakiraan.sumber,
    resolusiMenit: RES,
    hari: ringkasHari,
    tugas: tugasOptimal,
    tugasKebiasaan,
    rekomendasi,
    peringatan,
    tidakMuat,
    ringkasan: {
      imporOptimalKWh: r2(imporOpt),
      imporKebiasaanKWh: r2(imporKeb),
      hematKWh: r2(hematKWh),
      hematRp: Math.round(hematKWh * config.pln.tarifPerKWh),
      rasioSuryaOptimal: bebanTot > 0 ? r2(dariSuryaOpt / bebanTot) : 0,
      rasioSuryaKebiasaan: bebanTot > 0 ? r2(dariSuryaKeb / bebanTot) : 0,
      energiBebanKWh: r2(bebanTot),
    },
  };

  // ================= fungsi dalam =================
  function buatState(hs) {
    return {
      beban: hs.map((h) => h.dasar.slice()),
      sibuk: hs.map(() => Object.fromEntries(config.mesin.map((m) => [m.id, new Set()]))),
      start: hs.map(() => new Set()),
    };
  }

  function tambahBeban(state, d, s, n, p) {
    for (let i = s; i < s + n && i < NS; i++) state.beban[d][i] += p;
  }

  function biayaBlok(h, d, s, n, p) {
    const L = st.beban[d];
    let b = 0;
    const c = 1 - P.cadanganAwan;
    for (let i = s; i < s + n; i++) {
      const pv = h.pv[i];
      b += (Math.max(0, L[i] + p - pv) - Math.max(0, L[i] - pv)) * DT;
      b += 0.25 * (Math.max(0, L[i] + p - c * pv) - Math.max(0, L[i] - c * pv)) * DT;
    }
    return b;
  }

  function bolehDitempatkan(h, d, s, n, l) {
    const m = mesin[l.mesin];
    const awal = Math.max(config.jamKerja.mulai * SPH, h.slotMin);
    if (s < awal || s + n > config.jamKerja.selesai * SPH) return false;
    if (P.larangStartBersamaan && m.dayaKW > 0 && st.start[d].has(s)) return false;
    for (let i = s; i < s + n; i++) {
      if (st.sibuk[d][l.mesin].has(i)) return false;
      if (st.beban[d][i] + m.dayaKW > config.pln.batasDayaKW) return false;
    }
    return true;
  }

  function tempatkanAlur(stt, h, alur) {
    const d = h.d;
    const maksJeda = Math.round((alur.jedaMaksJam ?? 0) * SPH);
    const durasi = alur.langkah.map((l) => Math.round(l.durasiJam * SPH));
    const mulaiMin = Math.max(config.jamKerja.mulai * SPH, h.slotMin);
    const mulaiMaks = config.jamKerja.selesai * SPH - durasi.reduce((a, b) => a + b, 0);
    let terbaik = null;
    for (let s0 = mulaiMin; s0 <= mulaiMaks; s0++) {
      let biaya = 0, ok = true, akhir = s0;
      const pen = [];
      for (let k = 0; k < alur.langkah.length; k++) {
        const l = alur.langkah[k], n = durasi[k], p = mesin[l.mesin].dayaKW;
        let pilih = null;
        const dari = k === 0 ? s0 : akhir;
        const sampai = k === 0 ? s0 : akhir + maksJeda;
        for (let s = dari; s <= sampai; s++) {
          if (!bolehDitempatkan(h, d, s, n, l)) continue;
          const b = biayaBlok(h, d, s, n, p) + (s - dari) * 1e-4;
          if (!pilih || b < pilih.b) pilih = { s, b };
        }
        if (!pilih) { ok = false; break; }
        biaya += pilih.b; pen.push({ l, s: pilih.s, n }); akhir = pilih.s + n;
      }
      if (!ok) continue;
      biaya += s0 * 1e-5; // seri: pilih yang lebih awal
      if (!terbaik || biaya < terbaik.biaya) terbaik = { d, biaya, penempatan: pen };
    }
    return terbaik;
  }

  function imporMarginal(h, alur, sMulai, penempatan) {
    let tot = 0;
    const pos = penempatan || (() => {
      let s = sMulai; return alur.langkah.map((l) => { const n = Math.round(l.durasiJam * SPH); const r = { l, s, n }; s += n; return r; });
    })();
    for (const p of pos) {
      const pw = mesin[p.l.mesin].dayaKW;
      for (let i = p.s; i < p.s + p.n; i++) tot += (Math.max(0, h.dasar[i] + pw - h.pv[i]) - Math.max(0, h.dasar[i] - h.pv[i])) * DT;
    }
    return tot;
  }

  function tugas(alur, l, h, s, n) {
    const m = mesin[l.mesin];
    return {
      alurId: alur.id, alurNama: alur.nama, kategori: alur.kategori,
      mesinId: m.id, mesinNama: m.nama, mesinSingkat: m.singkat || m.nama, dayaKW: m.dayaKW,
      tanggal: h.tanggal, mulai: s / SPH, selesai: (s + n) / SPH,
      energiKWh: r2(m.dayaKW * n * DT),
    };
  }
}

function kunci(tanggal, h) {
  return `${tanggal}T${String(h).padStart(2, '0')}:00`;
}
function rata(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function slotSebelum(alur, langkah, SPH) {
  let s = 0;
  for (const l of alur.langkah) { if (l === langkah) break; s += Math.round(l.durasiJam * SPH); }
  return s;
}
function hitungEnergi(pv, beban, DT, jamKerja, SPH) {
  let b = 0, imp = 0, ds = 0;
  for (let i = jamKerja.mulai * SPH; i < jamKerja.selesai * SPH; i++) {
    b += beban[i] * DT; imp += Math.max(0, beban[i] - pv[i]) * DT; ds += Math.min(pv[i], beban[i]) * DT;
  }
  return { beban: b, impor: imp, dariSurya: ds };
}
function labelCuaca(h, pvTerbaik) {
  const r = h.energiPV / pvTerbaik;
  if (r < 0.45 || h.hujanMaks >= 70) return 'Mendung/Hujan';
  if (r < 0.75 || h.awanRata > 60) return 'Berawan';
  return 'Cerah';
}
