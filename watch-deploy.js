import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const WATCH_DIRS = [
  path.resolve('./src'),
  path.resolve('./server'),
  path.resolve('./index.html'),
  path.resolve('./tailwind.config.js'),
  path.resolve('./package.json')
];

let debounceTimer = null;
let isBuilding = false;
let pendingBuild = false;

function triggerDeploy() {
  if (isBuilding) {
    pendingBuild = true;
    console.log('⏳ Build already in progress. Queueing next build...');
    return;
  }

  isBuilding = true;
  pendingBuild = false;
  console.log('\n🚀 File change detected! Triggering automatic deployment to production (13.232.180.247)...');

  const start = Date.now();
  exec('./push.sh', (error, stdout, stderr) => {
    isBuilding = false;
    const duration = ((Date.now() - start) / 1000).toFixed(1);

    if (error) {
      console.error(`❌ Deployment failed after ${duration}s:`, error.message);
      console.error(stderr);
    } else {
      console.log(`✅ Deployment succeeded in ${duration}s!`);
    }

    if (pendingBuild) {
      triggerDeploy();
    }
  });
}

function handleChange(eventType, filename) {
  if (filename && (
    filename.includes('node_modules') || 
    filename.includes('dist') || 
    filename.includes('.git') ||
    filename.startsWith('.') || 
    filename.endsWith('~') || 
    filename.endsWith('#')
  )) {
    return;
  }
  
  console.log(`[${new Date().toLocaleTimeString()}] 📝 Change detected: ${filename}`);
  
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    triggerDeploy();
  }, 2000); // 2 second debounce
}

console.log('👀 Starting file watcher for auto-deployment to production (13.232.180.247)...');
WATCH_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const isDirectory = fs.statSync(dir).isDirectory();
  
  fs.watch(dir, { recursive: isDirectory }, handleChange);
  console.log(`   Watching: ${dir}`);
});

console.log('🤖 Auto-deploy watcher is active and listening for changes.');
