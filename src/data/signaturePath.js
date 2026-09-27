// The fictional driver's signature ("Juno" with a flourish and an underline), one stroke path drawn by
// hand in a 400 x 160 box. Shared by the signature component (drawn with a dash animation) and by
// scripts/make-identity.mjs (static copies for the quote cards and merch).
export const SIGNATURE_VIEWBOX = '0 0 400 160';
export const SIGNATURE_D = [
  'M110 20C112 60 100 110 80 132', // J stem
  'C62 152 30 148 32 128', // J hook
  'C34 108 80 100 118 92', // back across to the baseline
  'C122 104 124 110 132 110C142 110 146 92 150 84C150 100 152 110 160 110', // u
  'C170 110 176 90 182 84C184 96 184 104 186 110C192 92 206 80 214 90C218 98 216 108 224 110', // n
  'C236 110 240 88 256 86C272 84 276 104 262 110C248 116 240 100 256 90', // o
  'C290 70 340 60 380 70', // flourish
  'M60 126C150 120 260 116 350 98', // underline
].join('');
