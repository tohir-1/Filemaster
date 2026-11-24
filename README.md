# 📁 FileMaster Bot

**Professional free Telegram file converter bot**

Convert PDF, Word, Excel and images completely offline using open-source tools.  
No paid APIs. No cloud conversion services. 100% free stack.

---

## Features

| Feature | Description |
|---------|-------------|
| **PDF → Word** | Convert PDF to DOCX via LibreOffice |
| **Image → PDF** | JPG / PNG / WEBP → single PDF (multi-image, A4/Letter, portrait/landscape) |
| **Merge PDF** | Combine multiple PDFs in order |
| **Compress PDF** | Shrink PDF size with Ghostscript |
| **Word → PDF** | DOC / DOCX → PDF |
| **Excel → PDF** | XLS / XLSX → PDF |
| **Multi-language** | 🇺🇿 Uzbek · 🇷🇺 Russian · 🇬🇧 English |
| **User stats** | Personal conversion counters |
| **Referral system** | Unique invite links |
| **Admin panel** | Users, stats, broadcast, logs |
| **Security** | File type checks, size limits, isolated temp folders, auto cleanup |

---

## Requirements

- **Node.js** 18+
- **LibreOffice** (for Word/Excel/PDF conversions)
- **Ghostscript** (optional, for PDF compression)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)

### Install LibreOffice

**Windows**
1. Download from https://www.libreoffice.org/download/
2. Install with default options
3. Add `C:\Program Files\LibreOffice\program` to PATH (or restart after install)

**Ubuntu / Debian**
```bash
sudo apt update
sudo apt install libreoffice
```

**Fedora**
```bash
sudo dnf install libreoffice
```

### Install Ghostscript (for PDF compression)

**Windows**
- Download from https://www.ghostscript.com/releases/gsdnld.html
- Add to PATH (`gswin64c`)

**Ubuntu / Debian**
```bash
sudo apt install ghostscript
```

---

## Quick Start

```bash
# 1. Clone / extract project
cd FileMasterBot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and put your BOT_TOKEN and ADMIN_ID

# 4. Start
npm start
```

### .env example

```env
BOT_TOKEN=123456:ABC-DEF...
ADMIN_ID=123456789
BOT_USERNAME=YourBotUsername
MAX_FILE_SIZE_MB=20
DATABASE_PATH=./database.sqlite
```

Get your Telegram ID from [@userinfobot](https://t.me/userinfobot).

---

## Project Structure

```
FileMasterBot/
├── src/
│   ├── bot.js              # Telegraf bot entry
│   ├── config/config.js
│   ├── commands/           # /start, /help, /admin
│   ├── handlers/           # document, image, callback
│   ├── services/           # conversion logic
│   ├── database/           # SQLite + users
│   ├── keyboards/
│   ├── middleware/
│   ├── utils/
│   └── locales/            # uz, ru, en
├── temp/                   # temporary files (auto-cleaned)
├── logs/
├── index.js
├── package.json
├── .env.example
└── README.md
```

---

## How conversions work

| Conversion | Tool |
|------------|------|
| PDF → Word | LibreOffice headless (`--convert-to docx`) |
| Word → PDF | LibreOffice headless |
| Excel → PDF | LibreOffice headless |
| Image → PDF | `sharp` + `pdf-lib` |
| Merge PDF | `pdf-lib` |
| Compress PDF | Ghostscript (`/ebook` preset) |

All processing is done **locally** on the machine where the bot runs.

---

## Admin commands

- `/admin` — open admin panel (only for `ADMIN_ID`)
- Statistics, user list, broadcast message, bot status, recent errors

---

## Referral

Every user gets a unique link:

```
https://t.me/BOT_USERNAME?start=TELEGRAM_ID
```

New users who join via the link are counted for the referrer (no self-referral, no duplicates).

---

## Security notes

- Only allowed extensions and MIME types are accepted
- Maximum file size configurable (default 20 MB)
- Each user has an isolated temp folder
- Temp files are deleted after conversion and by a periodic cleanup job
- Shell commands use `execFile` (no shell injection)
- Bot token and admin ID only in `.env`

---

## Limitations (honest)

- **Scanned PDFs** (image-only) convert poorly to Word without OCR. OCR is not included by default (can be added with Tesseract if desired).
- **PDF compression** requires Ghostscript. Without it the compress feature shows a clear error.
- **LibreOffice** must be installed and available in PATH.
- Telegram bots have file size limits (~20 MB for most bots).
- Free hosting (Railway free tier, Render free, etc.) may sleep or have low CPU — heavy conversions can be slow or fail on free plans. Self-hosting on a VPS or home PC is recommended for reliability.

---

## Scripts

```bash
npm start     # production
npm run dev   # with --watch (Node 18+)
```

---

## License

MIT — free for personal and commercial use.

---

Made with ❤️ using only free & open-source technologies.
