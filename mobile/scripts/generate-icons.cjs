const { Jimp } = require('jimp');
const path = require('path');
const fs   = require('fs');

const SRC        = path.resolve(__dirname, '../public/logo.png');
const ANDROID_RES = path.resolve(__dirname, '../android/app/src/main/res');

const LAUNCHER = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

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

    const logoSize = Math.round(size * 0.8);
    const logo = img.clone().resize({ w: logoSize, h: logoSize });
    const x = Math.round((size - logo.width) / 2);
    const y = Math.round((size - logo.height) / 2);

    // Fond blanc
    const bg = new Jimp({ width: size, height: size, color: 0xFFFFFFFF });
    bg.composite(logo, x, y);
    await bg.write(path.join(dest, 'ic_launcher.png'));
    await bg.write(path.join(dest, 'ic_launcher_round.png'));
    console.log(`✓ ${dir}/ic_launcher.png (${size}px)`);
  }

  for (const { dir, size } of FOREGROUND) {
    const dest = path.join(ANDROID_RES, dir);
    fs.mkdirSync(dest, { recursive: true });

    const logoSize = Math.round(size * 0.7);
    const logo = img.clone().resize({ w: logoSize, h: logoSize });
    const x = Math.round((size - logo.width) / 2);
    const y = Math.round((size - logo.height) / 2);

    const fg = new Jimp({ width: size, height: size, color: 0x00000000 });
    fg.composite(logo, x, y);
    await fg.write(path.join(dest, 'ic_launcher_foreground.png'));
    console.log(`✓ ${dir}/ic_launcher_foreground.png (${size}px)`);
  }

  console.log('\n✅ Toutes les icônes générées !');
}

main().catch(e => { console.error(e.message); process.exit(1); });
