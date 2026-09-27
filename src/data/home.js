// Home page content, transcribed from observation of landonorris.com.
import { ID } from './identity';

// Horizontal gallery. Columns are groups stacked vertically; spacers are gaps in vh (see --grid-spacer).
// Sizes are approximate observations (rem) and get tuned against the reference frames later.
export const HORIZONTAL = [
  { col: [
    { caption: 'Qatar, 2024', img: 'ln-home-horiz-1.webp', w: 17.5, h: 23.5, tone: 'light' },
    { caption: 'Awards Night, 2024', img: 'ln-home-horiz-2.webp', w: 17.5, h: 12.5, tone: 'light' },
  ] },
  { spacer: 1 },
  { col: [
    { quote: true, text: ['It isn’t about ', ['where'], ' you begin, it’s ', ['how'], ' you keep going.'], signature: 'ln4-hw-signature2.svg', tone: 'light' },
    { caption: 'Miami GP, 2024', img: 'ln-home-horiz-3.webp', w: 26, h: 35, tone: 'light' },
  ], large: true },
  { spacer: 1 },
  { col: [
    { caption: 'Monaco, 2023', img: 'ln-home-horiz-4.webp', w: 15, h: 20, tone: 'light' },
    { caption: 'Britain, 2025', img: 'Britain-25 (1).webp', w: 21, h: 28, tone: 'light', pill: '1' },
  ], flip: true },
  { spacer: 0.5 },
  { col: [
    { caption: 'Battersea, 2024', img: 'ln-home-horiz-6.webp', w: 15.5, h: 20, tone: 'dark' },
  ] },
  { col: [
    { caption: 'High Performance Gala, 2024', img: 'ln-home-horiz-7.webp', w: 13.5, h: 18, tone: 'dark', offset: 12 },
  ] },
  { spacer: 0.5 },
  { col: [
    { caption: 'Barcelona, 2024', img: 'ln-home-horiz-8.webp', w: 22, h: 30, tone: 'dark' },
    { quote: true, text: ['From my first laps in a go-kart at nine, I’ve chased one dream and never once let it go.'], signature: 'ln4-signature-dark-green.webp', tone: 'dark' },
  ] },
  { spacer: 1 },
  { col: [
    { caption: 'austria, 2020', img: 'ln-home-horiz-9.webp', w: 15, h: 20, tone: 'dark' },
    { caption: 'US, 2024', img: 'ln-home-horiz-10.webp', w: 19, h: 25, tone: 'dark' },
  ] },
];

export const SOCIAL_CARDS = [
  'Lando-6-on-track.webp', 'ln-social-img-2.webp', 'Lando-4-off-track.webp', 'Lando-5-off-track.webp',
  'Lano-5-on-track.webp', 'ln-social-img-6.webp', 'Lando-6-off-track.webp',
];

export const STORE = {
  eyebrow: `${ID.last.toUpperCase()} STORE`,
  title: [`${ID.series} Drivers’`, 'Champion'],
  text: 'Mark a season to remember with a collection made for the fans who stayed loud to the very last lap. Wear it, frame it, keep it forever.',
  cta: 'Visit the store',
  images: { main: 'lando-store-gold-5.webp', clip: 'lando-store-gold-3.webp', small: 'lando-store-gold-1.webp', left: 'lando-store-gold-2.webp', sticker: 'LN1.webp' },
};

export const IMPACT = [['Rewriting'], ' limits, racing for ', ['wins'], ', giving everything in every way. Building a ', ['legacy'], ` in ${ID.series} on and off the track.`];
