import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BIN_DIR = path.join(ROOT_DIR, 'bin');
const TEMP_DIR = path.join(ROOT_DIR, 'temp_downloads');

const PORT = process.env.COMPANION_PORT || 3001;
const IS_WIN = process.platform === 'win32';
const YTDLP_FILENAME = IS_WIN ? 'yt-dlp.exe' : 'yt-dlp';
const YTDLP_PATH = path.join(BIN_DIR, YTDLP_FILENAME);
const YTDLP_DOWNLOAD_URL = IS_WIN
  ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

let ytdlpReadyPromise = null;

/**
 * Yönlendirmeleri (301/302) takip ederek dosya indiren yardımcı fonksiyon
 */
function downloadFileWithRedirects(url, destPath) {
  return new Promise((resolve, reject) => {
    const request = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 10) {
        reject(new Error('Çok fazla yönlendirme (redirect).'));
        return;
      }
      const client = currentUrl.startsWith('https') ? https : http;
      client
        .get(
          currentUrl,
          {
            headers: {
              'User-Agent': 'Eforsuz-Local-Companion/2.0'
            }
          },
          (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              const nextUrl = new URL(res.headers.location, currentUrl).toString();
              res.resume();
              request(nextUrl, redirectCount + 1);
              return;
            }
            if (res.statusCode !== 200) {
              res.resume();
              reject(new Error(`İndirme başarısız oldu: HTTP ${res.statusCode}`));
              return;
            }
            const fileStream = fs.createWriteStream(destPath);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
              fileStream.close(() => {
                if (!IS_WIN) {
                  try {
                    fs.chmodSync(destPath, 0o755);
                  } catch (_) {}
                }
                resolve(destPath);
              });
            });
            fileStream.on('error', (err) => {
              fs.unlink(destPath, () => {});
              reject(err);
            });
          }
        )
        .on('error', reject);
    };
    request(url);
  });
}

/**
 * yt-dlp aracının bin/ klasöründe hazır olduğundan emin olur; yoksa otomatik indirir.
 */
export async function ensureYtDlpBinary() {
  if (fs.existsSync(YTDLP_PATH) && fs.statSync(YTDLP_PATH).size > 1024 * 1024) {
    return YTDLP_PATH;
  }
  if (!ytdlpReadyPromise) {
    console.log('[Yerel Yardımcı] yt-dlp motoru ilk kez indiriliyor, lütfen bekleyin...');
    ytdlpReadyPromise = downloadFileWithRedirects(YTDLP_DOWNLOAD_URL, YTDLP_PATH)
      .then((p) => {
        console.log('[Yerel Yardımcı] yt-dlp motoru başarıyla hazırlandı:', p);
        return p;
      })
      .catch((err) => {
        ytdlpReadyPromise = null;
        throw err;
      });
  }
  return ytdlpReadyPromise;
}

/**
 * CORS başlıklarını ekler (hem localhost hem de GitHub Pages üzerinden erişime izin verir)
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Expose-Headers', 'X-Video-Title, X-Video-Ext, Content-Length, Content-Type');
}

/**
 * Dosya adını güvenli hale getirir
 */
function sanitizeFilename(title) {
  if (!title) return 'medya';
  return (
    title
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 110) || 'medya'
  );
}

/**
 * yt-dlp ile videonun başlığını alır
 */
function getVideoTitle(ytdlpBin, targetUrl) {
  return new Promise((resolve) => {
    const proc = spawn(ytdlpBin, [
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '--encoding',
      'utf-8',
      '--print',
      '%(title)s',
      targetUrl
    ]);

    let stdout = '';
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        const firstLine = stdout.trim().split(/\r?\n/)[0];
        resolve(sanitizeFilename(firstLine));
      } else {
        resolve('url_ses_kaydi');
      }
    });
    proc.on('error', () => resolve('url_ses_kaydi'));
  });
}

/**
 * yt-dlp ile en iyi ses/medya akışını geçici klasöre indirir ve dosya yolunu döner
 */
function downloadMediaWithYtDlp(ytdlpBin, targetUrl, jobId) {
  return new Promise((resolve, reject) => {
    const outputTemplate = path.join(TEMP_DIR, `${jobId}.%(ext)s`);
    const args = [
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '--no-part',
      '-f',
      'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best[ext=mp4]/best',
      '-o',
      outputTemplate,
      targetUrl
    ];

    const proc = spawn(ytdlpBin, args);
    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `yt-dlp hata kodu: ${code}`));
        return;
      }

      const files = fs.readdirSync(TEMP_DIR).filter((f) => f.startsWith(`${jobId}.`));
      if (files.length === 0) {
        reject(new Error('Medya dosyası oluşturulamadı.'));
        return;
      }

      const fullPath = path.join(TEMP_DIR, files[0]);
      const ext = path.extname(files[0]).replace('.', '').toLowerCase() || 'm4a';
      resolve({ fullPath, ext });
    });

    proc.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);

  // 1. Sağlık Kontrolü (/api/health)
  if (parsedUrl.pathname === '/api/health') {
    const hasBinary = fs.existsSync(YTDLP_PATH);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: true,
        service: 'eforsuz-yerel-yardimci',
        ytdlpReady: hasBinary
      })
    );
    return;
  }

  // 2. Yöntem 1: Doğrudan Medya Linki CORS Proxy (/api/proxy?url=...)
  if (parsedUrl.pathname === '/api/proxy') {
    const targetUrl = parsedUrl.searchParams.get('url');
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Geçersiz URL.' }));
      return;
    }

    const proxyRequest = (currentUrl, redirects = 0) => {
      if (redirects > 8) {
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Çok fazla yönlendirme.' }));
        return;
      }
      const client = currentUrl.startsWith('https') ? https : http;
      client
        .get(
          currentUrl,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            }
          },
          (upstream) => {
            if (upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
              const nextUrl = new URL(upstream.headers.location, currentUrl).toString();
              upstream.resume();
              proxyRequest(nextUrl, redirects + 1);
              return;
            }
            if (upstream.statusCode !== 200 && upstream.statusCode !== 206) {
              upstream.resume();
              res.writeHead(upstream.statusCode || 502, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: `Karşı sunucu hatası: ${upstream.statusCode}` }));
              return;
            }

            const headers = {
              'Content-Type': upstream.headers['content-type'] || 'application/octet-stream'
            };
            if (upstream.headers['content-length']) {
              headers['Content-Length'] = upstream.headers['content-length'];
            }
            res.writeHead(200, headers);
            upstream.pipe(res);
          }
        )
        .on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: err.message }));
        });
    };

    proxyRequest(targetUrl);
    return;
  }

  // 3. Yöntem 4: Sosyal Medya & Genel Video URL Çözücü (/api/extract?url=...)
  if (parsedUrl.pathname === '/api/extract') {
    const targetUrl = parsedUrl.searchParams.get('url');
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Lütfen geçerli bir http:// veya https:// adresi girin.' }));
      return;
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let downloadedFile = null;

    try {
      const ytdlpBin = await ensureYtDlpBinary();
      const [title, media] = await Promise.all([
        getVideoTitle(ytdlpBin, targetUrl),
        downloadMediaWithYtDlp(ytdlpBin, targetUrl, jobId)
      ]);

      downloadedFile = media.fullPath;
      const stat = fs.statSync(downloadedFile);

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        'X-Video-Title': encodeURIComponent(title),
        'X-Video-Ext': media.ext
      });

      const readStream = fs.createReadStream(downloadedFile);
      readStream.pipe(res);

      const cleanup = () => {
        if (downloadedFile && fs.existsSync(downloadedFile)) {
          fs.unlink(downloadedFile, () => {});
          downloadedFile = null;
        }
      };

      res.on('close', cleanup);
      readStream.on('end', cleanup);
      readStream.on('error', cleanup);
    } catch (err) {
      if (downloadedFile && fs.existsSync(downloadedFile)) {
        fs.unlink(downloadedFile, () => {});
      }
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          error: 'URL_EXTRACT_FAILED',
          details: err?.message || 'Video akışı çözümlenemedi.'
        })
      );
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Bulunamadı' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Yerel Yardımcı] http://127.0.0.1:${PORT} adresinde aktif.`);
  ensureYtDlpBinary().catch((err) => {
    console.warn('[Yerel Yardımcı] yt-dlp ön hazırlık uyarısı:', err.message);
  });
});
