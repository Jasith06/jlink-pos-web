// build.js - Build script for Vercel deployment (ES Module)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting JLINK POS build process...');

// Create public directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('✅ Created public directory');
}

// Function to copy files recursively
function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy index.html
try {
  fs.copyFileSync(
    path.join(__dirname, 'index.html'),
    path.join(publicDir, 'index.html')
  );
  console.log('✅ Copied index.html');
} catch (err) {
  console.error('❌ Error copying index.html:', err.message);
}

// Copy JS folder
try {
  const jsDir = path.join(publicDir, 'js');
  if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true });
  }
  copyRecursive(path.join(__dirname, 'js'), jsDir);
  console.log('✅ Copied js directory');
} catch (err) {
  console.error('❌ Error copying js:', err.message);
}

// Copy styles folder
try {
  const stylesDir = path.join(publicDir, 'styles');
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
  }
  copyRecursive(path.join(__dirname, 'styles'), stylesDir);
  console.log('✅ Copied styles directory');
} catch (err) {
  console.error('❌ Error copying styles:', err.message);
}

// Copy assets folder (if it exists)
try {
  const assetsDir = path.join(publicDir, 'assets');
  const sourceAssets = path.join(__dirname, 'assets');
  
  if (fs.existsSync(sourceAssets)) {
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    copyRecursive(sourceAssets, assetsDir);
    console.log('✅ Copied assets directory');
  } else {
    console.warn('⚠️ Assets directory not found, creating empty one');
    fs.mkdirSync(assetsDir, { recursive: true });
  }
} catch (err) {
  console.error('❌ Error copying assets:', err.message);
}

// ❌ DO NOT COPY API FOLDER - Vercel needs it at root level!
console.log('ℹ️  Skipping API folder (must stay at root for serverless functions)');

console.log('✅ Build completed successfully!');
console.log('📁 Output directory: public/');
console.log('📁 API functions: api/ (at root level)');
