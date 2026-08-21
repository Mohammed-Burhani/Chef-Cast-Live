/**
 * optimize-assets.js
 * 
 * Resizes and converts oversized PNG logo assets to WebP.
 * Run once: node scripts/optimize-assets.js
 * 
 * Resize targets (3× the max rendered size for retina/3x screens):
 *   G_Red.png          → rendered 140×56px  → target 420×168px
 *   G_Foodilicious.png → rendered 140×40px  → target 420×120px (width-constrained)
 *   sponsor-with.png   → rendered ~360×220  → target 1080×660px  
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'logos');

const tasks = [
  {
    input: 'G_Red.png',
    output: 'G_Red.webp',
    // Original: 4500×3000px rendered at 140×56px → resize to 420px wide
    width: 420,
    quality: 85,
  },
  {
    input: 'G_Foodilicious_Clean.png',
    output: 'G_Foodilicious_Clean.webp',
    // Original: 2322×890px rendered at 140×40px → resize to 420px wide
    width: 420,
    quality: 85,
  },
  {
    input: 'sponsor-with.png',
    output: 'sponsor-with.webp',
    // Original: 2322×1668px rendered at ~360×220px → resize to 1080px wide
    width: 1080,
    quality: 85,
  },
];

async function run() {
  console.log('🖼️  Optimizing logo assets...\n');

  for (const task of tasks) {
    const inputPath = path.join(ASSETS_DIR, task.input);
    const outputPath = path.join(ASSETS_DIR, task.output);

    const beforeSize = fs.statSync(inputPath).size;

    await sharp(inputPath)
      .resize(task.width, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: task.quality, effort: 6 })
      .toFile(outputPath);

    const afterSize = fs.statSync(outputPath).size;
    const savings = (((beforeSize - afterSize) / beforeSize) * 100).toFixed(1);

    console.log(`✅ ${task.input} → ${task.output}`);
    console.log(`   Before: ${(beforeSize / 1024).toFixed(0)} KB  →  After: ${(afterSize / 1024).toFixed(0)} KB  (${savings}% smaller)\n`);
  }

  console.log('🎉 Done! Update code imports to use .webp files.');
  console.log('   grep -r ".png" assets/logos/ to find remaining PNG refs.');
}

run().catch(console.error);
