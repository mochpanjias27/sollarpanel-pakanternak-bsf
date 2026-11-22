import { pasangAlur, pasangKartuMesin } from '../core/mesin-ui.js';

pasangAlur(document.getElementById('alur-pupuk'), [
  { ikon: '🥬', nama: 'Sampah organik', ket: 'sisa dapur & sayur' },
  'pencacah', 'komposter', 'ayak-kompos', 'penepung-kompos', 'mixer-granul', 'pan-granulator',
  { ikon: '🟫', nama: 'Pupuk granul', ket: 'siap kemas' },
]);
pasangKartuMesin(document.getElementById('mesin-pupuk'), 'pupuk');
