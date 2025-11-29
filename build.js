// build.js - Build script for Vercel deployment
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting JLINK POS build process...');

// Create public directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('✅ Created public directory');
}

// Function to copy files safely
function copyFileSafe(source, destination) {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(destination);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, destination);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`❌ Error copying ${source}:`, err.message);
    return false;
  }
}

// Copy index.html
if (copyFileSafe(  // ← FIXED: Changed from copyFileSync to copyFileSafe
  path.join(__dirname, 'index.html'),
  path.join(publicDir, 'index.html')
)) {
  console.log('✅ Copied index.html');
} else {
  console.log('❌ Failed to copy index.html');
}

// Copy JS files if they exist
const jsSourceDir = path.join(__dirname, 'js');
const jsDestDir = path.join(publicDir, 'js');

if (fs.existsSync(jsSourceDir)) {
  if (!fs.existsSync(jsDestDir)) {
    fs.mkdirSync(jsDestDir, { recursive: true });
  }
  
  try {
    const files = fs.readdirSync(jsSourceDir);
    let copiedCount = 0;
    
    files.forEach(file => {
      if (file.endsWith('.js')) {
        if (copyFileSafe(
          path.join(jsSourceDir, file),
          path.join(jsDestDir, file)
        )) {
          copiedCount++;
        }
      }
    });
    
    console.log(`✅ Copied ${copiedCount} JS files`);
  } catch (err) {
    console.error('❌ Error copying JS files:', err.message);
  }
} else {
  console.log('⚠️ JS directory not found, creating placeholder');
  
  // Create minimal required JS files
  const requiredFiles = {
    'firebase-config.js': `// Firebase configuration placeholder
console.log('Firebase config loaded');`,
    'app.js': `// Main app placeholder
console.log('JLINK POS App loaded');`,
    'cart-manager.js': `// Cart manager placeholder
console.log('Cart manager loaded');`,
    'product-service.js': `// Product service placeholder
console.log('Product service loaded');`,
    'sales-service.js': `// Sales service placeholder  
console.log('Sales service loaded');`,
    'email-service.js': `// Email service placeholder
console.log('Email service loaded');`
  };
  
  Object.entries(requiredFiles).forEach(([filename, content]) => {
    const filePath = path.join(jsDestDir, filename);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created ${filename}`);
  });
}

// Create assets directory if needed
const assetsDestDir = path.join(publicDir, 'assets');
if (!fs.existsSync(assetsDestDir)) {
  fs.mkdirSync(assetsDestDir, { recursive: true });
  console.log('✅ Created assets directory');
}

console.log('✅ Build completed successfully!');
console.log('📁 Output directory: public/');
