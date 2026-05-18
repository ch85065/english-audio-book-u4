const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.static(path.join(__dirname)));
app.use('/published', express.static(path.join(__dirname, 'published')));
app.use(express.json());

// Ensure published directory exists
const publishedDir = path.join(__dirname, 'published');
if (!fs.existsSync(publishedDir)) {
    fs.mkdirSync(publishedDir);
}

// Multer setup for handling audio uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1';
}

app.post('/publish', upload.any(), async (req, res) => {
    try {
        const timestamp = Date.now().toString();
        const bookDir = path.join(publishedDir, timestamp);
        fs.mkdirSync(bookDir);

        const scenes = JSON.parse(req.body.scenesData);
        const files = req.files || [];

        // Save audio files
        files.forEach(file => {
            fs.writeFileSync(path.join(bookDir, file.fieldname), file.buffer);
        });

        // Copy images and CSS to the book directory
        scenes.forEach(scene => {
            const sourceImagePath = path.join(__dirname, scene.image);
            if (fs.existsSync(sourceImagePath)) {
                fs.copyFileSync(sourceImagePath, path.join(bookDir, scene.image));
            }
        });
        
        // Copy CSS
        const cssPath = path.join(__dirname, 'style.css');
        if (fs.existsSync(cssPath)) {
            fs.copyFileSync(cssPath, path.join(bookDir, 'style.css'));
        }

        // Generate index.html for this book
        const playerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Audio Book</title>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
    <style>
        body { margin: 0; padding: 20px; box-sizing: border-box; }
        #app-container { width: 100%; max-width: 800px; margin: 0 auto; position: relative; }
        .glass-panel { padding: 20px; }
        .player-controls { margin-top: 20px; }
    </style>
</head>
<body>
    <div id="app-container">
        <div class="glass-panel player-panel">
            <h2 class="book-title">My Audio Book</h2>
            <div class="book-container">
                <img id="player-image" src="" alt="Story Scene">
            </div>
            <div class="player-controls">
                <button id="player-prev-btn" class="nav-btn"><i class="fa-solid fa-chevron-left"></i></button>
                <button id="player-play-btn" class="action-btn play"><i class="fa-solid fa-play"></i></button>
                <button id="player-next-btn" class="nav-btn"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
        </div>
    </div>
    <script>
        const scenes = ${JSON.stringify(scenes)};
        let currentIndex = 0;
        let currentAudio = new Audio();
        
        const uiImg = document.getElementById('player-image');
        const uiPlayBtn = document.getElementById('player-play-btn');
        const uiPrevBtn = document.getElementById('player-prev-btn');
        const uiNextBtn = document.getElementById('player-next-btn');

        function loadScene() {
            uiImg.src = scenes[currentIndex].image;
            uiPrevBtn.disabled = currentIndex === 0;
            uiNextBtn.disabled = currentIndex === scenes.length - 1;
            uiPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        }

        uiPlayBtn.addEventListener('click', () => {
            if (!currentAudio.paused) {
                currentAudio.pause();
                uiPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                return;
            }
            playCurrent();
        });

        function playCurrent() {
            const scene = scenes[currentIndex];
            if (!scene.audio) {
                uiPlayBtn.innerHTML = '<i class="fa-solid fa-forward"></i>';
                setTimeout(goNext, 3000);
                return;
            }
            uiPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            currentAudio.src = scene.audio;
            currentAudio.play().catch(e => console.error("Playback error:", e));
            currentAudio.onended = () => {
                uiPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                goNext();
            };
        }

        function goNext() {
            if (currentIndex < scenes.length - 1) {
                currentIndex++;
                loadScene();
                playCurrent();
            }
        }

        uiPrevBtn.addEventListener('click', () => {
            currentAudio.pause();
            if (currentIndex > 0) { currentIndex--; loadScene(); }
        });

        uiNextBtn.addEventListener('click', () => {
            currentAudio.pause();
            if (currentIndex < scenes.length - 1) { currentIndex++; loadScene(); }
        });

        loadScene();
    </script>
</body>
</html>`;

        fs.writeFileSync(path.join(bookDir, 'index.html'), playerHtml);

        const localIp = getLocalIpAddress();
        const bookUrl = `http://${localIp}:${PORT}/published/${timestamp}/index.html`;

        // Generate QR Code data URL
        const qrCodeDataUrl = await QRCode.toDataURL(bookUrl);

        res.json({ success: true, url: bookUrl, qrCode: qrCodeDataUrl });
    } catch (err) {
        console.error('Publish error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Local Network access: http://${getLocalIpAddress()}:${PORT}`);
});
