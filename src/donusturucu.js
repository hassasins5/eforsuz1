import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

/**
 * Tek iş parçacıklı (single-threaded) @ffmpeg/core sürümü.
 * SharedArrayBuffer GEREKTİRMEZ — iOS Safari, Android Chrome ve tüm
 * statik barındırma servislerinde özel HTTP başlığı olmadan çalışır.
 */
const CORE_VERSION = '0.12.6';
const CDN_SOURCES = [
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`
];

const COMPANION_BASE = 'http://127.0.0.1:3001';

let ffmpegInstance = null;
let isLoaded = false;
let currentProgressCallback = null;
let activeFetchController = null;

/**
 * Yerel yardımcı servisin (127.0.0.1:3001) açık olup olmadığını kontrol eder.
 */
export async function yerelServisKontrolEt() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${COMPANION_BASE}/api/health`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data && data.ok);
  } catch (_) {
    return false;
  }
}

/**
 * Verilen URL'nin doğrudan bir medya dosyası (.mp4, .webm, .mov, .mp3 vb.) olup olmadığını tahmin eder.
 */
function dogrudanMedyaLinkiMi(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const pathname = parsed.pathname.toLowerCase();
    return /\.(mp4|mov|webm|mkv|m4a|avi|mp3|wav)$/i.test(pathname);
  } catch (_) {
    return false;
  }
}

/**
 * Yöntem 1 + Yöntem 4 Birleşimi:
 * Verilen URL'den (YouTube, TikTok, Instagram, X veya doğrudan .mp4 linki)
 * medya akışını indirip tarayıcı içinde File nesnesine dönüştürür.
 */
export async function urldenMedyaGetir(targetUrl, { onDownloadProgress } = {}) {
  activeFetchController = new AbortController();
  const signal = activeFetchController.signal;

  const servisAcik = await yerelServisKontrolEt();
  const direktLinkMi = dogrudanMedyaLinkiMi(targetUrl);

  // Durum A: Doğrudan .mp4/.webm linki ise önce tarayıcıdan doğrudan dene, CORS takılırsa yerel proxy'ye geç
  if (direktLinkMi) {
    try {
      const directRes = await fetch(targetUrl, { signal });
      if (directRes.ok) {
        const blob = await streamIleBlobOku(directRes, onDownloadProgress);
        const urlObj = new URL(targetUrl);
        const rawName = decodeURIComponent(urlObj.pathname.split('/').pop() || 'video.mp4');
        return new File([blob], rawName, { type: blob.type || 'video/mp4' });
      }
    } catch (err) {
      if (signal.aborted) throw new Error('ABORTED');
      // CORS hatası alındıysa ve yerel servis açıksa proxy üzerinden devam et
    }

    if (servisAcik) {
      const proxyUrl = `${COMPANION_BASE}/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      const proxyRes = await fetch(proxyUrl, { signal });
      if (!proxyRes.ok) {
        throw new Error('URL_FETCH_FAILED');
      }
      const blob = await streamIleBlobOku(proxyRes, onDownloadProgress);
      const urlObj = new URL(targetUrl);
      const rawName = decodeURIComponent(urlObj.pathname.split('/').pop() || 'video.mp4');
      return new File([blob], rawName, { type: blob.type || 'video/mp4' });
    }

    throw new Error('URL_FETCH_FAILED');
  }

  // Durum B: Sosyal Medya / Genel Video Linki (YouTube, TikTok, Instagram, X vb.) -> Yerel Yardımcı Servis (Yöntem 4)
  if (!servisAcik) {
    throw new Error('COMPANION_REQUIRED');
  }

  const extractUrl = `${COMPANION_BASE}/api/extract?url=${encodeURIComponent(targetUrl)}`;
  const res = await fetch(extractUrl, { signal });

  if (!res.ok) {
    throw new Error('URL_FETCH_FAILED');
  }

  const encodedTitle = res.headers.get('X-Video-Title');
  const ext = res.headers.get('X-Video-Ext') || 'm4a';
  const title = encodedTitle ? decodeURIComponent(encodedTitle) : 'url_ses_kaydi';
  const filename = `${title}.${ext}`;

  const blob = await streamIleBlobOku(res, onDownloadProgress);
  return new File([blob], filename, { type: blob.type || 'application/octet-stream' });
}

/**
 * Fetch yanıtını okurken indirme yüzdesini hesaplar
 */
async function streamIleBlobOku(response, onDownloadProgress) {
  const contentLength = Number(response.headers.get('Content-Length') || 0);
  if (!response.body || !contentLength) {
    const blob = await response.blob();
    if (typeof onDownloadProgress === 'function') onDownloadProgress(100);
    return blob;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let receivedLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedLength += value.length;
    if (typeof onDownloadProgress === 'function' && contentLength > 0) {
      const pct = Math.min(99, Math.round((receivedLength / contentLength) * 100));
      onDownloadProgress(pct);
    }
  }

  if (typeof onDownloadProgress === 'function') onDownloadProgress(100);
  return new Blob(chunks, { type: response.headers.get('Content-Type') || 'application/octet-stream' });
}

/**
 * FFmpeg çekirdeğini yalnızca kullanıcı dönüştürmeye başladığında yükler.
 */
async function ensureFFmpegLoaded() {
  if (ffmpegInstance && isLoaded) {
    return ffmpegInstance;
  }

  ffmpegInstance = new FFmpeg();

  ffmpegInstance.on('progress', ({ progress }) => {
    if (typeof currentProgressCallback === 'function') {
      const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
      currentProgressCallback(Math.round(clamped * 100));
    }
  });

  let lastError = null;
  for (const baseURL of CDN_SOURCES) {
    try {
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
      await ffmpegInstance.load({ coreURL, wasmURL });
      isLoaded = true;
      return ffmpegInstance;
    } catch (err) {
      lastError = err;
    }
  }

  ffmpegInstance = null;
  isLoaded = false;
  const error = new Error('ENGINE_LOAD_FAILED');
  error.cause = lastError;
  throw error;
}

/**
 * Video/medya dosyasını seçilen ses formatına dönüştürür.
 * @param {File} file - Kullanıcının seçtiği veya URL'den indirilen medya dosyası
 * @param {Object} formatOption - src/metinler.js içindeki format nesnesi
 * @param {Object} callbacks - { onEngineLoading, onProgress }
 */
export async function videoyuSeseCevir(file, formatOption, { onEngineLoading, onProgress } = {}) {
  if (!isLoaded && typeof onEngineLoading === 'function') {
    onEngineLoading();
  }

  const ffmpeg = await ensureFFmpegLoaded();
  currentProgressCallback = onProgress;

  const uzantiParcalari = file.name.split('.');
  const kaynakUzanti = uzantiParcalari.length > 1 ? uzantiParcalari.pop().toLowerCase() : 'mp4';
  const girisDosyaAdi = `giris_${Date.now()}.${kaynakUzanti}`;
  const cikisDosyaAdi = `cikis_${Date.now()}.${formatOption.uzanti}`;

  try {
    const dosyaVerisi = await fetchFile(file);
    await ffmpeg.writeFile(girisDosyaAdi, dosyaVerisi);

    let komutArgumanlari = ['-i', girisDosyaAdi, '-vn'];

    if (formatOption.format === 'mp3') {
      komutArgumanlari.push(
        '-acodec', 'libmp3lame',
        '-b:a', formatOption.bitrate || '192k'
      );
    } else if (formatOption.format === 'm4a') {
      komutArgumanlari.push(
        '-c:a', 'aac',
        '-b:a', formatOption.bitrate || '192k'
      );
    } else if (formatOption.format === 'wav') {
      komutArgumanlari.push(
        '-acodec', 'pcm_s16le'
      );
    }

    komutArgumanlari.push(cikisDosyaAdi);

    const cikisKodu = await ffmpeg.exec(komutArgumanlari);
    if (cikisKodu !== 0) {
      throw new Error('CORRUPT_OR_NO_AUDIO');
    }

    const ciktiVerisi = await ffmpeg.readFile(cikisDosyaAdi);
    if (!ciktiVerisi || ciktiVerisi.length === 0) {
      throw new Error('CORRUPT_OR_NO_AUDIO');
    }

    const blob = new Blob([ciktiVerisi.buffer], { type: formatOption.mime });
    return blob;
  } finally {
    currentProgressCallback = null;
    try {
      await ffmpeg.deleteFile(girisDosyaAdi);
    } catch (_) {
      // Yoksay
    }
    try {
      await ffmpeg.deleteFile(cikisDosyaAdi);
    } catch (_) {
      // Yoksay
    }
  }
}

/**
 * Devam eden URL indirme veya FFmpeg dönüşüm işlemini anında durdurur.
 */
export function donusumuIptalEt() {
  currentProgressCallback = null;
  if (activeFetchController) {
    try {
      activeFetchController.abort();
    } catch (_) {}
    activeFetchController = null;
  }
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch (_) {
      // Yoksay
    }
    ffmpegInstance = null;
    isLoaded = false;
  }
}
