import Jimp from 'jimp';
import path from 'path';
import fs from 'fs';

const SRC = path.resolve('public/logo.png');
const ANDROID_RES = path.resolve('android/app/src/main/res');

// ic_launcher sizes (standard icon)
const LAUNCHER = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// ic_launcher_foreground sizes (adaptive icon foreground)
const FOREGROUND = [
  { dir: 'mipmap-mdpi',    size: 108 },
  { dir: 'mipmap-hdpi',    size: 162 },
  { dir: 'mipmap-xhdpi',   size: 216 },
  { dir: 'mipmap-xxhdpi',  size: 324 },
  { dir: 'mipmap-xxxhdpi', size: 432 },
];

async function main() {
  const img = await Jimp.read(SRC);

  for (const { dir, size } of LAUNCHER) {
    const dest = path.join(ANDROID_RES, dir);
    fs.mkdirSync(dest, { recursive: true });

    // ic_launcher.png — fond blanc + logo centré
    const bg = new Jimp({ width: size, height: size, color: 0xFFFFFFFF });
    const logo = img.clone().resize({ w: Math.round(size * 0.8), h: Math.round(size * 0.8) });
    const x = Math.round((size - logo.width) / 2);
    const y = Math.round((size - logo.height) / 2);
    bg.composite(logo, x, y);
    await bg.write(path.join(dest, 'ic_launcher.png'));
    await bg.write(path.join(dest, 'ic_launcher_round.png'));

    console.log(`✓ ${dir}/ic_launcher.png (${size}×${size})`);
  }

  for (const { dir, size } of FOREGROUND) {
    const dest = path.join(ANDROID_RES, dir);
    fs.mkdirSync(dest, { recursive: true });

    // ic_launcher_foreground.png — transparent + logo centré
    const fg = new Jimp({ width: size, height: size, color: 0x00000000 });
    const logo = img.clone().resize({ w: Math.round(size * 0.7), h: Math.round(size * 0.7) });
    const x = Math.round((size - logo.width) / 2);
    const y = Math.round((size - logo.height) / 2);
    fg.composite(logo, x, y);
    await fg.write(path.join(dest, 'ic_launcher_foreground.png'));

    console.log(`✓ ${dir}/ic_launcher_foreground.png (${size}×${size})`);
  }

  console.log('\nIcônes générées avec succès !');
}

main().catch(e => { console.error(e); process.exit(1); });
