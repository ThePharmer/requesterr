#!/usr/bin/env node
/**
 * One-off generator for the Requesterr brand assets (P5 "r in the play
 * button" mark, gold gradient). Emits SVGs and the full PNG/ICO/splash icon
 * set into branding/public/, which scripts/rebrand.mjs overlays onto public/
 * at build time. Re-run after editing the mark geometry below.
 *
 * Usage: node branding/generate-assets.mjs   (needs repo deps installed — uses sharp)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'branding', 'public');
fs.mkdirSync(out, { recursive: true });

const NAVY = '#131928';
const GOLD1 = '#FFDF6B';
const GOLD2 = '#F0A020';

// ---- The mark (96x96 viewBox) -------------------------------------------
// mono=true renders a flat single-color silhouette (for the webpush badge).
const markBody = (mono = null) => {
  const tri = mono ?? 'url(#au)';
  const r = mono ?? NAVY;
  return `
<path d="M30 20 L81 48 L30 76 Z" fill="${tri}" stroke="${tri}" stroke-width="14" stroke-linejoin="round"/>
<path d="M40 36 V62" stroke="${r}" stroke-width="10.5" stroke-linecap="round" fill="none"/>
<path d="M40 49.5 C40 40.5, 47 37, 53.5 38.5" stroke="${r}" stroke-width="10.5" stroke-linecap="round" fill="none"/>`;
};

const gradDef = `
<linearGradient id="au" x1="24" y1="14" x2="86" y2="84" gradientUnits="userSpaceOnUse">
<stop stop-color="${GOLD1}"/><stop offset="1" stop-color="${GOLD2}"/>
</linearGradient>`;

const markSvg = (size = 96) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">${markBody()}<defs>${gradDef}</defs></svg>`;

// Android renders the webpush badge from the alpha channel only, so the r
// must be a genuine transparent cutout in a white silhouette — painted color
// would read as a solid triangle. Built via dest-out compositing below.
const badgeTriSvg =
  `<svg width="128" height="128" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M30 20 L81 48 L30 76 Z" fill="white" stroke="white" stroke-width="14" stroke-linejoin="round"/>
</svg>`;
const badgeRSvg =
  `<svg width="128" height="128" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M40 36 V62" stroke="white" stroke-width="10.5" stroke-linecap="round" fill="none"/>
<path d="M40 49.5 C40 40.5, 47 37, 53.5 38.5" stroke="white" stroke-width="10.5" stroke-linecap="round" fill="none"/>
</svg>`;

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'DejaVu Sans', 'Helvetica Neue', Arial, sans-serif`;

const logoFullSvg =
  `<svg width="470" height="96" viewBox="0 0 470 96" fill="none" xmlns="http://www.w3.org/2000/svg">
${markBody()}
<text x="106" y="63" fill="white" font-family="${FONT}" font-size="46" font-weight="600" dominant-baseline="middle">requesterr</text>
<defs>${gradDef}</defs>
</svg>`;

const logoStackedSvg =
  `<svg width="198" height="170" viewBox="0 0 198 170" fill="none" xmlns="http://www.w3.org/2000/svg">
<g transform="translate(51,4)">${markBody()}</g>
<text x="99" y="140" fill="white" font-family="${FONT}" font-size="28" font-weight="600" text-anchor="middle" dominant-baseline="middle">requesterr</text>
<defs>${gradDef}</defs>
</svg>`;

fs.writeFileSync(path.join(out, 'logo_full.svg'), logoFullSvg);
fs.writeFileSync(path.join(out, 'logo_stacked.svg'), logoStackedSvg);
fs.writeFileSync(path.join(out, 'os_icon.svg'), markSvg());

const density = (target) => Math.min(2400, 72 * (target / 96));
const renderMark = (px) =>
  sharp(Buffer.from(markSvg()), { density: density(px) }).resize(px, px).png().toBuffer();

// Icon on a solid navy square, mark scaled to `scale` of the canvas.
const onNavy = async (px, scale) => {
  const inner = Math.round(px * scale);
  const mark = await renderMark(inner);
  return sharp({ create: { width: px, height: px, channels: 4, background: NAVY } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
};

const write = (name, buf) => fs.writeFileSync(path.join(out, name), buf);

// ICO container with embedded PNG images (supported by all modern browsers).
const ico = (pngs) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, buf } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
};

const f16 = await renderMark(16);
const f32 = await renderMark(32);
write('favicon-16x16.png', f16);
write('favicon-32x32.png', f32);
write('favicon.ico', ico([{ size: 16, buf: f16 }, { size: 32, buf: f32 }]));

write('android-chrome-192x192.png', await renderMark(192));
write('android-chrome-512x512.png', await renderMark(512));
write('android-chrome-192x192_maskable.png', await onNavy(192, 0.64));
write('android-chrome-512x512_maskable.png', await onNavy(512, 0.64));
write('apple-touch-icon.png', await onNavy(180, 0.72));
write('badge-128x128.png',
  await sharp(Buffer.from(badgeTriSvg), { density: 96 }).resize(128, 128).png()
    .composite([{ input: await sharp(Buffer.from(badgeRSvg), { density: 96 }).resize(128, 128).png().toBuffer(), blend: 'dest-out' }])
    .toBuffer());
write('logo_full.png',
  await sharp(Buffer.from(logoFullSvg), { density: 144 }).png().toBuffer());

// Apple splash screens: enumerate sizes from the existing upstream set so the
// filenames always match what PWAHeader links to.
const splashes = fs.readdirSync(path.join(root, 'public')).filter((f) => /^apple-splash-\d+-\d+\.jpg$/.test(f));
const stackedPng = async (w, h) => {
  const target = Math.round(Math.min(w, h) * 0.32);
  const scale = target / 198;
  return sharp(Buffer.from(logoStackedSvg), { density: Math.min(2400, 72 * scale) })
    .resize({ width: target })
    .png()
    .toBuffer();
};
for (const name of splashes) {
  const [, w, h] = name.match(/apple-splash-(\d+)-(\d+)\.jpg/).map(Number);
  const logo = await stackedPng(w, h);
  const buf = await sharp({ create: { width: w, height: h, channels: 3, background: '#1f2937' } })
    .composite([{ input: logo, gravity: 'center' }])
    .jpeg({ quality: 88 })
    .toBuffer();
  write(name, buf);
}

console.log(`generated ${fs.readdirSync(out).length} assets into branding/public/ (${splashes.length} splash screens)`);
