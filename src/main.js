import './stil.css';
import { METINLER } from './metinler.js';
import {
  videoyuSeseCevir,
  urldenMedyaGetir,
  yerelServisKontrolEt,
  donusumuIptalEt
} from './donusturucu.js';

const DESTEKLENEN_UZANTILAR = ['mp4', 'mov', 'webm', 'mkv', 'm4a', 'avi'];
const BUYUK_DOSYA_SINIRI = 500 * 1024 * 1024; // 500 MB

let aktifMod = 'file'; // 'file' veya 'url'
let seciliDosya = null;
let girilenUrl = '';
let seciliFormat = METINLER.formatlar.find((f) => f.varsayilan) || METINLER.formatlar[0];
let aktifBlobUrl = null;
let islemDevamEdiyor = false;
let kullaniciIptalEtti = false;

/* ==========================================================================
   1. METİNLERİ DOM'A YERLEŞTİRME (Tek Noktadan Yönetim)
   ========================================================================== */
function metinleriYukle() {
  document.title = METINLER.sayfaBasligi;

  const setElText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setElText('brand-name', METINLER.siteAdi);
  setElText('hero-title', METINLER.baslik);
  setElText('hero-subtitle', METINLER.altBaslik);

  const lampBtn = document.getElementById('lamp-toggle');
  if (lampBtn) {
    lampBtn.setAttribute('aria-label', METINLER.ampulAciklama);
    lampBtn.setAttribute('title', METINLER.ampulAciklama);
  }

  setElText('tab-file', METINLER.sekmeDosya);
  setElText('tab-url', METINLER.sekmeUrl);

  setElText('url-label', METINLER.urlBaslik);
  setElText('url-hint', METINLER.urlIpucu);
  const urlInput = document.getElementById('url-input');
  if (urlInput) {
    urlInput.setAttribute('placeholder', METINLER.urlYerTutucu);
  }

  setElText('dropzone-title', METINLER.dosyaSecBaslik);
  setElText('dropzone-hint', METINLER.dosyaSecIpucu);
  setElText('dropzone-formats', METINLER.desteklenenFormatlar);
  setElText('change-file-btn', METINLER.dosyaDegistir);
  setElText('quality-label', METINLER.ciktiAyarlariBaslik);
  setElText('cancel-btn', METINLER.iptalButonu);
  setElText('download-btn-text', METINLER.indirButonu);
  setElText('ios-fallback-link', METINLER.yenisekmeYardim);
  setElText('reset-btn', METINLER.yeniDosyaButonu);
  setElText('privacy-note', METINLER.gizlilikNotu);
  setElText('copyright-note', METINLER.telifUyarisi);
  setElText('theme-switcher-label', METINLER.temaSeciciEtiket);

  cevirButonMetniniGuncelle();
}

function cevirButonMetniniGuncelle() {
  const btn = document.getElementById('convert-btn');
  if (!btn) return;
  if (seciliFormat.format === 'mp3') {
    btn.textContent = METINLER.cevirButonu;
  } else {
    btn.textContent = `${seciliFormat.uzanti.toUpperCase()} Formatına Çevir`;
  }
}

/* ==========================================================================
   2. AÇIK / KOYU MOD (SAĞ ÜST AMPUL) VE EDİTORYAL TEMA YÖNETİMİ
   ========================================================================== */
function temaBaslat() {
  const kayitliTema = localStorage.getItem('eforsuz_theme');
  const sistemKoyuMu = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const baslangicTema = kayitliTema || (sistemKoyuMu ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', baslangicTema);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('eforsuz_theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });

  const lampBtn = document.getElementById('lamp-toggle');
  if (lampBtn) {
    lampBtn.addEventListener('click', () => {
      // Kordon çekilme animasyonu (5px aşağı inip yumuşakça yukarı çıkma)
      lampBtn.classList.add('is-pulled');
      setTimeout(() => {
        lampBtn.classList.remove('is-pulled');
      }, 220);

      const mevcut = document.documentElement.getAttribute('data-theme');
      const yeni = mevcut === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', yeni);
      localStorage.setItem('eforsuz_theme', yeni);
    });
  }

  // Editoryal Minimalizm Yön Seçici (STUDIO NOVA / LINEA DESIGN / MONOQ)
  const kayitliStil = localStorage.getItem('eforsuz_style') || 'studio-nova';
  document.documentElement.setAttribute('data-style', kayitliStil);

  const stilButonlari = document.querySelectorAll('.style-pill');
  stilButonlari.forEach((btn) => {
    if (btn.dataset.style === kayitliStil) {
      btn.classList.add('is-active');
    } else {
      btn.classList.remove('is-active');
    }

    btn.addEventListener('click', () => {
      const secilenStil = btn.dataset.style;
      document.documentElement.setAttribute('data-style', secilenStil);
      localStorage.setItem('eforsuz_style', secilenStil);
      stilButonlari.forEach((b) => b.classList.toggle('is-active', b === btn));
    });
  });
}

/* ==========================================================================
   3. YEREL YARDIMCI SERVİS DURUM KONTROLÜ
   ========================================================================== */
async function yerelServisDurumunuGuncelle() {
  const dot = document.getElementById('companion-dot');
  const text = document.getElementById('companion-status-text');
  if (!dot || !text) return;

  const aktif = await yerelServisKontrolEt();
  if (aktif) {
    dot.classList.add('is-online');
    text.textContent = METINLER.yerelServisAktif;
  } else {
    dot.classList.remove('is-online');
    text.textContent = METINLER.yerelServisPasif;
  }
}

/* ==========================================================================
   4. KALİTE VE FORMAT SEÇENEKLERİNİ OLUŞTURMA
   ========================================================================== */
function kaliteSecenekleriniOlustur() {
  const container = document.getElementById('quality-grid');
  if (!container) return;
  container.innerHTML = '';

  METINLER.formatlar.forEach((fmt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `quality-option ${fmt.id === seciliFormat.id ? 'is-active' : ''}`;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', fmt.id === seciliFormat.id ? 'true' : 'false');

    const titleSpan = document.createElement('span');
    titleSpan.className = 'quality-title';
    titleSpan.textContent = fmt.etiket;

    const descSpan = document.createElement('span');
    descSpan.className = 'quality-desc';
    descSpan.textContent = fmt.aciklama;

    btn.appendChild(titleSpan);
    btn.appendChild(descSpan);

    btn.addEventListener('click', () => {
      if (islemDevamEdiyor) return;
      seciliFormat = fmt;
      container.querySelectorAll('.quality-option').forEach((el) => {
        el.classList.remove('is-active');
        el.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-checked', 'true');
      cevirButonMetniniGuncelle();
    });

    container.appendChild(btn);
  });
}

/* ==========================================================================
   5. MOD GEÇİŞİ (CİHAZDAN DOSYA vs URL BAĞLANTISI)
   ========================================================================== */
function modDegistir(yeniMod) {
  if (islemDevamEdiyor) return;
  aktifMod = yeniMod;

  const tabFile = document.getElementById('tab-file');
  const tabUrl = document.getElementById('tab-url');
  const fileSection = document.getElementById('file-mode-container');
  const urlSection = document.getElementById('url-mode-container');

  hataGoster(null);
  sonucKartiniGizle();

  if (aktifMod === 'file') {
    tabFile.classList.add('is-active');
    tabFile.setAttribute('aria-selected', 'true');
    tabUrl.classList.remove('is-active');
    tabUrl.setAttribute('aria-selected', 'false');

    fileSection.classList.remove('hidden');
    urlSection.classList.add('hidden');

    document.getElementById('convert-btn').disabled = !seciliDosya;
  } else {
    tabUrl.classList.add('is-active');
    tabUrl.setAttribute('aria-selected', 'true');
    tabFile.classList.remove('is-active');
    tabFile.setAttribute('aria-selected', 'false');

    urlSection.classList.remove('hidden');
    fileSection.classList.add('hidden');

    yerelServisDurumunuGuncelle();
    const urlInput = document.getElementById('url-input');
    girilenUrl = urlInput ? urlInput.value.trim() : '';
    document.getElementById('convert-btn').disabled = !gecerliUrlMi(girilenUrl);
  }
}

function gecerliUrlMi(str) {
  if (!str) return false;
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/* ==========================================================================
   6. DOSYA SEÇİMİ VE SÜRÜKLE-BIRAK YÖNETİMİ
   ========================================================================== */
function boyutFormatla(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function dosyaGecerliMi(file) {
  if (!file) return false;
  const parcalar = file.name.split('.');
  const uzanti = parcalar.length > 1 ? parcalar.pop().toLowerCase() : '';
  if (DESTEKLENEN_UZANTILAR.includes(uzanti)) {
    return true;
  }
  if (file.type && (file.type.startsWith('video/') || file.type === 'audio/mp4' || file.type === 'audio/x-m4a')) {
    return true;
  }
  return false;
}

function hataGoster(mesaj) {
  const errBox = document.getElementById('error-banner');
  if (!errBox) return;
  if (!mesaj) {
    errBox.textContent = '';
    errBox.classList.add('hidden');
  } else {
    errBox.textContent = mesaj;
    errBox.classList.remove('hidden');
  }
}

function dosyaSecildi(file) {
  if (!file || islemDevamEdiyor) return;

  hataGoster(null);
  sonucKartiniGizle();

  if (!dosyaGecerliMi(file)) {
    hataGoster(METINLER.hatalar.desteklenmeyenFormat);
    return;
  }

  seciliDosya = file;

  document.getElementById('dropzone').classList.add('hidden');
  const fileCard = document.getElementById('selected-file-card');
  fileCard.classList.remove('hidden');

  document.getElementById('selected-file-name').textContent = file.name;
  document.getElementById('selected-file-size').textContent = boyutFormatla(file.size);

  const warnBox = document.getElementById('large-file-warning');
  if (file.size > BUYUK_DOSYA_SINIRI) {
    warnBox.textContent = METINLER.buyukDosyaUyarisi;
    warnBox.classList.remove('hidden');
  } else {
    warnBox.classList.add('hidden');
  }

  document.getElementById('convert-btn').disabled = false;
}

function tumGirdileriSifirla() {
  seciliDosya = null;
  girilenUrl = '';

  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.value = '';

  const urlInput = document.getElementById('url-input');
  if (urlInput) urlInput.value = '';

  document.getElementById('selected-file-card').classList.add('hidden');
  document.getElementById('large-file-warning').classList.add('hidden');
  document.getElementById('dropzone').classList.remove('hidden');
  document.getElementById('convert-btn').disabled = true;
  document.getElementById('convert-btn').classList.remove('hidden');

  hataGoster(null);
  sonucKartiniGizle();
}

function sonucKartiniGizle() {
  const resultCard = document.getElementById('result-card');
  resultCard.classList.add('hidden');
  const audioPreview = document.getElementById('audio-preview');
  if (audioPreview) {
    audioPreview.pause();
    audioPreview.removeAttribute('src');
  }
  if (aktifBlobUrl) {
    URL.revokeObjectURL(aktifBlobUrl);
    aktifBlobUrl = null;
  }
}

/* ==========================================================================
   7. DÖNÜŞTÜRME AKIŞI (HEM DOSYA HEM URL İÇİN)
   ========================================================================== */
function ciktiDosyaAdiOlustur(orijinalAd, hedefUzanti) {
  const noktaIndeksi = orijinalAd.lastIndexOf('.');
  const tabanAd = noktaIndeksi > 0 ? orijinalAd.substring(0, noktaIndeksi) : orijinalAd;
  return `${tabanAd}.${hedefUzanti}`;
}

async function donusumuBaslat() {
  if (islemDevamEdiyor) return;

  if (aktifMod === 'file' && !seciliDosya) return;
  if (aktifMod === 'url' && !gecerliUrlMi(girilenUrl)) {
    hataGoster(METINLER.hatalar.gecersizUrl);
    return;
  }

  islemDevamEdiyor = true;
  kullaniciIptalEtti = false;
  hataGoster(null);
  sonucKartiniGizle();

  const convertBtn = document.getElementById('convert-btn');
  const changeFileBtn = document.getElementById('change-file-btn');
  const progressCard = document.getElementById('progress-card');
  const progressStatus = document.getElementById('progress-status');
  const progressPercent = document.getElementById('progress-percent');
  const progressFill = document.getElementById('progress-fill');

  convertBtn.classList.add('hidden');
  changeFileBtn.disabled = true;
  progressCard.classList.remove('hidden');

  progressStatus.textContent = METINLER.donusturuluyor;
  progressPercent.textContent = '%0';
  progressFill.style.width = '0%';

  try {
    let islenecekDosya = seciliDosya;

    // Eğer URL modundaysak önce URL'deki medyayı (Yöntem 1 veya Yöntem 4 ile) çek
    if (aktifMod === 'url') {
      progressStatus.textContent = METINLER.urlCozumleniyor;
      progressPercent.textContent = '...';
      progressFill.style.width = '12%';

      islenecekDosya = await urldenMedyaGetir(girilenUrl, {
        onDownloadProgress: (indirilenYuzde) => {
          progressStatus.textContent = METINLER.urlCozumleniyor;
          progressPercent.textContent = `%${indirilenYuzde}`;
          progressFill.style.width = `${Math.max(10, Math.round(indirilenYuzde * 0.45))}%`;
        }
      });
    }

    if (kullaniciIptalEtti) return;

    const sesBlob = await videoyuSeseCevir(islenecekDosya, seciliFormat, {
      onEngineLoading: () => {
        progressStatus.textContent = METINLER.motorYukleniyor;
      },
      onProgress: (yuzde) => {
        progressStatus.textContent = METINLER.donusturuluyor;
        const gosterilecekYuzde = aktifMod === 'url' ? 45 + Math.round(yuzde * 0.55) : yuzde;
        progressPercent.textContent = `%${gosterilecekYuzde}`;
        progressFill.style.width = `${gosterilecekYuzde}%`;
      }
    });

    if (kullaniciIptalEtti) return;

    progressFill.style.width = '100%';
    progressPercent.textContent = '%100';
    progressCard.classList.add('hidden');

    aktifBlobUrl = URL.createObjectURL(sesBlob);
    const yeniDosyaAdi = ciktiDosyaAdiOlustur(islenecekDosya.name, seciliFormat.uzanti);

    const resultCard = document.getElementById('result-card');
    document.getElementById('result-badge').textContent = METINLER.tamamlandi;
    document.getElementById('result-filename').textContent = `${yeniDosyaAdi} (${boyutFormatla(sesBlob.size)})`;

    const downloadLink = document.getElementById('download-link');
    downloadLink.href = aktifBlobUrl;
    downloadLink.download = yeniDosyaAdi;

    const fallbackLink = document.getElementById('ios-fallback-link');
    fallbackLink.href = aktifBlobUrl;

    const audioPreview = document.getElementById('audio-preview');
    audioPreview.src = aktifBlobUrl;

    resultCard.classList.remove('hidden');
  } catch (err) {
    progressCard.classList.add('hidden');
    convertBtn.classList.remove('hidden');

    if (kullaniciIptalEtti || String(err?.message).includes('ABORTED')) {
      hataGoster(METINLER.iptalEdildi);
      return;
    }

    const hataMesaji = String(err?.message || err || '');
    if (hataMesaji.includes('COMPANION_REQUIRED')) {
      hataGoster(METINLER.hatalar.yerelServisGerekli);
    } else if (hataMesaji.includes('URL_FETCH_FAILED') || hataMesaji.includes('URL_EXTRACT_FAILED')) {
      hataGoster(METINLER.hatalar.urlCekilemedi);
    } else if (hataMesaji.includes('ENGINE_LOAD_FAILED')) {
      hataGoster(METINLER.hatalar.motorYuklemeHatasi);
    } else if (
      err instanceof RangeError ||
      hataMesaji.toLowerCase().includes('memory') ||
      hataMesaji.toLowerCase().includes('oom') ||
      hataMesaji.toLowerCase().includes('allocation')
    ) {
      hataGoster(METINLER.hatalar.bellekYetersiz);
    } else if (hataMesaji.includes('CORRUPT_OR_NO_AUDIO')) {
      hataGoster(METINLER.hatalar.bozukDosya);
    } else {
      hataGoster(METINLER.hatalar.genelHata);
    }
  } finally {
    islemDevamEdiyor = false;
    changeFileBtn.disabled = false;
  }
}

/* ==========================================================================
   8. OLAY DİNLEYİCİLERİ VE PWA KAYDI
   ========================================================================== */
function olaylariBagla() {
  const tabFile = document.getElementById('tab-file');
  const tabUrl = document.getElementById('tab-url');
  const urlInput = document.getElementById('url-input');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const changeFileBtn = document.getElementById('change-file-btn');
  const convertBtn = document.getElementById('convert-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const resetBtn = document.getElementById('reset-btn');

  tabFile.addEventListener('click', () => modDegistir('file'));
  tabUrl.addEventListener('click', () => modDegistir('url'));

  urlInput.addEventListener('input', (e) => {
    girilenUrl = e.target.value.trim();
    hataGoster(null);
    convertBtn.disabled = !gecerliUrlMi(girilenUrl);
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && gecerliUrlMi(girilenUrl) && !islemDevamEdiyor) {
      e.preventDefault();
      donusumuBaslat();
    }
  });

  dropzone.addEventListener('click', () => {
    if (!islemDevamEdiyor) fileInput.click();
  });

  dropzone.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !islemDevamEdiyor) {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) dosyaSecildi(file);
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!islemDevamEdiyor) dropzone.classList.add('is-dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('is-dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (islemDevamEdiyor) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) dosyaSecildi(file);
  });

  changeFileBtn.addEventListener('click', () => {
    if (!islemDevamEdiyor) {
      tumGirdileriSifirla();
      fileInput.click();
    }
  });

  convertBtn.addEventListener('click', donusumuBaslat);

  cancelBtn.addEventListener('click', () => {
    if (!islemDevamEdiyor) return;
    kullaniciIptalEtti = true;
    donusumuIptalEt();
    islemDevamEdiyor = false;
    document.getElementById('progress-card').classList.add('hidden');
    document.getElementById('convert-btn').classList.remove('hidden');
    document.getElementById('change-file-btn').disabled = false;
    hataGoster(METINLER.iptalEdildi);
  });

  resetBtn.addEventListener('click', () => {
    tumGirdileriSifirla();
    if (aktifMod === 'url') {
      document.getElementById('url-input')?.focus();
    }
  });
}

function pwaKaydet() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  metinleriYukle();
  temaBaslat();
  kaliteSecenekleriniOlustur();
  olaylariBagla();
  yerelServisDurumunuGuncelle();
  pwaKaydet();
});
