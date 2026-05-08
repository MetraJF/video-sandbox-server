const express = require('express');
const http = require('http'); // Requis pour Socket.io
const { Server } = require('socket.io');
const cors = require('cors');
// ... tes autres imports (fs, path)

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Autorise tout le monde à écouter
});

app.use(cors());
app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));

// --- LOGIQUE LIVE ---
app.post('/ingest', (req, res) => {
    // 1. Sauvegarde sur disque (pour le replay enr360 plus tard)
    const tempFilePath = path.join(STORAGE_DIR, 'sandbox_test.webm');
    fs.appendFileSync(tempFilePath, req.body);

    // 2. DIFFUSION LIVE : On envoie le chunk binaire à tous les superviseurs connectés
    io.emit('live-chunk', req.body); 

    res.sendStatus(200);
});

// IMPORTANT : Remplace app.listen par server.listen
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Serveur enr360 Live sur le port ${port}`);
});
