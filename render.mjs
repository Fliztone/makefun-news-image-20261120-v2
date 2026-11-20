// render.mjs — dev-time renderer (NOT part of the runtime submission).
// Builds a newspaper front-page SVG summarising Friday 20 November 2026 and
// rasterises it to entry.png (1024x1024) with @resvg/resvg-js.
// The runtime program (main.ts) only copies the pre-rendered entry.png.
import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

// ---- palette -------------------------------------------------------------
const CREAM = '#f5f0e6';
const CARD = '#fbf8f0';
const CARD_EDGE = '#ddd5c2';
const INK = '#1a1a1a';
const BODY = '#2b2b2b';
const NAVY = '#152238';
const NAVY_DEEP = '#0d1626';
const RED = '#b3261e';
const CREAM_TXT = '#f3ede0';
const CREAM_DIM = '#cfc7b6';

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, Helvetica, sans-serif";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- tiny SVG helpers ----------------------------------------------------
function text(x, y, str, { size = 15, font = SERIF, weight = 'normal', style = 'normal', fill = INK, anchor = 'start', spacing = 0, opacity = 1 } = {}) {
  const ls = spacing ? ` letter-spacing="${spacing}"` : '';
  const op = opacity !== 1 ? ` opacity="${opacity}"` : '';
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" font-style="${style}" fill="${fill}" text-anchor="${anchor}"${ls}${op}>${esc(str)}</text>`;
}
function rect(x, y, w, h, fill, { rx = 0, stroke = 'none', sw = 0, opacity = 1 } = {}) {
  const st = stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : '';
  const op = opacity !== 1 ? ` opacity="${opacity}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${st}${op}/>`;
}
function line(x1, y1, x2, y2, stroke, sw = 1, opacity = 1) {
  const op = opacity !== 1 ? ` opacity="${opacity}"` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${op}/>`;
}

// ---- icons (drawn inside a 48x48 box, translated into place) -------------
function iconGlobe() {
  // world globe + three stars (trilateral summit)
  let s = `<g fill="none" stroke="${NAVY}" stroke-width="2">`;
  s += `<circle cx="24" cy="27" r="15"/>`;
  s += `<ellipse cx="24" cy="27" rx="6.5" ry="15"/>`;
  s += `<line x1="9" y1="27" x2="39" y2="27"/>`;
  s += `<path d="M11 19 H37 M11 35 H37"/>`;
  s += `</g>`;
  const star = (cx, cy, r) => {
    let p = '';
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      p += `${(cx + rr * Math.cos(ang)).toFixed(1)},${(cy + rr * Math.sin(ang)).toFixed(1)} `;
    }
    return `<polygon points="${p.trim()}" fill="${RED}"/>`;
  };
  s += star(13, 7, 4.2) + star(24, 5, 4.6) + star(35, 7, 4.2);
  return s;
}
function iconChart() {
  let s = `<g stroke="${NAVY}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">`;
  s += `<path d="M8 8 V40 H42"/>`;
  s += `<path d="M12 34 L20 26 L27 30 L38 14"/>`;
  s += `<path d="M31 14 H38 V21"/>`;
  s += `</g>`;
  s += `<rect x="13" y="30" width="4" height="8" fill="${RED}" opacity="0.85"/>`;
  s += `<rect x="22" y="24" width="4" height="14" fill="${NAVY}" opacity="0.55"/>`;
  return s;
}
function iconTank() {
  let s = `<g fill="${NAVY}">`;
  s += `<rect x="6" y="26" width="36" height="11" rx="5"/>`;        // tracks
  s += `<rect x="10" y="18" width="24" height="9" rx="2"/>`;         // hull
  s += `<rect x="17" y="12" width="12" height="7" rx="1.5"/>`;       // turret
  s += `<rect x="29" y="13.5" width="16" height="3" rx="1.5"/>`;     // barrel
  s += `</g>`;
  s += `<g fill="${CREAM}">`;
  for (const cx of [12, 19, 26, 33, 38]) s += `<circle cx="${cx}" cy="31.5" r="2.4"/>`;
  s += `</g>`;
  s += `<rect x="6" y="26" width="36" height="11" rx="5" fill="none" stroke="${NAVY}" stroke-width="2"/>`;
  return s;
}
function iconHouseFire() {
  let s = `<g fill="none" stroke="${NAVY}" stroke-width="2" stroke-linejoin="round">`;
  s += `<path d="M9 24 L24 12 L39 24"/>`;                            // roof
  s += `<path d="M12 23 V39 H36 V23"/>`;                             // walls
  s += `<rect x="20" y="29" width="8" height="10"/>`;                // door
  s += `</g>`;
  s += `<path d="M33 8 C36 12 39 13 38 18 C37.5 21 35 22 34 21 C35 19 34 17 32.5 16 C32 18 30.5 18.5 30.5 16.5 C30.5 13 32 11 33 8 Z" fill="${RED}"/>`;
  return s;
}
function iconCyclone() {
  let s = `<g fill="none" stroke="${NAVY}" stroke-width="5.5" stroke-linecap="round">`;
  s += `<path d="M24 24 C24 15 31 10 38 13 C43 15 44 21 40 25"/>`;
  s += `<path d="M24 24 C24 33 17 38 10 35 C5 33 4 27 8 23"/>`;
  s += `</g>`;
  s += `<circle cx="24" cy="24" r="3.6" fill="${RED}"/>`;
  return s;
}
function iconArt() {
  let s = `<rect x="7" y="9" width="34" height="30" rx="2" fill="none" stroke="${NAVY}" stroke-width="2.5"/>`;
  s += `<rect x="12" y="14" width="24" height="20" fill="${CREAM}" stroke="${NAVY}" stroke-width="1"/>`;
  s += `<rect x="22.5" y="24" width="3" height="8" fill="${NAVY}"/>`;                 // trunk
  s += `<circle cx="24" cy="21" r="6.5" fill="${NAVY}" opacity="0.85"/>`;            // canopy
  s += `<circle cx="19" cy="24" r="3.4" fill="${NAVY}" opacity="0.6"/>`;
  s += `<circle cx="29" cy="24" r="3.4" fill="${NAVY}" opacity="0.6"/>`;
  s += `<line x1="12" y1="32" x2="36" y2="32" stroke="${RED}" stroke-width="1.5"/>`;
  return s;
}

// ---- story cards ---------------------------------------------------------
const stories = [
  {
    tag: 'DIPLOMACY · SHENZHEN', icon: iconGlobe,
    head: 'Trump, Xi & Putin: peace pact',
    body: [
      'First-ever US–China–Russia trilateral, held at',
      'APEC in Shenzhen. Joint ‘peace declaration’:',
      '‘A nuclear war cannot be won.’',
    ],
  },
  {
    tag: 'BUSINESS · ARTIFICIAL INTELLIGENCE', icon: iconChart,
    head: 'Anthropic’s record IPO',
    body: [
      'Claude maker raises $81.3B at $83/share — the',
      'biggest IPO ever, topping SpaceX. ~$1.5T value;',
      'ANT closed +17% on its Nasdaq debut.',
    ],
  },
  {
    tag: 'MIDDLE EAST · GAZA', icon: iconTank,
    head: 'Israel’s Gaza ground raid',
    body: [
      'Tank incursion into central Gaza despite the',
      'ceasefire; army says it is completed. Hamas',
      'calls it a ‘blatant ceasefire violation.’',
    ],
  },
  {
    tag: 'SOUTH ASIA · BANGLADESH', icon: iconHouseFire,
    head: 'Bangladesh shutdown',
    body: [
      'Hasina’s banned party enforces a lockdown; two',
      'ruling-party members killed. Yunus’s ancestral',
      'home torched in Chattogram.',
    ],
  },
  {
    tag: 'CLIMATE · INDIA', icon: iconCyclone,
    head: 'Cyclone Akvan landfall',
    body: [
      'Severe storm hits the Andhra–Odisha coast today;',
      '50,000+ evacuated, schools shut, trains cancelled.',
      'Red alert for extremely heavy rain.',
    ],
  },
  {
    tag: 'CULTURE · NEW YORK', icon: iconArt,
    head: 'Van Gogh record: $190.4M',
    body: [
      '‘Blossoming Chestnut Trees’ sets the artist’s',
      'auction record at Sotheby’s, after a Nazi-era',
      'restitution settlement cleared the sale.',
    ],
  },
];

function card(x, y, w, h, st) {
  let s = rect(x, y, w, h, CARD, { rx: 7, stroke: CARD_EDGE, sw: 1.5 });
  s += rect(x, y, 5, h, RED, { rx: 2 });                       // left accent
  s += `<g transform="translate(${x + w - 16 - 48},${y + 16})">${st.icon()}</g>`;
  s += text(x + 18, y + 33, st.tag, { size: 11, font: SANS, weight: 'bold', fill: RED, spacing: 0.8 });
  s += text(x + 18, y + 61, st.head, { size: 21, font: SERIF, weight: 'bold', fill: INK });
  st.body.forEach((ln, i) => {
    s += text(x + 18, y + 87 + i * 20, ln, { size: 15, font: SERIF, fill: BODY });
  });
  return s;
}

// ---- GTA VI lead motif (original Vice-style sun / palms / VI) ------------
function leadMotif() {
  const cx = 142, cy = 244, r = 66;
  let s = `<defs>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd166"/>
      <stop offset="0.45" stop-color="#ff7b54"/>
      <stop offset="0.78" stop-color="#ff2d78"/>
      <stop offset="1" stop-color="#7b2ff7"/>
    </linearGradient>
    <clipPath id="sunclip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
  </defs>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sun)"/>`;
  // synthwave slats across the lower half (band-coloured gaps)
  s += `<g clip-path="url(#sunclip)">`;
  const slats = [[250, 3], [258, 4], [267, 5], [278, 7], [291, 9], [306, 12]];
  for (const [yy, hh] of slats) s += rect(cx - r, yy, r * 2, hh, NAVY);
  s += `</g>`;
  // palm silhouettes flanking the sun
  const palm = (px, py, sc, flip) => {
    const f = flip ? -1 : 1;
    let p = `<g transform="translate(${px},${py}) scale(${f * sc},${sc})" fill="${NAVY_DEEP}">`;
    p += `<path d="M0 0 C-2 -22 -1 -40 3 -56 L7 -55 C3 -39 4 -21 6 0 Z"/>`; // trunk
    const fronds = [
      'M4 -56 C-10 -64 -22 -62 -30 -54 C-18 -58 -8 -56 4 -52 Z',
      'M4 -56 C16 -66 30 -64 38 -56 C26 -60 14 -56 4 -52 Z',
      'M4 -56 C-6 -70 -16 -74 -26 -72 C-14 -70 -6 -64 4 -54 Z',
      'M4 -56 C14 -72 26 -76 36 -72 C24 -72 14 -64 4 -54 Z',
      'M4 -56 C2 -72 6 -82 12 -88 C8 -78 8 -66 6 -55 Z',
    ];
    for (const d of fronds) p += `<path d="${d}"/>`;
    p += `</g>`;
    return p;
  };
  s += palm(82, 320, 0.92, false);
  s += palm(204, 320, 0.92, true);
  // VI wordmark
  s += text(cx, cy + 22, 'VI', { size: 62, font: SERIF, weight: 'bold', style: 'italic', fill: CREAM_TXT, anchor: 'middle' });
  return s;
}

function leadBand() {
  const x = 28, y = 162, w = 968, h = 168;
  let s = rect(x, y, w, h, NAVY, { rx: 8 });
  s += leadMotif();
  const tx = 286;
  s += text(tx, y + 34, 'ENTERTAINMENT · THE LEAD', { size: 12, font: SANS, weight: 'bold', fill: '#ff8a5c', spacing: 1.2 });
  s += text(tx, y + 72, 'GTA VI launches worldwide', { size: 33, font: SERIF, weight: 'bold', fill: CREAM_TXT });
  s += text(tx, y + 100, '13 years after GTA V, Rockstar’s Vice City sequel is out now — the biggest', { size: 15.5, font: SERIF, fill: CREAM_DIM });
  s += text(tx, y + 121, 'entertainment debut in history, with more than $1.6 billion in pre-orders.', { size: 15.5, font: SERIF, fill: CREAM_DIM });
  // stat chips
  const chip = (cxx, label) => {
    const cw = label.length * 7.0 + 22;
    let c = rect(cxx, y + 134, cw, 22, NAVY_DEEP, { rx: 11, stroke: '#ff8a5c', sw: 1 });
    c += text(cxx + cw / 2, y + 149, label, { size: 11.5, font: SANS, weight: 'bold', fill: '#ffd166', anchor: 'middle', spacing: 0.5 });
    return { s: c, w: cw };
  };
  let c1 = chip(tx, 'PS5 · XBOX SERIES X|S');
  s += c1.s;
  let c2 = chip(tx + c1.w + 10, 'BIGGEST LAUNCH EVER');
  s += c2.s;
  return s;
}

// ---- assemble ------------------------------------------------------------
function buildSvg() {
  const W = 1024, H = 1024;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  s += rect(0, 0, W, H, CREAM);
  s += rect(12, 12, W - 24, H - 24, 'none', { stroke: CARD_EDGE, sw: 1.5 });

  // masthead
  s += line(28, 34, 996, 34, INK, 2);
  s += text(512, 78, 'THE WORLD LEDGER', { size: 42, font: SERIF, weight: 'bold', fill: INK, anchor: 'middle', spacing: 2 });
  s += text(512, 98, 'THE WHOLE WORLD · ONE PAGE', { size: 12, font: SANS, fill: BODY, anchor: 'middle', spacing: 3 });
  s += line(28, 108, 996, 108, INK, 1);
  s += line(28, 112, 996, 112, INK, 2);

  // date banner
  s += rect(28, 120, 968, 36, RED, { rx: 4 });
  s += text(46, 144, 'FRIDAY EDITION', { size: 12, font: SANS, weight: 'bold', fill: CREAM_TXT, spacing: 1 });
  s += text(512, 146, 'FRIDAY · NOVEMBER 20, 2026', { size: 25, font: SANS, weight: 'bold', fill: '#ffffff', anchor: 'middle', spacing: 1.5 });
  s += text(978, 144, 'No. 324 · GLOBAL', { size: 12, font: SANS, weight: 'bold', fill: CREAM_TXT, anchor: 'end', spacing: 1 });

  // lead
  s += leadBand();

  // grid 2 x 3
  const colW = 476, rowH = 165, gx = 16, gy = 14, top = 348, left = 28;
  stories.forEach((st, i) => {
    const c = i % 2, r = Math.floor(i / 2);
    s += card(left + c * (colW + gx), top + r * (rowH + gy), colW, rowH, st);
  });

  // sports ticker
  const ty = 884, th = 62;
  s += rect(28, ty, 968, th, NAVY, { rx: 7 });
  s += rect(44, ty + 18, 70, 26, RED, { rx: 13 });
  s += text(79, ty + 36, 'SPORT', { size: 13, font: SANS, weight: 'bold', fill: '#ffffff', anchor: 'middle', spacing: 1 });
  s += text(130, ty + 27, 'CRICKET · NZ v IND, 1st Test (Wellington): Nicholls 113* — Kiwis fight back to 243/5 on Day 1', { size: 13, font: SANS, fill: CREAM_TXT });
  s += text(130, ty + 47, 'CHESS · Gukesh v Sindarov, world title defence, Geneva, from Nov 24   ·   ATHLETICS · Jepchirchir banned 3 yrs (EPO)', { size: 13, font: SANS, fill: CREAM_TXT });

  // credit
  s += line(28, 958, 996, 958, CARD_EDGE, 1);
  s += text(512, 978, 'Rendered programmatically (SVG → PNG) · make.fun bounty news-image-20261120 · Fliztone', { size: 11.5, font: SANS, fill: BODY, anchor: 'middle' });
  s += text(512, 994, 'Sources: Reuters, BBC, AP, AFP, CNN, WSJ, ESPN, Al Jazeera, The Hindu, Times of India', { size: 11, font: SANS, fill: '#6b6455', anchor: 'middle' });

  s += `</svg>`;
  return s;
}

const svg = buildSvg();
writeFileSync('entry.svg', svg, 'utf8');
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1024 },
  font: { loadSystemFonts: true, defaultFontFamily: 'Arial', serifFamily: 'Georgia', sansSerifFamily: 'Arial' },
  background: CREAM,
});
const png = resvg.render().asPng();
writeFileSync('entry.png', png);
console.log('entry.png written:', png.length, 'bytes');