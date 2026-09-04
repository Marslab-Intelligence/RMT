import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const WATCH_DIRS = [
  path.resolve('./src'),
  path.resolve('./server'),
  path.resolve('./public'),
  path.resolve('./index.html'),
  path.resolve('./tailwind.config.js'),
  path.resolve('./package.json'),
  path.resolve('./Dockerfile')
];

let debounceTimer = null;
let isBuilding = false;
let pendingBuild = false;

function triggerDeploy() {
  if (isBuilding) {
    pendingBuild = true;
    console.log('⏳ Build/Deploy already in progress. Queueing next build...');
    return;
  }

  isBuilding = true;
  pendingBuild = false;
  console.log('\n🚀 Code change detected in Antigravity! Executing ECR Push & Remote Deployment...');

  const start = Date.now();
  exec('./push.sh', (error, stdout, stderr) => {
    isBuilding = false;
    const duration = ((Date.now() - start) / 1000).toFixed(1);

    if (stdout) console.log(stdout);

    if (error) {
      console.error(`❌ Deployment failed after ${duration}s:`, error.message);
      if (stderr) console.error(stderr);
    } else {
      console.log(`✅ Antigravity live deployment succeeded in ${duration}s! Server updated.`);
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
  
  console.log(`[${new Date().toLocaleTimeString()}] 📝 Code change detected: ${filename}`);
  
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    triggerDeploy();
  }, 2000); // 2-second debounce
}

console.log('👀 Antigravity Live Deployment Watcher Active');
console.log('   Target Key: /home/sameer/Documents/pem Files/marslab-Devops.pem');
WATCH_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const isDirectory = fs.statSync(dir).isDirectory();
  
  fs.watch(dir, { recursive: isDirectory }, handleChange);
  console.log(`   Watching: ${dir}`);
});

console.log('🤖 Listening for live changes in Antigravity...\n');
