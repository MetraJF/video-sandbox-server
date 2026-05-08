const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// 1. Autoriser le téléphone à envoyer des données (CORS)
app.use(cors());

// 2. Accepter les données binaires brutes (Blob)
app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));

// 3. Créer le dossier de stockage s'il n'existe pas
const STORAGE_DIR = path.join(__dirname, 'storage');
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// 4. Route d'accueil pour vérifier que le serveur est vivant
app.get('/', (req, res) => {
    res.send('✅ Serveur VideoSandbox est en ligne !');
});

// 5. Route d'ingestion des vidéos
app.post('/ingest', (req, res) => {
    const filePath = path.join(STORAGE_DIR, 'sandbox_test.webm');
    fs.appendFile(filePath, req.body, (err) => {
        if (err) {
            console.error("Erreur disque:", err);
            return res.status(500).send("Erreur d'écriture");
        }
        console.log(`Chunk reçu : ${req.body.length} octets`);
        res.sendStatus(200);
    });
});

// 6. Rendre les vidéos accessibles en lecture
app.use('/videos', express.static(STORAGE_DIR));

// 7. Démarrage sur le port Render (0.0.0.0 est CRITIQUE)
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Serveur actif sur le port ${port}`);
});
