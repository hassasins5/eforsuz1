# Eforsuz 1 — Videodan ve URL'den Sese, Eforsuz.

**Eforsuz 1**, hem cihazınızdaki video dosyalarını (`MP4`, `MOV`, `WEBM`, `MKV`, `M4A`, `AVI`) hem de yapıştırdığınız **YouTube, TikTok, Instagram, X (Twitter), SoundCloud veya doğrudan `.mp4` bağlantılarını** kendi bilgisayarınızda **MP3** (`128 kbps`, `192 kbps`, `320 kbps`), **M4A** veya **WAV** ses dosyasına dönüştüren hibrit bir web uygulamasıdır.

---

## Mimari (Yöntem 1 + Yöntem 4 Birleşimi)

1. **Cihazdan Dosya Seçimi:** Tamamen tarayıcı içindeki `@ffmpeg/ffmpeg` (single-threaded WebAssembly) motoruyla dönüştürülür.
2. **Doğrudan Medya Linkleri (`.mp4`, `.webm`):** Önce doğrudan tarayıcıdan indirilir, karşı sunucuda CORS engeli varsa yerel CORS vekili (`/api/proxy`) üzerinden tarayıcıya aktarılır.
3. **Sosyal Medya Bağlantıları (YouTube, TikTok, Instagram, X vb.):** Bilgisayarınızda arka planda çalışan hafif Node.js yardımcı servisi (`server/yerel-yardimci.js`, Port `3001`), kendi ev internetinizi ve otomatik kurulan `yt-dlp` motorunu kullanarak videonun en yüksek kaliteli ses akışını çeker ve tarayıcıdaki FFmpeg WASM motoruna iletir. Ev IP'niz kullanıldığı için **YouTube bot engeline veya CAPTCHA'ya takılmaz**.

---

## Kurulum ve Çalıştırma

Klasör içindeki **`baslat.bat`** dosyasına çift tıklayabilir veya terminalden şu komutu çalıştırabilirsiniz:

```bash
cd C:\Users\hasan\Desktop\eforsuz1
npm install
npm run dev
```

`npm run dev` komutu aynı anda:
- `http://127.0.0.1:3001` adresinde **Yerel URL Çözücü Servisi** başlatır (ve ilk çalışmada `bin/yt-dlp.exe` motorunu otomatik indirir),
- `http://localhost:5173` adresinde **Web Arayüzünü** açar.
