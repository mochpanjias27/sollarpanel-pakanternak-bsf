// Adegan 3D: tata letak fasilitas (mode 'pabrik') atau satu mesin (mode 'tunggal').
import * as THREE from '../../vendor/three/three.module.min.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';
import { RoomEnvironment } from '../../vendor/three/RoomEnvironment.js';
import { buatMesin, mat, kotak, tabung, WARNA } from './mesin3d.js';

export const TATA_LETAK = {
  'pencuci-maggot': [-7.2, -2.0, 0],
  'pengering-maggot': [-5.1, -2.0, 0],
  'penepung-maggot': [-2.9, -2.0, 0],
  'mixer-pakan': [-6.0, 1.7, 0],
  peletizer: [-2.9, 1.7, 0],
  pencacah: [1.4, -2.3, 0],
  komposter: [5.0, -2.6, 0],
  'ayak-kompos': [8.6, -2.2, 0],
  'penepung-kompos': [1.4, 1.7, 0],
  'mixer-granul': [4.3, 1.7, 0],
  'pan-granulator': [8.2, 1.7, 0],
};

function teksKanvas(teks, { lebar = 512, tinggi = 128, latar = 'rgba(16,40,26,.88)', warna = '#fff', ukuran = 46, titik = null } = {}) {
  const cv = document.createElement('canvas');
  cv.width = lebar; cv.height = tinggi;
  const c = cv.getContext('2d');
  const r = 26;
  c.fillStyle = latar;
  c.beginPath(); c.roundRect(4, 4, lebar - 8, tinggi - 8, r); c.fill();
  c.font = `700 ${ukuran}px "Bricolage Grotesque", "Plus Jakarta Sans", Arial, sans-serif`;
  c.fillStyle = warna; c.textBaseline = 'middle';
  let x = 36;
  if (titik) { c.fillStyle = titik; c.beginPath(); c.arc(46, tinggi / 2, 14, 0, 7); c.fill(); x = 76; c.fillStyle = warna; }
  c.fillText(teks, x, tinggi / 2 + 2, lebar - x - 24);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, cv, c };
}

export function buatAdegan(wadah, opsi = {}) {
  const mode = opsi.mode || 'pabrik';
  const kecil = wadah.clientWidth < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: mode === 'tunggal', preserveDrawingBuffer: !!opsi.simpanGambar });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, kecil ? 1.75 : 2));
  renderer.setSize(wadah.clientWidth, wadah.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = opsi.bayangan ?? !kecil;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  wadah.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  if (mode === 'pabrik') { scene.background = new THREE.Color(0xe9efe6); scene.fog = new THREE.Fog(0xe9efe6, 28, 55); }

  const camera = new THREE.PerspectiveCamera(42, wadah.clientWidth / wadah.clientHeight, 0.05, 120);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = 1.48;
  controls.minDistance = 1.2;
  controls.maxDistance = 34;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a80, 0.9));
  const matahari = new THREE.DirectionalLight(0xfff3dd, 2.2);
  matahari.position.set(6, 14, 8);
  matahari.castShadow = true;
  matahari.shadow.mapSize.set(2048, 2048);
  const sc = matahari.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 10; sc.bottom = -10; sc.far = 40;
  matahari.shadow.bias = -0.0004;
  scene.add(matahari);

  const mesin = new Map(); // id → {model, root, cincin, label, aktif}
  const aliran = [];
  let pvKW = 0, imporKW = 0;
  let tampilLabel = opsi.label ?? true;
  let terpilih = null;
  const pendengarPilih = [];

  if (mode === 'pabrik') bangunPabrik();
  else bangunTunggal(opsi.mesinId);

  function bangunTunggal(id) {
    const m = buatMesin(id);
    scene.add(m.grup);
    mesin.set(id, { model: m, root: m.grup, aktif: opsi.aktif ?? true });
    const lantai = new THREE.Mesh(new THREE.CircleGeometry(m.ukuran * 1.1, 48), new THREE.ShadowMaterial({ opacity: 0.18 }));
    lantai.rotation.x = -Math.PI / 2; lantai.receiveShadow = true; scene.add(lantai);
    const kotakBatas = new THREE.Box3().setFromObject(m.grup);
    const pusat = kotakBatas.getCenter(new THREE.Vector3());
    const bola = kotakBatas.getBoundingSphere(new THREE.Sphere());
    const jarak = (bola.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * (opsi.zoom ?? 1.0);
    controls.target.copy(pusat);
    camera.position.copy(pusat).add(new THREE.Vector3(0.62, 0.42, 0.85).normalize().multiplyScalar(jarak));
    matahari.position.set(3, 6, 4);
    sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3;
    controls.autoRotate = opsi.putar ?? false;
    controls.autoRotateSpeed = 1.2;
  }

  function bangunPabrik() {
    // lantai & zona
    const lantai = kotak(20, 0.1, 11, mat(0xd4d2c9, { roughness: 0.95 }), 0.5, -0.05, 0);
    lantai.castShadow = false; scene.add(lantai);
    const tanah = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat(0xc9d6bf, { roughness: 1 }));
    tanah.rotation.x = -Math.PI / 2; tanah.position.y = -0.1; tanah.receiveShadow = true; scene.add(tanah);
    zona(-4.9, 'ZONA PAKAN TERNAK', 0x1f9a4c, 9.0);
    zona(5.1, 'ZONA PUPUK KOMPOS', 0xf06a1d, 9.6);
    // dinding bata belakang + kolom
    const dinding = kotak(20, 1.0, 0.18, mat(0xe6e1d6, { roughness: 0.95 }), 0.5, 0.5, -5.4); scene.add(dinding);
    for (let x = -9.4; x <= 10.5; x += 2.5) scene.add(kotak(0.14, 3.2, 0.14, mat(0xa9b0b5, { metalness: 0.5 }), x, 1.6, -5.4));
    // atap panel surya
    bangunPanelSurya();
    // inverter, panel, tiang PLN
    const pInv = new THREE.Vector3(-9.15, 1.4, -1.0);
    scene.add(kotak(0.12, 2.8, 2.6, mat(0xe6e1d6), -9.45, 1.4, -0.6));
    const inv = kotak(0.16, 0.62, 0.5, mat(0xf2f0ea, { roughness: 0.4 }), pInv.x, pInv.y, pInv.z); scene.add(inv);
    scene.add(kotak(0.17, 0.14, 0.5, mat(0x2b2f33), pInv.x, pInv.y - 0.22, pInv.z));
    scene.add(kotak(0.17, 0.02, 0.5, mat(WARNA.oranye), pInv.x, pInv.y - 0.14, pInv.z));
    const pPanel = new THREE.Vector3(-9.15, 1.4, 0.2);
    scene.add(kotak(0.18, 0.7, 0.5, mat(0xeee7d6), pPanel.x, pPanel.y, pPanel.z));
    labelTetap('Inverter Solis 5G', new THREE.Vector3(-8.8, 2.05, -1.0), 0.9);
    labelTetap('Panel & meter Acrel', new THREE.Vector3(-8.8, 2.05, 0.35), 0.9);
    const tiang = new THREE.Group(); tiang.position.set(-9.0, 0, 4.4);
    tiang.add(tabung(0.08, 0.11, 6, mat(0x8d8f8a, { roughness: 0.8 }), 0, 3, 0, 12));
    tiang.add(kotak(1.4, 0.08, 0.08, mat(0x5b5f63), 0, 5.6, 0));
    tiang.add(kotak(0.3, 0.4, 0.2, mat(0xdcdcd5), 0.2, 1.6, 0.1));
    scene.add(tiang);
    labelTetap('Jaringan PLN', new THREE.Vector3(-9.0, 6.2, 4.4), 1.0);

    // jalur aliran energi (partikel)
    const pusatPV = new THREE.Vector3(0.5, 3.0, -5.6);
    aliran.push(buatAliran([pusatPV, new THREE.Vector3(-5, 3.2, -5.2), new THREE.Vector3(-9.0, 2.4, -2.2), pInv.clone().add(new THREE.Vector3(0.1, 0.2, 0))], 0xf2b705, () => pvKW));
    aliran.push(buatAliran([new THREE.Vector3(-9.0, 5.5, 4.4), new THREE.Vector3(-9.1, 3.2, 2.0), pPanel.clone().add(new THREE.Vector3(0.1, 0.2, 0.1))], 0x3b82f6, () => imporKW));
    aliran.push(buatAliran([pPanel.clone().add(new THREE.Vector3(0.2, -0.3, 0)), new THREE.Vector3(-8.2, 0.05, 0.2), new THREE.Vector3(-1, 0.05, 0.0), new THREE.Vector3(7, 0.05, 0.0)], 0x22c55e, () => Math.min(pvKW, 99) + imporKW, 0.7));

    // mesin
    for (const [id, [x, z, rot]] of Object.entries(TATA_LETAK)) {
      const m = buatMesin(id);
      m.grup.position.set(x, 0, z);
      m.grup.rotation.y = rot;
      scene.add(m.grup);
      const cincin = new THREE.Mesh(new THREE.RingGeometry(m.ukuran * 0.55, m.ukuran * 0.6, 48), new THREE.MeshBasicMaterial({ color: 0x9aa3a0, transparent: true, opacity: 0.6 }));
      cincin.rotation.x = -Math.PI / 2; cincin.position.set(x, 0.012, z); scene.add(cincin);
      const nama = opsi.namaMesin?.[id] || id;
      const lab = buatLabel(nama);
      lab.position.set(x, (id === 'komposter' ? 1.6 : id === 'mixer-granul' ? 2.4 : 1.95), z);
      scene.add(lab);
      mesin.set(id, { model: m, root: m.grup, cincin, label: lab, nama, aktif: false });
    }
    ikhtisar(true);
  }

  function zona(x, teks, warna, lebar) {
    const z = new THREE.Mesh(new THREE.PlaneGeometry(lebar, 9.6), new THREE.MeshStandardMaterial({ color: warna, transparent: true, opacity: 0.09, roughness: 1 }));
    z.rotation.x = -Math.PI / 2; z.position.set(x, 0.006, -0.2); z.receiveShadow = true; scene.add(z);
    const tepi = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(lebar, 9.6)), new THREE.LineBasicMaterial({ color: warna }));
    tepi.rotation.x = -Math.PI / 2; tepi.position.set(x, 0.01, -0.2); scene.add(tepi);
    const { tex } = teksKanvas(teks, { lebar: 1024, tinggi: 128, latar: 'rgba(0,0,0,0)', warna: `#${warna.toString(16).padStart(6, '0')}`, ukuran: 76 });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.65), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    p.rotation.x = -Math.PI / 2; p.position.set(x - lebar / 2 + 2.9, 0.02, 4.25); scene.add(p);
  }

  function bangunPanelSurya() {
    const g = new THREE.Group();
    g.position.set(0.5, 0, -5.6);
    const mRangka = mat(0x9aa1a8, { metalness: 0.6 });
    for (let x = -9; x <= 9; x += 3) g.add(kotak(0.1, 3.0, 0.1, mRangka, x, 1.5, 0.5));
    const modul = mat(0x1d2c4f, { metalness: 0.4, roughness: 0.25 });
    const bingkai = mat(0xd5d9de, { metalness: 0.7, roughness: 0.3 });
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 2; j++) {
        const p = new THREE.Group();
        p.add(kotak(1.7, 0.04, 1.08, bingkai));
        p.add(kotak(1.64, 0.05, 1.02, modul));
        p.position.set(-8.1 + i * 1.8, 3.15 + j * 0.28, 0.1 + j * 1.0);
        p.rotation.x = 0.27;
        g.add(p);
      }
    }
    scene.add(g);
    labelTetap('Panel surya on-grid (tanpa baterai)', new THREE.Vector3(0.5, 4.1, -5.4), 2.2);
  }

  function buatLabel(teks) {
    const { tex, cv, c } = teksKanvas(teks, { titik: '#9aa3a0', lebar: 640, ukuran: 40 });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(1.9, 0.38, 1);
    s.renderOrder = 10;
    s.userData = { tex, cv, c, teks };
    return s;
  }
  function warnaiLabel(lab, warna) {
    const { c, cv, tex, teks } = lab.userData;
    c.clearRect(0, 0, cv.width, cv.height);
    c.fillStyle = 'rgba(16,40,26,.88)'; c.beginPath(); c.roundRect(4, 4, cv.width - 8, cv.height - 8, 26); c.fill();
    c.fillStyle = warna; c.beginPath(); c.arc(46, cv.height / 2, 14, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '700 40px "Bricolage Grotesque", "Plus Jakarta Sans", Arial, sans-serif'; c.textBaseline = 'middle';
    c.fillText(teks, 76, cv.height / 2 + 2, cv.width - 100);
    tex.needsUpdate = true;
  }
  function labelTetap(teks, pos, lebar = 1.2) {
    const { tex } = teksKanvas(teks, { lebar: 768, ukuran: 44, latar: 'rgba(255,255,255,.92)', warna: '#14231a' });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(lebar, lebar / 6, 1); s.position.copy(pos); s.renderOrder = 9; scene.add(s);
    s.userData.labelTetap = true;
    return s;
  }

  function buatAliran(titik, warna, dayaFn, ukuran = 1) {
    const kurva = new THREE.CatmullRomCurve3(titik);
    const garis = new THREE.Mesh(new THREE.TubeGeometry(kurva, 80, 0.025 * ukuran, 6), new THREE.MeshBasicMaterial({ color: warna, transparent: true, opacity: 0.25 }));
    scene.add(garis);
    const n = 24;
    const bola = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07 * ukuran, 10, 8), new THREE.MeshBasicMaterial({ color: warna }), n);
    scene.add(bola);
    const d = new THREE.Object3D();
    let fase = 0;
    return {
      perbarui(dt) {
        const p = dayaFn();
        const aktif = p > 0.05;
        fase = (fase + dt * (0.05 + Math.min(p, 10) * 0.035)) % 1;
        const tampil = aktif ? Math.max(3, Math.round(Math.min(n, p * 2.6))) : 0;
        for (let i = 0; i < n; i++) {
          const t = (fase + i / n) % 1;
          d.position.copy(kurva.getPointAt(t));
          d.scale.setScalar(i < tampil ? 1 : 0.0001);
          d.updateMatrix(); bola.setMatrixAt(i, d.matrix);
        }
        bola.instanceMatrix.needsUpdate = true;
        garis.material.opacity = aktif ? 0.35 : 0.1;
      },
    };
  }

  // ---------- interaksi ----------
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let tekan = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { tekan = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!tekan || Math.hypot(e.clientX - tekan.x, e.clientY - tekan.y) > 6) return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const target = [...mesin.values()].map((m) => m.root);
    const hit = ray.intersectObjects(target, true)[0];
    const id = hit?.object.userData.mesinId || null;
    pilih(id);
  });

  function pilih(id) {
    terpilih = id;
    for (const [k, m] of mesin) if (m.cincin) m.cincin.userData.dipilih = k === id;
    pendengarPilih.forEach((f) => f(id));
  }

  const tujuan = { aktif: false, pos: new THREE.Vector3(), target: new THREE.Vector3() };
  function fokus(id) {
    const m = mesin.get(id);
    if (!m) return;
    const kotakB = new THREE.Box3().setFromObject(m.root);
    const pusat = kotakB.getCenter(new THREE.Vector3());
    const uk = Math.max(2.2, kotakB.getSize(new THREE.Vector3()).length());
    tujuan.target.copy(pusat);
    tujuan.pos.set(pusat.x + uk * 0.55, pusat.y + uk * 0.7, pusat.z + uk * 1.05);
    tujuan.aktif = true;
  }
  // Layar tegak (ponsel): pandang dari samping agar sisi panjang fasilitas memanjang ke belakang.
  function posisiIkhtisar() {
    const a = camera.aspect;
    if (a < 0.8) return { pos: new THREE.Vector3(21, 20, 4), target: new THREE.Vector3(0.5, 0, -0.6) };
    if (a < 1.3) return { pos: new THREE.Vector3(2, 17, 19), target: new THREE.Vector3(0.5, 0, -0.3) };
    return { pos: new THREE.Vector3(1.5, 13, 15.5), target: new THREE.Vector3(0.5, 0, -0.3) };
  }
  function ikhtisar(langsung = false) {
    const p = posisiIkhtisar();
    if (langsung === true) { camera.position.copy(p.pos); controls.target.copy(p.target); return; }
    tujuan.target.copy(p.target); tujuan.pos.copy(p.pos); tujuan.aktif = true;
  }

  // ---------- loop ----------
  const jam = new THREE.Clock();
  let t = 0, jalan = true, terlihat = true;
  const io = new IntersectionObserver(([e]) => { terlihat = e.isIntersecting; }, { threshold: 0.01 });
  io.observe(wadah);
  function loop() {
    if (!jalan) return;
    requestAnimationFrame(loop);
    if (!terlihat || document.hidden) { jam.getDelta(); return; }
    const dt = Math.min(0.05, jam.getDelta());
    t += dt;
    for (const [, m] of mesin) {
      m.model.perbarui(t, dt, m.aktif);
      if (m.cincin) {
        const dipilih = m.cincin.userData.dipilih;
        m.cincin.material.color.set(dipilih ? 0xf06a1d : m.aktif ? 0x22c55e : 0x9aa3a0);
        m.cincin.material.opacity = dipilih ? 0.75 + Math.sin(t * 6) * 0.25 : m.aktif ? 0.85 : 0.5;
      }
      if (m.label) m.label.visible = tampilLabel;
    }
    scene.traverse((o) => { if (o.userData.labelTetap) o.visible = tampilLabel; });
    for (const a of aliran) a.perbarui(dt);
    if (tujuan.aktif) {
      const k = 1 - Math.pow(0.002, dt);
      camera.position.lerp(tujuan.pos, k); controls.target.lerp(tujuan.target, k);
      if (camera.position.distanceTo(tujuan.pos) < 0.05) tujuan.aktif = false;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  loop();
  controls.addEventListener('start', () => { tujuan.aktif = false; });

  const ro = new ResizeObserver(() => {
    const w = wadah.clientWidth, h = wadah.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  });
  ro.observe(wadah);

  return {
    renderer, scene, camera, controls,
    daftar: () => [...mesin.keys()],
    setAktif(id, aktif) {
      const m = mesin.get(id); if (!m) return;
      if (m.aktif !== aktif && m.label) warnaiLabel(m.label, aktif ? '#22c55e' : '#9aa3a0');
      m.aktif = aktif;
    },
    aktif: (id) => !!mesin.get(id)?.aktif,
    setAliran(pv, impor) { pvKW = pv; imporKW = impor; },
    setLabel(v) { tampilLabel = v; },
    pilih, fokus, ikhtisar,
    onPilih(f) { pendengarPilih.push(f); },
    renderSekali() { controls.update(); renderer.render(scene, camera); },
    hentikan() { jalan = false; io.disconnect(); ro.disconnect(); renderer.dispose(); },
  };
}
