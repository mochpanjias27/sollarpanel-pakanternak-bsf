// Model 3D prosedural semua mesin (Three.js, tanpa file model eksternal).
// Bentuk & warna mengikuti foto lapangan; mesin tanpa foto dibuat dari asumsi
// bentuk umum mesin sejenis. Satuan: meter. Depan mesin menghadap +Z.
import * as THREE from '../../vendor/three/three.module.min.js';

export const WARNA = {
  oranye: 0xf06a1d, biru: 0x2a4fb5, biruMotor: 0x2f63d6, hijau: 0x179a6c, hijauMotor: 0x1f8a4a,
  hijauLabel: 0x1fa34a, baja: 0xc9ced3, galvanis: 0xb4bac0, gelap: 0x2b2f33, merah: 0xd7262e,
  kayu: 0xd8c39a, kompos: 0x4a3426, bata: 0xbfb8aa, air: 0x4aa3d8, pelet: 0x7a5232, granul: 0x3b2a1e,
};

const cacheMat = new Map();
export function mat(warna, opsi = {}) {
  const k = `${warna}-${JSON.stringify(opsi)}`;
  if (!cacheMat.has(k)) {
    cacheMat.set(k, new THREE.MeshStandardMaterial({
      color: warna, roughness: opsi.roughness ?? 0.55, metalness: opsi.metalness ?? 0.15,
      transparent: !!opsi.opacity, opacity: opsi.opacity ?? 1, side: opsi.ganda ? THREE.DoubleSide : THREE.FrontSide,
      emissive: opsi.emissive ?? 0x000000, emissiveIntensity: opsi.emissiveIntensity ?? 1,
      wireframe: !!opsi.wireframe, flatShading: !!opsi.flat,
    }));
  }
  return cacheMat.get(k);
}
const BAJA = () => mat(WARNA.baja, { metalness: 0.75, roughness: 0.28 });
const GALV = () => mat(WARNA.galvanis, { metalness: 0.6, roughness: 0.35 });

function mesh(geo, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true; o.receiveShadow = true;
  return o;
}
export const kotak = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
export const tabung = (rt, rb, h, m, x, y, z, seg = 24, terbuka = false) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, terbuka), m, x, y, z);

/** Rangka kaki 4 pipa kotak + palang bawah. */
function rangka(w, h, d, warna = WARNA.biru, t = 0.04) {
  const g = new THREE.Group();
  const m = mat(warna, { roughness: 0.5, metalness: 0.3 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(kotak(t, h, t, m, sx * (w / 2 - t / 2), h / 2, sz * (d / 2 - t / 2)));
  for (const y of [0.08, h - t / 2]) {
    for (const sz of [-1, 1]) g.add(kotak(w, t, t, m, 0, y, sz * (d / 2 - t / 2)));
    for (const sx of [-1, 1]) g.add(kotak(t, t, d, m, sx * (w / 2 - t / 2), y, 0));
  }
  return g;
}

/** Motor listrik bersirip; sumbu poros ke +X. */
function motor(warna = WARNA.biruMotor, s = 1) {
  const g = new THREE.Group();
  const m = mat(warna, { metalness: 0.35, roughness: 0.45 });
  const badan = tabung(0.1 * s, 0.1 * s, 0.28 * s, m, 0, 0, 0, 28); badan.rotation.z = Math.PI / 2; g.add(badan);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const sirip = kotak(0.24 * s, 0.012 * s, 0.03 * s, m, -0.01 * s, Math.cos(a) * 0.105 * s, Math.sin(a) * 0.105 * s);
    sirip.rotation.x = a; g.add(sirip);
  }
  const tutup = tabung(0.095 * s, 0.095 * s, 0.07 * s, mat(0x2b3440), -0.17 * s, 0, 0, 24); tutup.rotation.z = Math.PI / 2; g.add(tutup);
  g.add(kotak(0.09 * s, 0.06 * s, 0.1 * s, m, 0.02 * s, 0.13 * s, 0));
  for (const sz of [-1, 1]) g.add(kotak(0.24 * s, 0.03 * s, 0.05 * s, m, 0, -0.1 * s, sz * 0.075 * s));
  const poros = tabung(0.018 * s, 0.018 * s, 0.1 * s, BAJA(), 0.19 * s, 0, 0, 12); poros.rotation.z = Math.PI / 2; g.add(poros);
  return g;
}

function puli(r, tebal = 0.04, warna = WARNA.gelap) {
  const g = new THREE.Group();
  const p = tabung(r, r, tebal, mat(warna, { metalness: 0.6, roughness: 0.4 }), 0, 0, 0, 28);
  p.rotation.x = Math.PI / 2; g.add(p);
  for (let i = 0; i < 4; i++) { const j = kotak(r * 1.8, 0.02, tebal * 1.1, mat(0x777f88, { metalness: 0.6 })); j.rotation.z = (i * Math.PI) / 4; g.add(j); }
  return g;
}

/** Pelindung sabuk bentuk stadion (oranye seperti di foto). */
function pelindungSabuk(panjang, r1, r2, tebal = 0.07, warna = WARNA.oranye) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, Math.PI / 2, (3 * Math.PI) / 2, false);
  s.lineTo(panjang, -r2);
  s.absarc(panjang, 0, r2, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(0, r1);
  const geo = new THREE.ExtrudeGeometry(s, { depth: tebal, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 18 });
  return mesh(geo, mat(warna, { roughness: 0.45 }));
}

/** Corong frustum persegi (atas lebar). */
function corong(atas, bawah, h, m, terbuka = true) {
  const geo = new THREE.CylinderGeometry(atas / Math.SQRT2, bawah / Math.SQRT2, h, 4, 1, terbuka);
  geo.rotateY(Math.PI / 4);
  const o = mesh(geo, m);
  o.material = m.clone(); o.material.side = THREE.DoubleSide;
  return o;
}

/** Bak setengah silinder (mixer) terbuka di atas, sumbu X. */
function bakMixer(panjang, r, tinggiDinding, warna) {
  const g = new THREE.Group();
  const m = mat(warna, { ganda: true, roughness: 0.5, metalness: 0.25 });
  const alas = mesh(new THREE.CylinderGeometry(r, r, panjang, 28, 1, true, Math.PI, Math.PI), m);
  alas.rotation.z = Math.PI / 2; g.add(alas);
  for (const sz of [-1, 1]) g.add(kotak(panjang, tinggiDinding, 0.02, m, 0, tinggiDinding / 2, sz * r));
  for (const sx of [-1, 1]) {
    const ujung = mesh(new THREE.CircleGeometry(r, 24, Math.PI, Math.PI), m);
    ujung.rotation.y = Math.PI / 2; ujung.position.x = (sx * panjang) / 2; g.add(ujung);
    g.add(kotak(0.02, tinggiDinding, r * 2, m, (sx * panjang) / 2, tinggiDinding / 2, 0));
  }
  // bibir & rusuk penguat
  for (const sz of [-1, 1]) g.add(kotak(panjang + 0.06, 0.04, 0.05, m, 0, tinggiDinding, sz * (r + 0.01)));
  g.add(kotak(0.04, tinggiDinding, 0.03, m, 0, tinggiDinding / 2, r + 0.02));
  return g;
}

/** Pita heliks (ribbon) mixer, berputar pada sumbu X. */
function pitaMixer(panjang, r) {
  const g = new THREE.Group();
  class Heliks extends THREE.Curve {
    constructor(rr, putaran, fase) { super(); this.rr = rr; this.putaran = putaran; this.fase = fase; }
    getPoint(t, target = new THREE.Vector3()) {
      const a = t * Math.PI * 2 * this.putaran + this.fase;
      return target.set((t - 0.5) * panjang, Math.cos(a) * this.rr, Math.sin(a) * this.rr);
    }
  }
  const m = BAJA();
  g.add(mesh(new THREE.TubeGeometry(new Heliks(r * 0.85, 2.2, 0), 160, 0.014, 6), m));
  g.add(mesh(new THREE.TubeGeometry(new Heliks(r * 0.5, -2.2, Math.PI), 160, 0.012, 6), m));
  const poros = tabung(0.025, 0.025, panjang + 0.1, m, 0, 0, 0, 12); poros.rotation.z = Math.PI / 2; g.add(poros);
  for (let i = 0; i < 5; i++) {
    const jari = kotak(0.015, r * 1.7, 0.015, m, (i / 4 - 0.5) * panjang * 0.9, 0, 0);
    jari.rotation.x = i * 0.9; g.add(jari);
  }
  return g;
}

/** Plakat nama hijau seperti di lapangan. */
export function plakat(teks, lebar = 0.42) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 96;
  const c = cv.getContext('2d');
  c.fillStyle = '#1fa34a'; c.fillRect(0, 0, 512, 96);
  c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.strokeRect(6, 6, 500, 84);
  c.fillStyle = '#fff59a'; c.font = 'bold 44px "Arial Black", Arial, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  let ukuran = 44;
  while (c.measureText(teks).width > 470 && ukuran > 20) { ukuran -= 2; c.font = `bold ${ukuran}px "Arial Black", Arial, sans-serif`; }
  c.fillText(teks, 256, 50);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const o = new THREE.Mesh(new THREE.PlaneGeometry(lebar, lebar * 96 / 512), new THREE.MeshBasicMaterial({ map: tex }));
  return o;
}

/** Partikel jatuh sederhana (pelet, tepung, granul). */
function partikel(jumlah, geo, m, asal, arah, panjang) {
  const inst = new THREE.InstancedMesh(geo, m, jumlah);
  inst.castShadow = true;
  const fase = Array.from({ length: jumlah }, () => Math.random());
  const geser = Array.from({ length: jumlah }, () => new THREE.Vector3((Math.random() - 0.5) * 0.06, 0, (Math.random() - 0.5) * 0.06));
  const dummy = new THREE.Object3D();
  inst.userData.update = (t, aktif) => {
    for (let i = 0; i < jumlah; i++) {
      const f = (fase[i] + t * 0.9) % 1;
      dummy.position.copy(asal).addScaledVector(arah, f * panjang).add(geser[i]);
      dummy.position.y -= f * f * 0.25;
      dummy.rotation.set(f * 9 + i, i, f * 5);
      const s = aktif ? 1 : 0.0001;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  };
  return inst;
}

/* =================================================================
 * MESIN-MESIN
 * Setiap pembuat mengembalikan { grup, perbarui(t, dt, aktif), ukuran }
 * ================================================================= */

function pencacah() {
  const g = new THREE.Group();
  g.add(rangka(0.9, 0.75, 0.6));
  g.add(kotak(0.62, 0.42, 0.46, BAJA(), 0, 0.97, 0));
  const c = corong(0.62, 0.4, 0.38, mat(WARNA.biru, { metalness: 0.3 }));
  c.position.set(-0.05, 1.37, 0); g.add(c);
  const saluran = kotak(0.32, 0.06, 0.34, GALV(), 0.5, 0.72, 0); saluran.rotation.z = -0.55; g.add(saluran);
  const m = motor(WARNA.biruMotor, 1.25); m.position.set(-0.1, 0.25, 0.05); g.add(m);
  const roda = puli(0.2, 0.05); roda.position.set(0.05, 0.97, 0.3); g.add(roda);
  const kecil = puli(0.07); kecil.position.set(0.15, 0.25, 0.3); g.add(kecil);
  const sabuk = pelindungSabuk(0.72, 0.22, 0.09, 0.06); sabuk.rotation.z = -Math.PI / 2 - 0.13; sabuk.position.set(0.05, 0.97, 0.33); g.add(sabuk);
  const pl = plakat('MESIN PENCACAH'); pl.position.set(0, 0.5, 0.305); g.add(pl);
  return {
    grup: g, ukuran: 1.4,
    perbarui(t, dt, aktif) {
      if (aktif) { roda.rotation.z -= dt * 14; kecil.rotation.z -= dt * 30; g.children[1].position.y = 0.97 + Math.sin(t * 60) * 0.002; }
    },
  };
}

function komposter() {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.2, 0.09, 0.1);
  const pos = [];
  const ruang = 3, lebarRuang = 1.0, tinggi = 0.9, dalam = 1.0;
  const tambahDinding = (x0, z0, panjang, sumbu) => {
    const n = Math.floor(panjang / 0.21);
    for (let baris = 0; baris < 9; baris++) {
      for (let i = 0; i < n; i++) {
        if ((baris % 2 === 1) && (i % 2 === 0)) continue; // celah terawang
        const off = (i + (baris % 2) * 0.5) * 0.21 - panjang / 2 + 0.105;
        pos.push(sumbu === 'x' ? [x0 + off, 0.05 + baris * 0.1, z0, 0] : [x0, 0.05 + baris * 0.1, z0 + off, Math.PI / 2]);
      }
    }
  };
  const total = ruang * lebarRuang;
  tambahDinding(0, -dalam / 2, total, 'x');
  for (let i = 0; i <= ruang; i++) tambahDinding(-total / 2 + i * lebarRuang, 0, dalam, 'z');
  const inst = new THREE.InstancedMesh(geo, mat(WARNA.bata, { roughness: 0.9 }), pos.length);
  const d = new THREE.Object3D();
  pos.forEach(([x, y, z, r], i) => { d.position.set(x, y, z); d.rotation.set(0, r, 0); d.updateMatrix(); inst.setMatrixAt(i, d.matrix); });
  inst.castShadow = true; inst.receiveShadow = true;
  g.add(inst);
  // tumpukan kompos
  const tumpukan = [];
  for (let i = 0; i < ruang; i++) {
    const geoK = new THREE.IcosahedronGeometry(0.45, 1);
    geoK.scale(1, 0.55, 0.95);
    const k = mesh(geoK, mat([0x5b4030, 0x4a3426, 0x3a291d][i], { roughness: 1, flat: true }), -total / 2 + lebarRuang * (i + 0.5), 0.25 + i * 0.04, 0);
    g.add(k); tumpukan.push(k);
  }
  // uap tipis (pengomposan aerob panas)
  const uap = [];
  for (let i = 0; i < 9; i++) {
    const u = mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xffffff, { opacity: 0.25, roughness: 1 }));
    u.castShadow = false; u.userData.f = Math.random(); u.userData.x = -total / 2 + lebarRuang * ((i % 3) + 0.5) + (Math.random() - 0.5) * 0.3;
    g.add(u); uap.push(u);
  }
  const pl = plakat('KOMPOSTER BATA TERAWANG', 0.6); pl.position.set(0, 1.0, -dalam / 2 + 0.06); g.add(pl);
  return {
    grup: g, ukuran: 3.2, pasif: true,
    perbarui(t) {
      for (const u of uap) {
        const f = (u.userData.f + t * 0.12) % 1;
        u.position.set(u.userData.x + Math.sin(t + f * 6) * 0.05, 0.55 + f * 0.8, Math.cos(f * 5) * 0.1);
        u.scale.setScalar(0.6 + f * 1.6);
        u.material.opacity = 0.22 * (1 - f);
      }
    },
  };
}

function ayakKompos() {
  const g = new THREE.Group();
  const mB = mat(WARNA.biru, { metalness: 0.3 });
  // dudukan memanjang (talang)
  g.add(kotak(2.2, 0.12, 0.08, mB, 0, 0.42, 0.42));
  g.add(kotak(2.2, 0.12, 0.08, mB, 0, 0.42, -0.42));
  for (const x of [-1.05, 1.05]) for (const z of [-0.42, 0.42]) g.add(kotak(0.06, 0.42, 0.06, mB, x, 0.21, z));
  g.add(kotak(2.0, 0.02, 0.8, mat(0xe9e4da, { roughness: 1 }), 0, 0.02, 0)); // terpal penampung
  const drum = new THREE.Group(); drum.position.set(0.1, 0.62, 0); drum.rotation.z = -0.05;
  const jaring = mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.7, 28, 6, true), mat(0x2f8f4a, { opacity: 0.45, ganda: true, roughness: 0.8 }));
  jaring.rotation.z = Math.PI / 2; drum.add(jaring);
  const kawat = mesh(new THREE.CylinderGeometry(0.362, 0.362, 1.7, 28, 14, true), mat(0x1d6b36, { wireframe: true }));
  kawat.rotation.z = Math.PI / 2; drum.add(kawat);
  for (const x of [-0.85, -0.3, 0.3, 0.85]) {
    const cincin = mesh(new THREE.TorusGeometry(0.37, 0.018, 8, 32), mB); cincin.rotation.y = Math.PI / 2; cincin.position.x = x; drum.add(cincin);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    drum.add(kotak(1.7, 0.03, 0.03, mB, 0, Math.cos(a) * 0.36, Math.sin(a) * 0.36));
  }
  const as = tabung(0.025, 0.025, 2.3, BAJA(), 0, 0, 0, 12); as.rotation.z = Math.PI / 2; drum.add(as);
  g.add(drum);
  const piring = tabung(0.42, 0.42, 0.03, mat(WARNA.biru), -1.0, 0.62, 0, 32); piring.rotation.z = Math.PI / 2; g.add(piring);
  const tepi = mesh(new THREE.TorusGeometry(0.42, 0.02, 6, 32, Math.PI / 2), mat(WARNA.oranye)); tepi.position.set(-1.02, 0.62, 0); tepi.rotation.y = Math.PI / 2; g.add(tepi);
  const m = motor(WARNA.biruMotor, 0.8); m.position.set(1.15, 0.2, 0.25); g.add(m);
  const pl = plakat('MESIN AYAK KOMPOS'); pl.position.set(0.3, 0.42, 0.465); g.add(pl);
  return { grup: g, ukuran: 2.3, perbarui(t, dt, aktif) { if (aktif) drum.rotation.x += dt * 2.2; } };
}

function penepung({ warnaBadan = WARNA.hijau, s = 1, teks = 'MESIN PENEPUNG MAGGOT', warnaRangka = WARNA.hijau } = {}) {
  const g = new THREE.Group();
  const mH = mat(warnaBadan, { metalness: 0.35, roughness: 0.4 });
  const rk = rangka(0.5 * s, 0.55 * s, 0.42 * s, warnaRangka, 0.035); g.add(rk);
  g.add(kotak(0.5 * s, 0.03, 0.42 * s, mat(warnaRangka), 0, 0.55 * s, 0));
  const tiang = kotak(0.16 * s, 0.25 * s, 0.16 * s, mH, 0.05 * s, 0.68 * s, 0); g.add(tiang);
  const rumah = tabung(0.2 * s, 0.2 * s, 0.17 * s, mH, 0.05 * s, 0.95 * s, 0, 32); rumah.rotation.x = Math.PI / 2; g.add(rumah);
  const tengah = tabung(0.09 * s, 0.09 * s, 0.25 * s, mH, -0.08 * s, 0.95 * s, 0, 20); tengah.rotation.z = Math.PI / 2; g.add(tengah);
  const leher = kotak(0.16 * s, 0.2 * s, 0.14 * s, mH, 0.2 * s, 1.1 * s, 0); leher.rotation.z = -0.4; g.add(leher);
  const c = corong(0.32 * s, 0.14 * s, 0.3 * s, mH); c.position.set(0.28 * s, 1.33 * s, 0); c.rotation.z = -0.15; g.add(c);
  const bibir = corong(0.33 * s, 0.32 * s, 0.03 * s, mat(0xa5142a)); bibir.position.set(0.3 * s, 1.49 * s, 0); bibir.rotation.z = -0.15; g.add(bibir);
  const kenop = tabung(0.05 * s, 0.05 * s, 0.03 * s, mat(WARNA.merah), 0.17 * s, 0.95 * s, 0.12 * s, 16); kenop.rotation.x = Math.PI / 2; g.add(kenop);
  const keluar = kotak(0.12 * s, 0.14 * s, 0.12 * s, mH, 0.05 * s, 0.7 * s, 0.14 * s); g.add(keluar);
  const sabuk = pelindungSabuk(0.6 * s, 0.11 * s, 0.07 * s, 0.05, WARNA.oranye);
  sabuk.rotation.z = -Math.PI / 2; sabuk.rotation.y = Math.PI / 2; sabuk.position.set(-0.22 * s, 0.95 * s, 0.05 * s); g.add(sabuk);
  const m = motor(WARNA.biruMotor, 0.9 * s); m.position.set(0, 0.25 * s, 0); m.rotation.y = Math.PI; g.add(m);
  const kipas = puli(0.08 * s, 0.02); kipas.position.set(0.17 * s, 0.25 * s, 0); kipas.rotation.y = Math.PI / 2; g.add(kipas);
  const pl = plakat(teks, 0.36 * s); pl.position.set(0, 0.1 * s, 0.215 * s); g.add(pl);
  const bak = kotak(0.4 * s, 0.12 * s, 0.3 * s, mat(0xb9a98c, { roughness: 0.9 }), 0.1 * s, 0.06, 0.45 * s); g.add(bak);
  const debu = partikel(18, new THREE.SphereGeometry(0.008 * s, 5, 4), mat(warnaBadan === WARNA.hijau && teks.includes('MAGGOT') ? 0x8a6a3c : 0x5b4030), new THREE.Vector3(0.05 * s, 0.62 * s, 0.18 * s), new THREE.Vector3(0.02, -1, 0.5).normalize(), 0.45 * s);
  g.add(debu);
  return {
    grup: g, ukuran: 1.6 * s,
    perbarui(t, dt, aktif) {
      debu.userData.update(t, aktif);
      if (aktif) { kipas.rotation.x += dt * 40; rumah.position.y = 0.95 * s + Math.sin(t * 70) * 0.0015; }
    },
  };
}

function mixerGranul() {
  const g = new THREE.Group();
  g.add(rangka(1.05, 0.62, 0.62, WARNA.biru));
  const bak = bakMixer(1.0, 0.27, 0.32, WARNA.oranye); bak.position.y = 0.92; g.add(bak);
  g.add(kotak(1.04, 0.025, 0.6, mat(WARNA.kayu, { roughness: 0.9 }), 0, 1.25, 0)); // tutup triplek
  const karung = mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(0xc9c2b2, { roughness: 1, flat: true }), 0.25, 1.36, 0.05); karung.scale.set(1.4, 0.6, 1); g.add(karung);
  const pita = pitaMixer(0.95, 0.24); pita.position.y = 0.92; g.add(pita);
  const gear = kotak(0.16, 0.16, 0.14, mat(0x2f7d4f, { metalness: 0.4 }), 0.66, 0.92, 0); g.add(gear);
  const m = motor(WARNA.biruMotor, 0.9); m.position.set(0.7, 0.2, 0.15); g.add(m);
  // screw conveyor miring dari corong lantai ke atas bak
  const sc = new THREE.Group();
  const pj = 2.0;
  const pipa = tabung(0.075, 0.075, pj, mat(WARNA.oranye), 0, 0, 0, 20); pipa.rotation.z = Math.PI / 2; sc.add(pipa);
  sc.position.set(1.05, 0.95, 0.42); sc.rotation.z = Math.PI - 0.62; g.add(sc);
  const ulir = new THREE.Group(); sc.add(ulir);
  for (let i = 0; i < 26; i++) { const daun = kotak(0.01, 0.13, 0.03, BAJA(), -pj / 2 + 0.05 + i * 0.075, 0, 0); daun.rotation.x = i * 0.6; ulir.add(daun); }
  const ca = corong(0.4, 0.16, 0.25, mat(WARNA.oranye)); ca.position.set(1.85, 0.32, 0.42); g.add(ca);
  const mAtas = motor(WARNA.biruMotor, 0.8); mAtas.position.set(0.3, 1.78, 0.42); mAtas.rotation.z = -0.62; g.add(mAtas);
  const pAtas = puli(0.11, 0.03); pAtas.position.set(0.2, 1.62, 0.55); g.add(pAtas);
  const pl = plakat('MIXER BAHAN GRANUL'); pl.position.set(-0.15, 1.12, 0.29); g.add(pl);
  return {
    grup: g, ukuran: 2.2,
    perbarui(t, dt, aktif) { if (aktif) { pita.rotation.x += dt * 3; ulir.rotation.x += dt * 9; pAtas.rotation.z -= dt * 12; } },
  };
}

function panGranulator() {
  const g = new THREE.Group();
  const rk = rangka(1.0, 0.45, 0.8, WARNA.biru); g.add(rk);
  const tiang = kotak(0.1, 0.4, 0.1, mat(WARNA.biru), 0, 0.62, -0.32); tiang.rotation.x = 0.3; g.add(tiang);
  const pan = new THREE.Group();
  pan.position.set(0, 1.0, 0.05); pan.rotation.x = 0.85;
  const dinding = mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.22, 40, 1, true), mat(WARNA.oranye, { ganda: true }));
  pan.add(dinding);
  const dasar = tabung(0.58, 0.58, 0.02, mat(0xd8601b), 0, -0.1, 0, 40); pan.add(dasar);
  const bibir = mesh(new THREE.TorusGeometry(0.58, 0.02, 6, 40), mat(WARNA.oranye)); bibir.rotation.x = Math.PI / 2; bibir.position.y = 0.11; pan.add(bibir);
  // granul di dalam pan
  const n = 140;
  const butir = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.022, 0), mat(WARNA.granul, { roughness: 0.9, flat: true }), n);
  const d = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 1.1 + Math.PI * 0.95, r = 0.15 + Math.random() * 0.38;
    d.position.set(Math.cos(a) * r, -0.07 + Math.random() * 0.03, Math.sin(a) * r); d.updateMatrix(); butir.setMatrixAt(i, d.matrix);
  }
  pan.add(butir);
  const putar = new THREE.Group(); putar.add(dinding, dasar, bibir, butir); pan.add(putar);
  g.add(pan);
  const gear = kotak(0.22, 0.2, 0.2, mat(0x2f7d4f, { metalness: 0.4 }), 0, 0.55, -0.35); g.add(gear);
  const m = motor(WARNA.biruMotor, 0.9); m.position.set(0.3, 0.2, -0.2); g.add(m);
  const pl = plakat('PAN GRANULATOR'); pl.position.set(0, 0.3, 0.405); g.add(pl);
  return { grup: g, ukuran: 1.7, perbarui(t, dt, aktif) { if (aktif) putar.rotation.y += dt * 1.6; } };
}

function pencuciMaggot() {
  const g = new THREE.Group();
  g.add(rangka(0.85, 0.5, 0.85, WARNA.biru));
  const tong = tabung(0.38, 0.34, 0.55, mat(WARNA.baja, { metalness: 0.75, roughness: 0.28, ganda: true }), 0, 0.78, 0, 36, true); g.add(tong);
  g.add(tabung(0.34, 0.34, 0.02, BAJA(), 0, 0.51, 0, 36));
  const air = tabung(0.36, 0.36, 0.02, mat(WARNA.air, { opacity: 0.65, roughness: 0.1, metalness: 0.1 }), 0, 0.92, 0, 36); g.add(air);
  const maggot = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.008, 0.03, 2, 4), mat(0xd9c48a, { roughness: 0.6 }), 60);
  const d = new THREE.Object3D();
  for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28, r = Math.random() * 0.3; d.position.set(Math.cos(a) * r, 0.935, Math.sin(a) * r); d.rotation.set(Math.PI / 2, 0, Math.random() * 6); d.updateMatrix(); maggot.setMatrixAt(i, d.matrix); }
  const kumpulan = new THREE.Group(); kumpulan.add(maggot); g.add(kumpulan);
  g.add(kotak(0.9, 0.05, 0.08, mat(WARNA.biru), 0, 1.1, 0));
  const pengaduk = new THREE.Group(); pengaduk.position.set(0, 0.78, 0);
  pengaduk.add(tabung(0.02, 0.02, 0.62, BAJA(), 0, 0.05, 0, 10));
  for (let i = 0; i < 3; i++) { const daun = kotak(0.5, 0.08, 0.015, BAJA(), 0, -0.15 + i * 0.12, 0); daun.rotation.y = i * 1.05; pengaduk.add(daun); }
  g.add(pengaduk);
  const m = motor(WARNA.biruMotor, 0.75); m.rotation.z = Math.PI / 2; m.position.set(0, 1.28, 0); g.add(m);
  const pompa = tabung(0.07, 0.07, 0.14, mat(0x3b6fd1), 0.55, 0.1, 0.25, 16); pompa.rotation.z = Math.PI / 2; g.add(pompa);
  const pl = plakat('MESIN PENCUCI MAGGOT'); pl.position.set(0, 0.3, 0.43); g.add(pl);
  return {
    grup: g, ukuran: 1.5,
    perbarui(t, dt, aktif) {
      if (aktif) { pengaduk.rotation.y += dt * 5; kumpulan.rotation.y += dt * 1.5; air.position.y = 0.92 + Math.sin(t * 8) * 0.004; }
    },
  };
}

function pengeringMaggot() {
  const g = new THREE.Group();
  g.add(rangka(1.5, 0.55, 0.62, WARNA.biru));
  const drum = new THREE.Group(); drum.position.set(0, 0.92, 0);
  const badan = tabung(0.33, 0.33, 1.45, mat(WARNA.baja, { metalness: 0.85, roughness: 0.22 }), 0, 0, 0, 36); badan.rotation.z = Math.PI / 2; drum.add(badan);
  for (const x of [-0.5, 0, 0.5]) { const las = mesh(new THREE.TorusGeometry(0.335, 0.01, 6, 36), mat(0x9aa1a8, { metalness: 0.8 })); las.rotation.y = Math.PI / 2; las.position.x = x; drum.add(las); }
  const pintu = kotak(0.3, 0.02, 0.22, mat(0xaeb4ba, { metalness: 0.8 }), 0.2, 0.335, 0); drum.add(pintu);
  g.add(drum);
  // pemanas gas di bawah drum (ASUMSI)
  g.add(kotak(1.1, 0.1, 0.35, mat(0x3a3f45, { metalness: 0.5 }), 0, 0.5, 0));
  const api = [];
  for (let i = 0; i < 6; i++) {
    const f = mesh(new THREE.ConeGeometry(0.035, 0.12, 8), mat(0xff8a1d, { emissive: 0xff5a00, emissiveIntensity: 1.6, opacity: 0.9 }), -0.4 + i * 0.16, 0.6, 0);
    f.castShadow = false; g.add(f); api.push(f);
  }
  const tabungGas = tabung(0.12, 0.12, 0.42, mat(0x2a6fd6), 0.95, 0.21, 0.25, 20); g.add(tabungGas);
  g.add(tabung(0.06, 0.06, 0.05, mat(0x2a6fd6), 0.95, 0.445, 0.25, 12));
  const selang = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.95, 0.47, 0.25), new THREE.Vector3(0.85, 0.6, 0.35), new THREE.Vector3(0.55, 0.5, 0.2)]), 20, 0.012, 6), mat(0xd7d7d7));
  g.add(selang);
  const m = motor(WARNA.biruMotor, 0.75); m.position.set(-0.6, 0.2, 0.15); g.add(m);
  const pl = plakat('MESIN PENGERING MAGGOT'); pl.position.set(-0.3, 0.42, 0.315); g.add(pl);
  const cahaya = new THREE.PointLight(0xff7a20, 0, 1.2); cahaya.position.set(0, 0.62, 0.1); g.add(cahaya);
  return {
    grup: g, ukuran: 1.8,
    perbarui(t, dt, aktif) {
      api.forEach((f, i) => { f.visible = aktif; f.scale.y = 0.8 + Math.sin(t * 20 + i * 2) * 0.25; });
      cahaya.intensity = aktif ? 0.8 + Math.sin(t * 17) * 0.2 : 0;
      if (aktif) drum.rotation.x += dt * 1.2;
    },
  };
}

function mixerPakan() {
  const g = new THREE.Group();
  g.add(rangka(1.3, 0.55, 0.62, WARNA.biru));
  const bak = bakMixer(1.3, 0.29, 0.38, WARNA.biru); bak.position.y = 0.86; g.add(bak);
  const pita = pitaMixer(1.25, 0.26); pita.position.y = 0.86; g.add(pita);
  const pintu = kotak(0.22, 0.14, 0.16, mat(WARNA.biru), -0.1, 0.5, 0.15); g.add(pintu);
  // dudukan motor di samping (seperti foto)
  const dudukan = rangka(0.45, 0.62, 0.5, WARNA.biru, 0.035); dudukan.position.set(0.9, 0, 0); g.add(dudukan);
  const gear = kotak(0.17, 0.15, 0.15, mat(0x2e4fa8, { metalness: 0.45 }), 0.85, 0.72, 0); g.add(gear);
  const sproket = puli(0.08, 0.05, 0x9aa1a8); sproket.position.set(0.72, 0.86, 0); sproket.rotation.y = Math.PI / 2; g.add(sproket);
  const m = motor(WARNA.hijauMotor, 0.85); m.position.set(0.9, 0.25, 0.1); m.rotation.y = Math.PI / 2; g.add(m);
  const pelindung = pelindungSabuk(0.45, 0.07, 0.06, 0.04); pelindung.rotation.z = Math.PI / 2; pelindung.position.set(1.08, 0.25, -0.06); g.add(pelindung);
  const pl = plakat('MIXER BAHAN PAKAN'); pl.position.set(-0.15, 1.08, 0.31); g.add(pl);
  return { grup: g, ukuran: 2.0, perbarui(t, dt, aktif) { if (aktif) { pita.rotation.x += dt * 3; sproket.rotation.x += dt * 3; } } };
}

function peletizer() {
  const g = new THREE.Group();
  const rk = rangka(0.45, 0.45, 0.42, WARNA.biru); rk.position.set(0, 0, -0.05); g.add(rk);
  g.add(kotak(0.45, 0.03, 0.42, mat(WARNA.biru), 0, 0.46, -0.05));
  const alas = rangka(0.6, 0.12, 0.9, WARNA.biru, 0.04); alas.position.set(0.15, 0, 0.5); g.add(alas);
  const mH = mat(WARNA.hijau, { metalness: 0.35, roughness: 0.4 });
  g.add(kotak(0.32, 0.3, 0.3, mH, 0, 0.63, -0.05)); // kotak gear
  const rumahDie = tabung(0.17, 0.2, 0.28, mH, 0, 0.92, -0.05, 28); g.add(rumahDie);
  g.add(tabung(0.2, 0.2, 0.04, mH, 0, 0.8, -0.05, 28));
  g.add(tabung(0.15, 0.17, 0.1, GALV(), 0, 1.1, -0.05, 28));
  const hopper = tabung(0.32, 0.15, 0.42, mat(WARNA.galvanis, { metalness: 0.6, roughness: 0.35, ganda: true }), 0, 1.36, -0.05, 32, true); g.add(hopper);
  const peringatan = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.13), mat(0xffffff, { roughness: 0.7 }));
  peringatan.position.set(0, 1.36, 0.19); peringatan.rotation.x = -0.35; g.add(peringatan);
  const saluran = kotak(0.2, 0.02, 0.28, GALV(), -0.25, 0.86, 0.06); saluran.rotation.z = 0.6; saluran.rotation.y = 0.4; g.add(saluran);
  const m = motor(WARNA.biruMotor, 1.45); m.position.set(0.12, 0.27, 0.62); m.rotation.y = -Math.PI / 2; g.add(m);
  const sabuk = pelindungSabuk(0.6, 0.15, 0.08, 0.06);
  sabuk.rotation.set(0, Math.PI / 2, Math.PI / 2 - 0.35); sabuk.position.set(0.24, 0.63, 0.0); g.add(sabuk);
  const pl = plakat('PELETIZER PAKAN', 0.4); pl.position.set(0.15, 0.08, 0.96); pl.rotation.x = -0.2; g.add(pl);
  const bak = kotak(0.38, 0.1, 0.3, mat(0xb9a98c, { roughness: 0.9 }), -0.45, 0.05, 0.25); g.add(bak);
  const pelet = partikel(26, new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6), mat(WARNA.pelet, { roughness: 0.8 }),
    new THREE.Vector3(-0.3, 0.8, 0.12), new THREE.Vector3(-0.35, -1, 0.3).normalize(), 0.6);
  g.add(pelet);
  return {
    grup: g, ukuran: 1.6,
    perbarui(t, dt, aktif) { pelet.userData.update(t, aktif); if (aktif) rumahDie.position.y = 0.92 + Math.sin(t * 55) * 0.002; },
  };
}

export const PEMBUAT = {
  pencacah,
  komposter,
  'ayak-kompos': ayakKompos,
  'penepung-kompos': () => penepung({ warnaBadan: 0x2a8b4a, warnaRangka: WARNA.biru, s: 1.2, teks: 'MESIN PENEPUNG KOMPOS' }),
  'mixer-granul': mixerGranul,
  'pan-granulator': panGranulator,
  'pencuci-maggot': pencuciMaggot,
  'pengering-maggot': pengeringMaggot,
  'penepung-maggot': () => penepung({}),
  'mixer-pakan': mixerPakan,
  peletizer,
};

export function buatMesin(id) {
  const f = PEMBUAT[id];
  if (!f) throw new Error(`Model 3D '${id}' tidak ada`);
  const m = f();
  m.grup.userData.mesinId = id;
  m.grup.traverse((o) => { o.userData.mesinId = id; });
  return m;
}
