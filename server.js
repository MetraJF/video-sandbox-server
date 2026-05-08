const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// --- CONFIGURATION ---

// Autorise les requêtes provenant de ton application (Agent/Superviseur)
app.use(cors());

// Middleware pour traiter les données binaires brutes (Blob) avec une limite de 100 Mo
app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));

// Dossier de stockage physique pour les vidéos
const STORAGE_DIR = path.join(__dirname, 'storage');

// Création du dossier s'il n'existe pas au démarrage (Indispensable sur Render)
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// --- ROUTES ---

/**
 * Route d'accueil : Vérifie que le serveur est bien "Live"
 */
app.get('/', (req, res) => {
    res.send('✅ Serveur d\'acquisition VideoSandbox en ligne !');
});

/**
 * Route d'Ingestion : Reçoit les segments (chunks) et les ajoute au fichier temporaire
 */
app.post('/ingest', (req, res) => {
    const tempFilePath = path.join(STORAGE_DIR, 'sandbox_test.webm');
    
    // Ajoute (append) les octets reçus à la fin du fichier
    fs.appendFile(tempFilePath, req.body, (err) => {
        if (err) {
            console.error("Erreur lors de l'écriture du segment:", err);
            return res.status(500).send("Erreur d'écriture disque");
        }
        console.log(`Chunk reçu : ${req.body.length} octets`);
        res.sendStatus(200);
    });
});

/**
 * Route de Nettoyage : Supprime le fichier temporaire avant un nouvel enregistrement
 */
app.delete('/api/clear-video', (req, res) => {
    const tempFilePath = path.join(STORAGE_DIR, 'sandbox_test.webm');
    if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log("Fichier temporaire nettoyé.");
    }
    res.sendStatus(200);
});

/**
 * Route de Finalisation : Transforme le flux temporaire en archive permanente
 */
app.post('/finalize', (req, res) => {
    const tempPath = path.join(STORAGE_DIR, 'sandbox_test.webm');
    const finalFileName = `archive_${Date.now()}.webm`;
    const finalPath = path.join(STORAGE_DIR, finalFileName);

    if (fs.existsSync(tempPath)) {
        // Renomme le fichier pour éviter qu'il soit écrasé
        fs.renameSync(tempPath, finalPath);
        
        // Génère l'URL publique de la vidéo
        const videoUrl = `https://${req.get('host')}/videos/${finalFileName}`;
        console.log(`✅ Vidéo finalisée : ${videoUrl}`);
        
        res.json({ 
            success: true, 
            url: videoUrl,
            fileName: finalFileName 
        });
    } else {
        res.status(404).json({ error: "Aucun flux trouvé à finaliser" });
    }
});

/**
 * Serveur Statique : Permet de lire les vidéos via une URL HTTP
 */
app.use('/videos', express.static(STORAGE_DIR));

// --- DÉMARRAGE ---

// Render injecte automatiquement une variable PORT
const port = process.env.PORT || 3000;

// On écoute sur 0.0.0.0 pour être accessible depuis l'extérieur de l'instance
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Serveur prêt et à l'écoute sur le port ${port}`);
});
