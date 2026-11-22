import { pasangAlur, pasangKartuMesin } from '../core/mesin-ui.js';

pasangAlur(document.getElementById('alur-pakan'), [
  { ikon: '🥬', nama: 'Sampah organik', ket: 'dipilah dari rumah' },
  { ikon: '🐛', nama: 'Maggot segar', ket: 'budidaya ±14–18 hari' },
  'pencuci-maggot', 'pengering-maggot', 'penepung-maggot', 'mixer-pakan', 'peletizer',
  { ikon: '🟤', nama: 'Pelet', ket: 'ayam & ikan' },
]);
pasangKartuMesin(document.getElementById('mesin-pakan'), 'pakan');
