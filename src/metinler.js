/**
 * Site üzerindeki tüm metinler, marka adı, URL ve dosya dönüştürme mesajları
 * buradan tek bir noktadan yönetilir.
 */
export const METINLER = {
  // Marka & Başlık (Adı buradan değiştirdiğinizde tüm sitede güncellenir)
  siteAdi: "Eforsuz",
  sayfaBasligi: "Eforsuz — Videodan ve URL'den sese, eforsuz.",
  baslik: "Videodan sese, eforsuz.",
  altBaslik: "İster cihazından dosya seç, ister YouTube / TikTok / doğrudan video linki yapıştır. Dönüşüm kendi bilgisayarında yapılır.",

  // Tema / Ampul
  ampulAciklama: "Açık / Koyu görünümü değiştir",
  temaSeciciEtiket: "Görsel Stil:",

  // Giriş Modu Sekmeleri (Dosya vs URL)
  sekmeDosya: "Cihazdan Dosya Seç",
  sekmeUrl: "URL / Link Yapıştır",

  // Yerel Yardımcı Durum Rozeti
  yerelServisAktif: "Yerel URL Motoru Aktif (YouTube, TikTok, Instagram, X, Direkt Link)",
  yerelServisPasif: "Sadece Doğrudan Link (.mp4) Modu — Sosyal medya linkleri için bilgisayarınızda 'npm run dev' çalıştırın",

  // URL Giriş Alanı
  urlBaslik: "Video veya Sosyal Medya Bağlantısı",
  urlYerTutucu: "https://www.youtube.com/watch?v=... veya https://.../video.mp4",
  urlIpucu: "YouTube, TikTok, Instagram, X (Twitter), SoundCloud veya doğrudan .mp4/.webm bağlantısı yapıştırabilirsin.",
  urlGetirButonu: "Bağlantıyı Hazırla",
  urlCozumleniyor: "Bağlantıdaki medya akışı çekiliyor...",
  urlHazirEtiket: "URL Medyası Hazır",
  urlTemizleButonu: "Farklı link gir",

  // Dosya Seçim Alanı
  dosyaSecBaslik: "Video Dosyası Seç",
  dosyaSecIpucu: "Buraya sürükleyip bırak veya dokunarak seç",
  desteklenenFormatlar: "MP4, MOV, WEBM, MKV, M4A, AVI",
  dosyaDegistir: "Farklı dosya seç",
  buyukDosyaUyarisi: "Seçtiğin dosya 500 MB üzerinde. Mobil cihazlarda tarayıcı belleği yetmeyebilir, ancak yine de denemeye hazırız.",

  // Kalite ve Format Seçenekleri
  ciktiAyarlariBaslik: "Çıktı Kalitesi ve Formatı",
  formatlar: [
    { id: "mp3-128", etiket: "MP3 · 128 kbps", aciklama: "Küçük boyut", format: "mp3", bitrate: "128k", uzanti: "mp3", mime: "audio/mpeg" },
    { id: "mp3-192", etiket: "MP3 · 192 kbps", aciklama: "Önerilen standart", format: "mp3", bitrate: "192k", uzanti: "mp3", mime: "audio/mpeg", varsayilan: true },
    { id: "mp3-320", etiket: "MP3 · 320 kbps", aciklama: "Yüksek kalite", format: "mp3", bitrate: "320k", uzanti: "mp3", mime: "audio/mpeg" },
    { id: "m4a-aac", etiket: "M4A · AAC", aciklama: "Apple uyumlu", format: "m4a", bitrate: "192k", uzanti: "m4a", mime: "audio/mp4" },
    { id: "wav-pcm", etiket: "WAV · Kayıpsız", aciklama: "Sıkıştırmasız", format: "wav", bitrate: null, uzanti: "wav", mime: "audio/wav" }
  ],

  // Aksiyon Butonları
  cevirButonu: "MP3'e Çevir",
  cevirButonuGenel: "Sese Çevir",
  iptalButonu: "İptal Et",
  indirButonu: "Ses Dosyasını İndir",
  yenisekmeYardim: "İndirme başlamadıysa yeni sekmede aç",
  yeniDosyaButonu: "Yeni Bir Video veya URL Çevir",

  // Durum ve İlerleme Mesajları
  motorYukleniyor: "Ses motoru hazırlanıyor (ilk seferde birkaç saniye sürer)...",
  urlIndiriliyor: "Video/ses akışı bağlantısı alınıyor...",
  donusturuluyor: "Dönüştürülüyor...",
  tamamlandi: "Dönüşüm tamamlandı! Dosyan indirmeye hazır.",
  iptalEdildi: "Dönüşüm işlemi iptal edildi.",

  // Hata Mesajları
  hatalar: {
    desteklenmeyenFormat: "Bu dosya türü desteklenmiyor. Lütfen MP4, MOV, WEBM, MKV, M4A veya AVI uzantılı bir dosya seç.",
    gecersizUrl: "Lütfen http:// veya https:// ile başlayan geçerli bir video bağlantısı gir.",
    urlCekilemedi: "Bu bağlantıdan video alınamadı. Bağlantının herkese açık olduğundan ve yerel yardımcı servisin (npm run dev) çalıştığından emin ol.",
    yerelServisGerekli: "YouTube/TikTok gibi sosyal medya bağlantılarını çekmek için bilgisayarında yerel yardımcı servisin açık olması gerekir (klasörde baslat.bat veya 'npm run dev' çalıştır).",
    bellekYetersiz: "Cihazın tarayıcı belleği bu dosya için yetersiz kaldı. Lütfen daha küçük boyutlu bir video dene veya açık diğer sekmeleri kapat.",
    bozukDosya: "Medya okunamadı, ses kanalı içermiyor veya bozuk olabilir. Lütfen başka bir video veya bağlantı dene.",
    motorYuklemeHatasi: "Dönüştürme motoru yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.",
    genelHata: "Dönüşüm sırasında beklenmeyen bir sorun oluştu. Lütfen tekrar dene."
  },

  // Alt Bilgi (Footer)
  gizlilikNotu: "Gizlilik garantisi: Seçtiğin dosyalar ve URL dönüşümleri tamamen kendi bilgisayarında işlenir; dış sunuculara kayıt edilmez.",
  telifUyarisi: "Yalnızca kendi içeriğini veya dönüştürme hakkın olan dosyaları ve bağlantıları kullan."
};
