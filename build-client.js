#!/usr/bin/env node

// Simple build script for Netlify deployment
import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import path from 'path';

console.log('Building client for Netlify deployment...');

function copyRecursive(src, dest) {
  if (!existsSync(src)) return;
  
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  
  const items = readdirSync(src);
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // Change to client directory and build
  process.chdir('client');
  console.log('Installing client dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('Building client...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Go back to root
  process.chdir('..');
  
  // Copy attached assets to dist using Node.js
  console.log('Copying assets...');
  if (existsSync('attached_assets')) {
    const destDir = 'client/dist/attached_assets';
    copyRecursive('attached_assets', destDir);
    console.log('Assets copied successfully');
  }
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}