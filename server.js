const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const os = require('os'); // Ajout de l'import OS

const app = express();
const server = http.createServer(app);

// --- CONFIGURATION ---

// Initialisation de Socket.io avec CORS ouvert pour ton interface Superviseur
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());

// Middleware pour recevoir les données binaires brutes (Blob) du téléphone
app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));

// Dossier de stockage pour les vidéos enr360 pointant sur /tmp
const STORAGE_DIR = path.join(os.tmpdir(), 'enr360_storage');
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Variable pour stocker l'en-tête (header) de la vidéo et garantir le décodage live
let sessionHeader = null;

// --- LOGIQUE TEMPS RÉEL (SOCKET.IO) ---

io.on('connection', (socket) => {
    console.log(`🔌 Nouveau superviseur connecté : ${socket.id}`);
    
    // Si un direct est déjà en cours, on envoie immédiatement l'en-tête au nouveau venu
    if (sessionHeader) {
        socket.emit('live-chunk', sessionHeader);
    }

    socket.on('disconnect', () => {
        console.log(`❌ Superviseur déconnecté`);
    });
});

// --- ROUTES API ---

/**
 * Accueil : Test de santé du serveur
 */
app.get('/', (req, res) => {
    res.send('🚀 Serveur enr360 (Live & Archive) est opérationnel.');
});

/**
 * Ingestion : Reçoit les octets de l'Agent et les diffuse au Superviseur
 */
app.post('/ingest', (req, res) => {
    const chunk = req.body;
    const tempFilePath = path.join(STORAGE_DIR, 'sandbox_test.webm');

    // 1. On mémorise le tout premier morceau (le header) pour les nouveaux arrivants
    if (!sessionHeader) {
        sessionHeader = chunk;
        console.log("💎 Header capturé");
    }

    // 2. On envoie immédiatement le morceau au superviseur (via RAM, super rapide)
    io.emit('live-chunk', chunk);

    // 3. On libère le téléphone tout de suite pour qu'il puisse envoyer le morceau suivant
    res.sendStatus(200);

    // 4. On écrit sur le disque en mode "non-bloquant" (Asynchrone)
    fs.appendFile(tempFilePath, chunk, (err) => {
        if (err) console.error("⚠️ Erreur écriture disque:", err);
    });
});

/**
 * Nettoyage : Réinitialise la session avant un nouvel enregistrement
 */
app.delete('/api/clear-video', (req, res) => {
    const tempFilePath = path.join(STORAGE_DIR, 'sandbox_test.webm');
    if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
    }
    sessionHeader = null; // Très important : on vide l'en-tête précédent
    console.log("🧹 Session nettoyée, prêt pour un nouvel enr360.");
    res.sendStatus(200);
});

/**
 * Finalisation : Archive la vidéo une fois la visite terminée
 */
app.post('/finalize', (req, res) => {
    const tempPath = path.join(STORAGE_DIR, 'sandbox_test.webm');
    const finalFileName = `enr360_${Date.now()}.webm`;
    const finalPath = path.join(STORAGE_DIR, finalFileName);

    if (fs.existsSync(tempPath)) {
        // On renomme le fichier temporaire en archive finale
        fs.renameSync(tempPath, finalPath);
        
        // On génère l'URL pour le replay
        const videoUrl = `https://${req.get('host')}/videos/${finalFileName}`;
        
        // On réinitialise l'en-tête pour la prochaine session
        sessionHeader = null;
        
        console.log(`📦 Archive créée : ${videoUrl}`);
        res.json({ url: videoUrl });
    } else {
        res.status(404).json({ error: "Aucun flux à finaliser" });
    }
});

/**
 * Lecture : Accès public aux archives vidéo
 */
app.use('/videos', express.static(STORAGE_DIR));

// --- DÉMARRAGE ---

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
    console.log(`✅ Serveur enr360 actif sur le port ${port}`);
});
