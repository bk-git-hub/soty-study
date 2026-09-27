// On Track page content (transcribed from observation).
import { ID } from './identity';
export const ON_TRACK = {
  heroPara: [`Since stepping up to ${ID.series} with ${ID.team} in 2019, ${ID.full} has given it everything – taking risks, chasing wins, and bringing the `, 'fight to every race', '.'],
  previous: { name: 'Spain', gp: 'gp', result: '3rd', track: 'madrid' },
  next: { round: 17, name: 'Baku', country: 'Azerbaijan', dates: '24-26', month: 'Sep', flag: 'ln4-flag-Azerbaijan.svg', track: 'baku' },
  impact: ['Pushing past the ', ['limits'], ', ', ['winning'], ' races. Giving ', ['it all'], ' every single weekend.'],
  podiums: 49,
  podiumImages: [
    'ln-podium-Emilia Romagna GP 2022.webp', 'ln-podium-Singapore GP 2024.webp', 'ln-podium-Abu Dhabi GP 2024.webp', 'ln-podium-United States GP 2023.webp',
    'Lando-6-on-track.webp', 'ln-podium-Miami GP 2024.webp', 'ln-podium-Dutch GP 2024.webp', 'ln-podium-Australian GP 2025.webp', 'ln-podium-Austrian GP 2020.webp', 'ln-podium-Monaco GP 2021.webp',
  ],
  carImage: 'ln-podium-Lando Australia 2025.webp',
  stats: [[`${ID.series.toLowerCase()} wins`, '13'], ['pole positions', '19'], ['average finish', '6', '.28'], ['fastest laps', '18']],
  seasons: [['2024', '2', 'nd', '13'], ['2023', '6', 'th', '7'], ['2022', '7', 'th', '1'], ['2021', '6', 'th', '4'], ['2020', '9', 'th', '1'], ['2019', '11', 'th', '0']],
  highlightsIntro: `Across seven seasons in ${ID.series}, ${ID.first} has collected results worth remembering on circuits around the world.`,
  highlights: [
    { name: 'Brazil', flag: 'ln4-flag-Brazil.png', date: '9 Nov', year: '25', finish: '1st', trophy: 'shanghai.svg', time: '1:32:01.596', img: 'lando-brazil.webp' },
    { name: 'United Kingdom', flag: 'ln4-flag-UK.svg', date: '6 Jul', year: '25', finish: '1st', trophy: 'silverstone.svg', time: '1:37:15.735', img: 'LandoBritishGP25.jpg' },
    { name: 'Monaco', flag: 'ln4-flag-Monaco.svg', date: '25 May', year: '25', finish: '1st', trophy: 'monaco.svg', time: '1:40:33.843', img: 'LandoMonaco25.jpg' },
    { name: 'Australia', flag: 'ln4-flag-Australia.svg', date: '16 Mar', year: '25', finish: '1st', trophy: 'melbourne.svg', time: '1:42:06.304', gap: '+0.895s', img: 'LandoAus25.webp' },
    { name: 'Abu Dhabi', flag: 'ln4-flag-Abu-Dabi.svg', date: '8 Dec', year: '24', finish: '1st', trophy: 'yas-marina.svg', time: '1:26:33.291', img: 'lando - hover image - abu 2024.webp' },
    { name: 'Singapore', flag: 'ln4-flag-Singapore.svg', date: '22 Sep', year: '24', finish: '1st', trophy: 'singapore.svg', time: '1:40:52.571', img: 'LandoSingaporeWin24.webp' },
    { name: 'Miami', flag: 'ln4-flag-USA.svg', date: '5 May', year: '24', finish: '1st', trophy: 'miami.svg', time: '1:30:49.876', img: 'lando - hover image - miami 2024.webp' },
  ],
  horizontal: [
    { col: [
      { caption: 'Miami, 2024', img: 'ln-on-t-horiz-1.webp', w: 17.5, h: 23.5, tone: 'light' },
      { caption: 'netherlands, 2024', img: 'ln-on-t-horiz-2.webp', w: 17.5, h: 12.5, tone: 'light' },
    ] },
    { spacer: 1 },
    { col: [
      { quote: true, text: ['It isn’t about ', ['where'], ' you begin, it’s ', ['how'], ' you keep going.'], signature: 'ln4-hw-signature2.svg', tone: 'light' },
      { caption: 'miami, 2024', img: 'ln4-on-track-scroll-img3.webp', w: 26, h: 35, tone: 'light' },
    ] },
    { spacer: 1 },
    { col: [
      { caption: 'US GP, 2024', img: 'ln4-on-track-scroll-img4.webp', w: 15, h: 20, tone: 'dark' },
      { caption: 'Abu Dhabi GP, 2024', img: 'ln4-on-track-scroll-img5.webp', w: 21, h: 28, tone: 'dark', pill: '1' },
    ], flip: true },
  ],
  preF1: {
    title: [`pre-${ID.series.toLowerCase()} career`, '2007-2019'],
    text: `Before ${ID.series}, ${ID.first} spent a decade climbing through karting and the junior single-seater ladder, collecting titles at almost every step on the way up.`,
    images: ['pre-f1-car-img.webp', 'ln-f1-car-img-2.webp'],
    titles: [
      ['junior formula 3 champion', '2017'], ['gp2 2nd place', '2018'], ['regional 2.0 champion', '2016'], ['2.0 cup champion', '2016'],
      ['winter series champion', '2016'], ['world karting champion', '2014'], ['gp4 champion', '2015'], ['junior karting champion', '2013'],
    ],
  },
  socialCards: ['Lando-6-on-track.webp', 'ln-social-img-2.webp', 'Lando-2-on-track.webp', 'Lando-3-ontrack.webp', 'Lano-5-on-track.webp', 'ln-social-img-6.webp', 'ln4-on-track-scroll-img5.webp'],
};
