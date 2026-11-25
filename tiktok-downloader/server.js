const express = require('express');
const path = require('path');
const Tiktok = require('@tobyg74/tiktok-api-dl');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Cho phép App APK và Google AI Studio gọi API từ domain khác (CORS)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Phục vụ các file tĩnh (HTML, CSS, JS) trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

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

        let videoUrl = null;
        if (r.type === 'video') {
          if (Array.isArray(r.video?.playAddr)) videoUrl = r.video.playAddr[0];
          else if (typeof r.video?.playAddr === 'string') videoUrl = r.video.playAddr;
          else if (r.videoHD) videoUrl = r.videoHD;
          else if (r.videoSD) videoUrl = r.videoSD;
          else if (r.video) videoUrl = r.video;
        }

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
      // Thử version tiếp theo nếu lỗi
    }
  }

  res.status(500).json({
    success: false,
    message: 'Không thể tải video từ link này (có thể video riêng tư hoặc bị chặn).'
  });
});

// Endpoint trung gian ép trình duyệt/app tải thẳng file về máy
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
