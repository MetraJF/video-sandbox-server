const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configuration Socket.io pour le direct
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());

// Augmentation du buffer pour stabiliser la réception des gros morceaux
app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));

const STORAGE_DIR = path.join(__dirname, 'storage');
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Variable critique pour mémoriser l'en-tête de la vidéo
let sessionHeader = null;

// --- GESTION DES CONNEXIONS LIVE ---
io.on('connection', (socket) => {
    console.log(`🔌 Superviseur connecté : ${socket.id}`);
    if (sessionHeader) {
        socket.emit('live-chunk', sessionHeader);
    }
});

// --- ROUTES API ---

app.get('/', (req, res) => {
    res.send('🚀 Serveur enr360 Performance Edition Opérationnel');
});

/**
 * INGESTION : Priorité au Direct, Écriture en arrière-plan
 */
app.post('/ingest', (req, res) => {
    const chunk = req.body;
    const tempFilePath = path.join(STORAGE_DIR, 'sandbox_test.webm');

    // 1. GESTION DU HEADER (Pour le décodage immédiat)
    if (!sessionHeader) {
        sessionHeader = chunk;
        console.log("💎 En-tête de session capturé.");
    }

    // 2. DIFFUSION LIVE (Instantane via RAM)
    io.emit('live-chunk', chunk);

    // 3. RÉPONSE IMMÉDIATE (On libère le téléphone tout de suite)
    res.sendStatus(200);

    // 4. ÉCRITURE DISQUE ASYNCHRONE (Ne bloque pas le serveur)
    fs.appendFile(tempFilePath, chunk, (err) => {
        if (err) console.error("⚠️ Erreur disque (non bloquante):", err);
    });
});

app.delete('/api/clear-video', (req, res) => {
    const tempFilePath = path.join(STORAGE_DIR, 'sandbox_test.webm');
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    sessionHeader = null; 
    console.log("🧹 Session réinitialisée.");
    res.sendStatus(200);
});

app.post('/finalize', (req, res) => {
    const tempPath = path.join(STORAGE_DIR, 'sandbox_test.webm');
    const finalFileName = `enr360_${Date.now()}.webm`;
    const finalPath = path.join(STORAGE_DIR, finalFileName);

    if (fs.existsSync(tempPath)) {
        fs.renameSync(tempPath, finalPath);
        const videoUrl = `https://${req.get('host')}/videos/${finalFileName}`;
        sessionHeader = null;
        res.json({ url: videoUrl });
    } else {
        res.status(404).json({ error: "Flux introuvable" });
    }
});

app.use('/videos', express.static(STORAGE_DIR));

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
    console.log(`✅ Serveur prêt sur le port ${port}`);
});
