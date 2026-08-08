const { Jimp } = require('jimp');
const path = require('path');
const fs   = require('fs');

const SRC        = path.resolve(__dirname, '../public/logo.png');
const ANDROID_RES = path.resolve(__dirname, '../android/app/src/main/res');
const BG_COLOR    = 0x16a34aff; // vert de la marque (capacitor.config.ts / index.html)

const SPLASH = [
  { dir: 'drawable',            w: 480,  h: 800  },
  { dir: 'drawable-land-hdpi',  w: 800,  h: 480  },
  { dir: 'drawable-land-mdpi',  w: 480,  h: 320  },
  { dir: 'drawable-land-xhdpi', w: 1280, h: 720  },
  { dir: 'drawable-land-xxhdpi',w: 1600, h: 960  },
  { dir: 'drawable-land-xxxhdpi',w: 1920,h: 1280 },
  { dir: 'drawable-port-hdpi',  w: 480,  h: 800  },
  { dir: 'drawable-port-mdpi',  w: 320,  h: 480  },
  { dir: 'drawable-port-xhdpi', w: 720,  h: 1280 },
  { dir: 'drawable-port-xxhdpi',w: 960,  h: 1600 },
  { dir: 'drawable-port-xxxhdpi',w: 1280,h: 1920 },
];

async function main() {
  const img = await Jimp.read(SRC);

  for (const { dir, w, h } of SPLASH) {
    const dest = path.join(ANDROID_RES, dir);
    fs.mkdirSync(dest, { recursive: true });

    const logoSize = Math.round(Math.min(w, h) * 0.4);
    const logo = img.clone().resize({ w: logoSize, h: logoSize });
    const x = Math.round((w - logo.width) / 2);
    const y = Math.round((h - logo.height) / 2);

    const bg = new Jimp({ width: w, height: h, color: BG_COLOR });
    bg.composite(logo, x, y);
    await bg.write(path.join(dest, 'splash.png'));
    console.log(`✓ ${dir}/splash.png (${w}×${h})`);
  }

  console.log('\n✅ Tous les splash screens générés !');
}

main().catch(e => { console.error(e.message); process.exit(1); });
