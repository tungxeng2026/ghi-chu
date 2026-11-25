const express = require('express');
const Tiktok = require('@tobyg74/tiktok-api-dl');

const app = express();
const PORT = 3000;

app.use(express.json());

// Giao diện Web (Frontend)
const htmlPage = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tải Video TikTok Không Logo</title>
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
    body {
      margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #111827, #1f2937); color: #f9fafb; padding: 16px;
    }
    .card {
      width: 100%; max-width: 520px; background: #1f2937; border: 1px solid #374151;
      border-radius: 16px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    h2 { margin: 0 0 8px; text-align: center; font-size: 22px; }
    p.sub { margin: 0 0 20px; text-align: center; color: #9ca3af; font-size: 14px; }
    .input-group { display: flex; gap: 8px; }
    input {
      flex: 1; padding: 12px 14px; border-radius: 10px; border: 1px solid #4b5563;
      background: #111827; color: #fff; font-size: 15px; outline: none;
    }
    input:focus { border-color: #fe2c55; }
    button {
      padding: 12px 20px; border: none; border-radius: 10px; background: #fe2c55;
      color: #fff; font-weight: 600; font-size: 15px; cursor: pointer; transition: 0.2s;
      white-space: nowrap;
    }
    button:hover { background: #e02448; }
    button:disabled { background: #6b7280; cursor: not-allowed; }
    .status { margin-top: 16px; text-align: center; font-size: 14px; min-height: 20px; }
    .error { color: #f87171; }
    .success { color: #34d399; }
    .result-box {
      margin-top: 18px; padding: 14px; background: #111827; border-radius: 10px;
      display: none; flex-direction: column; gap: 10px;
    }
    .desc { font-size: 13px; color: #d1d5db; line-height: 1.4; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-dl {
      flex: 1; text-align: center; padding: 10px; border-radius: 8px; text-decoration: none;
      font-size: 14px; font-weight: 600; color: #fff; background: #10b981;
    }
    .btn-dl.music { background: #3b82f6; }
  </style>
</head>
<body>
  <div class="card">
    <h2>TikTok Downloader</h2>
    <p class="sub">Dán link video TikTok để tải nhanh không dính logo</p>

    <div class="input-group">
      <input type="text" id="urlInput" placeholder="https://tiktok.com..." />
      <button id="fetchBtn" onclick="getVideo()">Download</button>
    </div>

    <div id="status" class="status"></div>

    <div id="resultBox" class="result-box">
      <div id="videoDesc" class="desc"></div>
      <div id="actionButtons" class="actions"></div>
    </div>
  </div>

  <script>
    async function getVideo() {
      const url = document.getElementById('urlInput').value.trim();
      const btn = document.getElementById('fetchBtn');
      const status = document.getElementById('status');
      const resultBox = document.getElementById('resultBox');
      const actionButtons = document.getElementById('actionButtons');
      const videoDesc = document.getElementById('videoDesc');

      if (!url) {
        status.innerHTML = '<span class="error">Vui lòng dán link TikTok vào ô trống!</span>';
        return;
      }

      btn.disabled = true;
      btn.innerText = 'Đang lấy...';
      status.innerHTML = 'Đang phân tích link và tìm nguồn tải...';
      resultBox.style.display = 'none';
      actionButtons.innerHTML = '';

      try {
        const res = await fetch('/api/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Không lấy được video');
        }

        status.innerHTML = '<span class="success">Đã sẵn sàng tải xuống!</span>';
        videoDesc.innerText = data.desc || 'Video TikTok';

        if (data.videoUrl) {
          const dlLink = '/api/download?fileUrl=' + encodeURIComponent(data.videoUrl) + '&type=mp4';
          actionButtons.innerHTML += '<a class="btn-dl" href="' + dlLink + '">⬇ Tải Video MP4</a>';
          // Tự động kích hoạt tải file luôn sau khi nhấn Download
          window.location.href = dlLink;
        }

        if (data.musicUrl) {
          const mp3Link = '/api/download?fileUrl=' + encodeURIComponent(data.musicUrl) + '&type=mp3';
          actionButtons.innerHTML += '<a class="btn-dl music" href="' + mp3Link + '">🎵 Tải Nhạc MP3</a>';
        }

        if (data.images && data.images.length > 0) {
          data.images.forEach((img, idx) => {
            const imgLink = '/api/download?fileUrl=' + encodeURIComponent(img) + '&type=jpg';
            actionButtons.innerHTML += '<a class="btn-dl" href="' + imgLink + '">🖼 Ảnh ' + (idx + 1) + '</a>';
          });
        }

        resultBox.style.display = 'flex';
      } catch (err) {
        status.innerHTML = '<span class="error">Lỗi: ' + err.message + '</span>';
      } finally {
        btn.disabled = false;
        btn.innerText = 'Download';
      }
    }
  </script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.send(htmlPage);
});

// API lấy thông tin và tự động fallback v1 -> v2 -> v3
app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, message: 'Thiếu URL' });

  const versions = ['v1', 'v2', 'v3'];

  for (const version of versions) {
    try {
      const response = await Tiktok.Downloader(url, { version });
      if (response.status === 'success' && response.result) {
        const r = response.result;

        // Trích xuất link video tùy theo cấu trúc trả về của từng version
        let videoUrl = null;
        if (r.type === 'video') {
          if (Array.isArray(r.video?.playAddr)) videoUrl = r.video.playAddr[0];
          else if (typeof r.video?.playAddr === 'string') videoUrl = r.video.playAddr;
          else if (r.videoHD) videoUrl = r.videoHD;
          else if (r.videoSD) videoUrl = r.videoSD;
          else if (r.video) videoUrl = r.video;
        }

        // Trích xuất link nhạc
        let musicUrl = null;
        if (Array.isArray(r.music?.playUrl)) musicUrl = r.music.playUrl[0];
        else if (typeof r.music?.playUrl === 'string') musicUrl = r.music.playUrl;
        else if (typeof r.music === 'string') musicUrl = r.music;

        if (videoUrl || (r.type === 'image' && r.images?.length)) {
          return res.json({
            success: true,
            versionUsed: version,
            desc: r.desc || '',
            videoUrl,
            musicUrl,
            images: r.type === 'image' ? r.images : []
          });
        }
      }
    } catch (e) {
      // Bỏ qua lỗi của version hiện tại để thử version tiếp theo
    }
  }

  res.status(500).json({
    success: false,
    message: 'Không thể tải video từ link này (có thể video riêng tư hoặc bị chặn).'
  });
});

// Endpoint trung gian để ép trình duyệt tải thẳng file về máy thay vì mở tab phát video
app.get('/api/download', async (req, res) => {
  const { fileUrl, type } = req.query;
  if (!fileUrl) return res.status(400).send('Thiếu fileUrl');

  try {
    const response = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) throw new Error('Không thể tải luồng dữ liệu');

    const ext = type === 'mp3' ? 'mp3' : type === 'jpg' ? 'jpg' : 'mp4';
    const contentType = type === 'mp3' ? 'audio/mpeg' : type === 'jpg' ? 'image/jpeg' : 'video/mp4';

    res.setHeader('Content-Disposition', `attachment; filename="tiktok_${Date.now()}.${ext}"`);
    res.setHeader('Content-Type', contentType);

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    res.status(500).send('Lỗi khi tải file: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server đã chạy! Mở trình duyệt tại: http://localhost:${PORT}`);
});
