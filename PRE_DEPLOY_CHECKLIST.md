# ✅ Pre-Deploy Checklist

## 📁 Cấu Trúc Files (Verified)

```
English_v2/
├── api/
│   └── english-service.py          ✅ Backend service (đã di chuyển vào api/)
├── .env.example                     ✅ Template cho env variables
├── .gitignore                       ✅ Updated (đầy đủ ignore rules)
├── ANKI_NOTE_TYPE.md               📄 Documentation
├── DEPLOY_GUIDE.md                 📄 Hướng dẫn deploy chi tiết
├── main.js                         📱 Plugin Obsidian
├── manifest.json                   📱 Plugin manifest
├── package.json                    📱 Plugin dependencies
├── README.md                       📄 Project documentation
├── requirements.txt                ✅ Python dependencies
├── styles.css                      📱 Plugin styles
└── vercel.json                     ✅ Vercel config (đã fix)
```

---

## 🔍 Files Đã Kiểm Tra

### ✅ api/english-service.py
- [x] File tồn tại trong folder `api/`
- [x] Có Flask app với CORS enabled
- [x] Có handler function: `def handler(environ, start_response)`
- [x] Endpoints: `/api/health`, `/api/cambridge-audio`, `/api/audio-proxy`
- [x] Root endpoint `/` return API documentation

### ✅ requirements.txt
```txt
flask==3.0.0
flask-cors==4.0.0
requests==2.31.0
beautifulsoup4==4.12.2
lxml==4.9.3
```
- [x] Đầy đủ dependencies
- [x] Versions cụ thể (không dùng `>=`)

### ✅ vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/english-service.py",    ← Đã fix: thêm api/
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/english-service.py"    ← Đã fix: thêm api/
    },
    {
      "src": "/(.*)",
      "dest": "api/english-service.py"    ← Route fallback
    }
  ],
  "env": {
    "PYTHON_VERSION": "3.11"
  }
}
```
- [x] `src` path đúng: `api/english-service.py`
- [x] `dest` path đúng: `api/english-service.py`
- [x] Python version: 3.11

### ✅ .gitignore
- [x] `node_modules/`
- [x] `.env` (quan trọng!)
- [x] `__pycache__/`
- [x] `.venv/`, `venv/`
- [x] `.vercel`
- [x] `*.pyc`, `*.pyo`, `*.pyd`
- [x] `.DS_Store`, `Thumbs.db`
- [x] IDE files (`.vscode/`, `.idea/`)

### ✅ .env.example
- [x] Template cho environment variables
- [x] Comments giải thích từng biến
- [x] Note: Current version không cần API keys

---

## 🚀 Ready to Deploy!

### Quick Deploy Commands

```bash
# 1. Add all changes
git add .

# 2. Commit with descriptive message
git commit -m "Fix: Move service to api/ folder and update vercel.json"

# 3. Push to GitHub
git push origin main
```

### Vercel Auto-Deploy
- Vercel sẽ tự động detect push và deploy (~1-2 phút)
- Check deployment status tại: https://vercel.com/dashboard

---

## 🧪 Post-Deploy Testing

### Test 1: Health Check
```
https://YOUR_VERCEL_URL.vercel.app/api/health
```
**Expected**:
```json
{
  "status": "ok",
  "service": "English Dictionary Pro Backend",
  "version": "2.0.0"
}
```

### Test 2: Cambridge Audio
```
https://YOUR_VERCEL_URL.vercel.app/api/cambridge-audio?word=hello
```
**Expected**:
```json
{
  "success": true,
  "word": "hello",
  "audio_url": "https://...",
  "accent": "UK",
  "source": "cambridge_html"
}
```

### Test 3: Root Endpoint
```
https://YOUR_VERCEL_URL.vercel.app/
```
**Expected**: JSON API documentation

---

## 🔧 Plugin Configuration

After successful deploy, update in Obsidian:

**Settings → English Dictionary Pro → Backend URL**

From:
```
http://localhost:6789
```

To:
```
https://YOUR_VERCEL_URL.vercel.app
```

---

## 📝 Changes Made (2025-10-07)

1. ✅ **Moved** `english-service.py` → `api/english-service.py`
2. ✅ **Updated** `vercel.json`:
   - `src: "api/english-service.py"` (was: `"english-service.py"`)
   - `dest: "api/english-service.py"` (was: `"english-service.py"`)
   - Added fallback route: `"/(.*)" → "api/english-service.py"`
3. ✅ **Enhanced** `.gitignore`:
   - Added Python temp files (`*.pyo`, `*.pyd`)
   - Added IDE folders (`.vscode/`, `.idea/`)
   - Added logs and cache folders
4. ✅ **Created** `DEPLOY_GUIDE.md`:
   - Step-by-step GitHub push instructions
   - Detailed Vercel deployment guide
   - Troubleshooting section (6 common errors)
   - Post-deploy testing checklist
5. ✅ **Created** `.env.example`:
   - Template for future environment variables
   - Currently no keys required

---

## ❓ Nếu Deploy Lỗi

### Lỗi 404 Not Found
→ Check `vercel.json` có `api/` prefix
→ Check folder structure: `api/english-service.py` phải tồn tại

### Lỗi 500 Internal Server Error
→ Check Vercel logs: Dashboard → Deployments → Functions
→ Test local: `python api/english-service.py`
→ Check `requirements.txt` đầy đủ

### Plugin Obsidian "Failed to fetch"
→ Check Backend URL không có `/` cuối
→ Test health check trong browser
→ Check CORS enabled trong code

**Full troubleshooting**: Xem file `DEPLOY_GUIDE.md` phần Troubleshooting

---

## 📚 Documentation Files

1. **DEPLOY_GUIDE.md** - Hướng dẫn deploy chi tiết (GitHub + Vercel)
2. **README.md** - Project overview và features
3. **ANKI_NOTE_TYPE.md** - Anki card structure
4. **PRE_DEPLOY_CHECKLIST.md** (file này) - Quick checklist

---

## ✅ All Set!

**Mọi thứ đã sẵn sàng để deploy!**

Chỉ cần:
1. `git add .`
2. `git commit -m "Fix: Vercel deployment structure"`
3. `git push origin main`

Vercel sẽ tự động deploy trong 1-2 phút. 🚀
