# Eforsuz 1 (Video & URL to MP3 Converter)

Hi there

I made this project because I needed a simple tool to convert videos and video links into MP3 directly on my computer without uploading files to online converter websites.

## What it does?
- You can select video files from your computer (mp4, mov, webm, etc.) and turn them into mp3, m4a or wav.
- You can also paste links from YouTube, TikTok, Twitter/X, Instagram or direct video links and it converts them too!
- Everything works locally on your machine. Your files and links are not uploaded to any remote server.
- Has a cool light bulb switch on the top right for dark mode (click it and see the animation haha).

## How to run it on your PC?

First make sure you have Node.js installed on your computer.

1. Clone or download this repo
2. Open terminal in this folder and install dependencies:
```bash
npm install
```

3. Run the app:
```bash
npm run dev
```
*(Or if you are on Windows, you can just double click `baslat.bat` file!)*

4. Open your browser and go to:
`http://localhost:5174`

The local helper server runs automatically in background on port 3001 and handles the link extraction (it downloads `yt-dlp` automatically on first run, so you don't need to configure anything).

## Built With
- Vanilla JavaScript + Vite
- ffmpeg.wasm (@ffmpeg/ffmpeg)
- Node.js (small local helper for url extraction)
- yt-dlp

Hope you like it! Let me know if you find any bugs.
