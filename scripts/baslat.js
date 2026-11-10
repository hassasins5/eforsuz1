import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('==============================================================');
console.log('  EFORSUZ 1 — Yerel URL Çözücü + Web Arayüzü Başlatılıyor');
console.log('==============================================================');

// 1. Yerel Yardımcı Servisi (Port 3001) başlat
const companion = spawn(
  process.execPath,
  ['--use-system-ca', path.join(ROOT_DIR, 'server', 'yerel-yardimci.js')],
  {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  }
);

// 2. Vite Web Sunucusunu başlat
const viteBin = path.join(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
const web = spawn(process.execPath, [viteBin], {
  cwd: ROOT_DIR,
  stdio: 'inherit'
});

function shutdown() {
  try {
    companion.kill();
  } catch (_) {}
  try {
    web.kill();
  } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
