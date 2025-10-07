# 🚀 Hướng Dẫn Deploy Backend Service Lên Vercel

## 📋 Mục Lục
1. [Chuẩn Bị](#chuẩn-bị)
2. [Push Code Lên GitHub](#push-code-lên-github)
3. [Deploy Lên Vercel](#deploy-lên-vercel)
4. [Kiểm Tra Service](#kiểm-tra-service)
5. [Cập Nhật Plugin Obsidian](#cập-nhật-plugin-obsidian)
6. [Troubleshooting](#troubleshooting)

---

## 🛠️ Chuẩn Bị

### 1. Kiểm Tra Cấu Trúc Project

Project của bạn phải có cấu trúc sau:

```
English_v2/
├── api/
│   └── english-service.py      ✅ File backend Python
├── requirements.txt             ✅ Python dependencies
├── vercel.json                  ✅ Vercel config
├── .gitignore                   ✅ Ignore files thừa
├── main.js                      📱 Plugin Obsidian
├── manifest.json                📱 Plugin manifest
├── styles.css                   📱 Plugin styles
└── README.md                    📄 Documentation
```

### 2. Kiểm Tra Files Cần Thiết

**File `api/english-service.py`** phải có:
- ✅ Flask app với CORS enabled
- ✅ Endpoints: `/api/health`, `/api/cambridge-audio`, `/api/audio-proxy`
- ✅ Handler function cho Vercel: `def handler(environ, start_response)`

**File `requirements.txt`** phải có:
```txt
flask==3.0.0
flask-cors==4.0.0
requests==2.31.0
beautifulsoup4==4.12.2
lxml==4.9.3
```

**File `vercel.json`** phải đúng:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/english-service.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/english-service.py"
    },
    {
      "src": "/(.*)",
      "dest": "api/english-service.py"
    }
  ],
  "env": {
    "PYTHON_VERSION": "3.11"
  }
}
```

**File `.gitignore`** phải có:
```gitignore
node_modules/
.env
*.pyc
__pycache__/
.venv/
venv/
.vercel
.DS_Store
```

---

## 📤 Push Code Lên GitHub

### Bước 1: Tạo Repository Trên GitHub

1. Vào https://github.com/new
2. Đặt tên repo: `english-dictionary-backend` (hoặc tên gì cũng được)
3. Chọn **Public** (nếu muốn deploy miễn phí trên Vercel)
4. **KHÔNG** chọn "Add a README" (vì code đã có rồi)
5. Click **Create repository**

### Bước 2: Push Code Từ Terminal

Mở terminal trong folder `English_v2` và chạy:

```bash
# 1. Khởi tạo git (nếu chưa có)
git init

# 2. Add tất cả files
git add .

# 3. Commit
git commit -m "Initial commit: English Dictionary Backend v2.0"

# 4. Add remote (thay YOUR_USERNAME bằng username GitHub của bạn)
git remote add origin https://github.com/YOUR_USERNAME/english-dictionary-backend.git

# 5. Push lên GitHub
git branch -M main
git push -u origin main
```

**Lưu ý**: Nếu GitHub yêu cầu đăng nhập:
- Username: `your_github_username`
- Password: Dùng **Personal Access Token** (không phải password thường)
  - Tạo token tại: https://github.com/settings/tokens
  - Chọn scope: `repo` (full control)

### Bước 3: Verify Trên GitHub

1. Vào repo của bạn: `https://github.com/YOUR_USERNAME/english-dictionary-backend`
2. Kiểm tra các file:
   - ✅ Có folder `api/` với file `english-service.py`
   - ✅ Có file `requirements.txt`
   - ✅ Có file `vercel.json`
   - ✅ KHÔNG có folder `__pycache__`, `.env`, `node_modules`

---

## 🌐 Deploy Lên Vercel

### Bước 1: Tạo Tài Khoản Vercel

1. Vào https://vercel.com/signup
2. Chọn **Continue with GitHub**
3. Authorize Vercel truy cập GitHub của bạn

### Bước 2: Import Project

1. Vào Dashboard: https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Click **Import** bên cạnh repo `english-dictionary-backend`
4. Click **Import**

### Bước 3: Configure Project

**Framework Preset**: 
- Chọn **Other** (không phải Next.js, Vite, etc.)

**Root Directory**:
- Để mặc định: `./` (root)

**Build & Output Settings**:
- Để mặc định, Vercel sẽ tự detect Python

**Environment Variables**:
- Không cần (service này không dùng .env)

### Bước 4: Deploy

1. Click **Deploy**
2. Đợi 1-2 phút (Vercel sẽ build + deploy)
3. Thấy 🎉 **Congratulations!** là thành công

### Bước 5: Lấy URL Production

Sau khi deploy xong, bạn sẽ thấy:

```
https://english-dictionary-backend.vercel.app
```

Hoặc dạng:
```
https://english-dictionary-backend-xxx.vercel.app
```

**Copy URL này!** Bạn sẽ dùng nó trong plugin Obsidian.

---

## ✅ Kiểm Tra Service

### Test 1: Health Check

Mở browser và truy cập:

```
https://YOUR_VERCEL_URL.vercel.app/api/health
```

**Kết quả mong đợi**:
```json
{
  "status": "ok",
  "service": "English Dictionary Pro Backend",
  "version": "2.0.0"
}
```

### Test 2: Cambridge Audio API

Test với từ "hello":

```
https://YOUR_VERCEL_URL.vercel.app/api/cambridge-audio?word=hello
```

**Kết quả mong đợi**:
```json
{
  "success": true,
  "word": "hello",
  "audio_url": "https://dictionary.cambridge.org/...",
  "accent": "UK",
  "source": "cambridge_html"
}
```

### Test 3: Root Endpoint

```
https://YOUR_VERCEL_URL.vercel.app/
```

**Kết quả mong đợi**: JSON documentation của API

---

## 🔌 Cập Nhật Plugin Obsidian

### Bước 1: Mở Settings trong Obsidian

1. Mở Obsidian
2. Settings → Community plugins → English Dictionary Pro
3. Tìm mục **Backend URL**

### Bước 2: Thay Đổi URL

**Từ** (local):
```
http://localhost:6789
```

**Sang** (production):
```
https://YOUR_VERCEL_URL.vercel.app
```

**Lưu ý**: 
- ✅ Dùng `https://` (không phải `http://`)
- ✅ KHÔNG có dấu `/` ở cuối
- ✅ Thay `YOUR_VERCEL_URL` bằng URL thật của bạn

### Bước 3: Test Plugin

1. Mở note trong Obsidian
2. Bôi đen từ "hello"
3. Nhấn `Ctrl/Cmd + Shift + L` (hoặc command lookup)
4. Kiểm tra:
   - ✅ Có definition từ AI
   - ✅ Có audio phát được
   - ✅ Thời gian lookup ~2-3 giây

**Nếu lỗi**: Xem phần [Troubleshooting](#troubleshooting)

---

## 🐛 Troubleshooting

### Lỗi 1: 404 Not Found khi truy cập `/api/health`

**Nguyên nhân**: 
- File `english-service.py` không ở đúng chỗ
- File `vercel.json` config sai

**Giải pháp**:
1. Kiểm tra cấu trúc:
   ```
   api/
     └── english-service.py  ✅ Phải ở trong folder api/
   ```

2. Kiểm tra `vercel.json`:
   ```json
   "builds": [
     {
       "src": "api/english-service.py",  ✅ Phải có api/
       "use": "@vercel/python"
     }
   ]
   ```

3. Re-deploy:
   ```bash
   git add .
   git commit -m "Fix: Move service to api/ folder"
   git push
   ```
   Vercel sẽ tự động deploy lại.

### Lỗi 2: 500 Internal Server Error

**Nguyên nhân**: 
- Thiếu dependencies trong `requirements.txt`
- Code Python có lỗi syntax

**Giải pháp**:
1. Check logs trên Vercel:
   - Vào Dashboard → Project → Deployments
   - Click vào deployment mới nhất
   - Xem tab **Functions**
   - Click vào function → Xem Logs

2. Kiểm tra `requirements.txt` có đủ:
   ```txt
   flask==3.0.0
   flask-cors==4.0.0
   requests==2.31.0
   beautifulsoup4==4.12.2
   lxml==4.9.3
   ```

3. Test local trước:
   ```bash
   cd English_v2
   python3 -m venv venv
   source venv/bin/activate  # Linux/Mac
   # hoặc: venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   python api/english-service.py
   ```
   Mở browser: http://localhost:6789/api/health

### Lỗi 3: Plugin Obsidian báo "Failed to fetch"

**Nguyên nhân**:
- Backend URL sai
- CORS không enabled
- Internet bị chặn

**Giải pháp**:
1. Kiểm tra URL trong Settings:
   - ✅ `https://your-app.vercel.app` (không có `/` cuối)
   - ❌ `http://your-app.vercel.app` (sai protocol)
   - ❌ `https://your-app.vercel.app/` (có `/` cuối)

2. Test backend trực tiếp:
   ```
   curl https://your-app.vercel.app/api/health
   ```

3. Check CORS trong code:
   ```python
   from flask_cors import CORS
   app = Flask(__name__)
   CORS(app)  ✅ Phải có dòng này
   ```

### Lỗi 4: Vercel Build Failed

**Nguyên nhân**:
- Python version không tương thích
- Syntax error trong code

**Giải pháp**:
1. Check build logs trên Vercel
2. Đảm bảo `vercel.json` có:
   ```json
   "env": {
     "PYTHON_VERSION": "3.11"
   }
   ```

3. Test code local:
   ```bash
   python3 --version  # Phải >= 3.9
   python3 api/english-service.py
   ```

### Lỗi 5: Audio không phát

**Nguyên nhân**:
- Cambridge chặn requests
- Audio proxy lỗi

**Giải pháp**:
1. Test endpoint:
   ```
   https://your-app.vercel.app/api/cambridge-audio?word=hello
   ```
   Phải return JSON với `audio_url`

2. Nếu `source: "Google"` → Cambridge bị block, dùng Google TTS (vẫn OK)

3. Test audio proxy:
   ```
   https://your-app.vercel.app/api/audio-proxy?url=AUDIO_URL
   ```

### Lỗi 6: Timeout / Slow Response

**Nguyên nhân**:
- Vercel cold start (10-15s lần đầu)
- Cambridge server chậm

**Giải pháp**:
1. **Chấp nhận cold start**: Lần tra từ đầu tiên sẽ chậm, sau đó nhanh hơn
2. Dùng Vercel Pro ($20/tháng) để giảm cold start
3. Thêm caching trong code (future improvement)

---

## 🔄 Update Service (Sau Khi Deploy)

Khi bạn sửa code và muốn deploy lại:

```bash
# 1. Sửa code trong api/english-service.py
# 2. Commit changes
git add .
git commit -m "Update: Description of changes"

# 3. Push lên GitHub
git push

# 4. Vercel tự động deploy lại (1-2 phút)
```

**Không cần làm gì trên Vercel**, nó tự động detect changes và deploy!

---

## 📊 Monitoring & Logs

### Xem Logs Realtime

1. Vào Vercel Dashboard
2. Click vào project
3. Tab **Functions** → Click vào function
4. Tab **Logs** → Xem realtime logs

### Xem Analytics

- Tab **Analytics**: Request count, response time, errors
- Tab **Usage**: Bandwidth, function execution time

---

## 🎯 Checklist Cuối Cùng

Trước khi deploy:

- [ ] File `api/english-service.py` tồn tại
- [ ] File `requirements.txt` đầy đủ dependencies
- [ ] File `vercel.json` config đúng (`src: "api/english-service.py"`)
- [ ] File `.gitignore` có `.env`, `__pycache__`, `venv/`
- [ ] Code không có syntax errors
- [ ] Test local thành công (`python api/english-service.py`)

Sau khi deploy:

- [ ] `/api/health` return status OK
- [ ] `/api/cambridge-audio?word=hello` return audio URL
- [ ] Plugin Obsidian settings có URL production
- [ ] Test lookup từ trong Obsidian thành công
- [ ] Audio phát được

---

## 💡 Tips & Best Practices

### 1. Sử Dụng Custom Domain (Optional)

Nếu bạn có domain (vd: `api.yourdomain.com`):

1. Vào Vercel Dashboard → Project → Settings → Domains
2. Add domain: `api.yourdomain.com`
3. Config DNS theo hướng dẫn
4. Update plugin settings với domain mới

### 2. Environment Variables (Future)

Nếu sau này cần API keys:

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Add key: `GROQ_API_KEY`, value: `your_key`
3. Access trong code:
   ```python
   import os
   api_key = os.environ.get('GROQ_API_KEY')
   ```

### 3. Monitoring Errors

Install error tracking:
```bash
pip install sentry-sdk[flask]
```

Add to code:
```python
import sentry_sdk
sentry_sdk.init(dsn="your_sentry_dsn")
```

### 4. Rate Limiting (Production)

Thêm rate limiting:
```bash
pip install flask-limiter
```

```python
from flask_limiter import Limiter
limiter = Limiter(app, key_func=lambda: request.remote_addr)

@app.route('/api/cambridge-audio')
@limiter.limit("10 per minute")
def cambridge_audio():
    ...
```

---

## 🆘 Cần Trợ Giúp?

### Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Python Runtime**: https://vercel.com/docs/functions/serverless-functions/runtimes/python
- **Flask CORS**: https://flask-cors.readthedocs.io/

### Community

- Vercel Discord: https://vercel.com/discord
- GitHub Issues: Tạo issue trong repo của bạn

---

## 📝 Changelog

### v2.0.0 (2025-10-07)
- ✅ Initial Vercel deployment setup
- ✅ Moved service to `api/` folder
- ✅ Fixed vercel.json configuration
- ✅ Added comprehensive deployment guide

---

**🎉 Chúc bạn deploy thành công!**

Nếu gặp vấn đề gì, check phần [Troubleshooting](#troubleshooting) hoặc xem logs trên Vercel Dashboard.
