// Définition du port dynamique (Render injecte la variable PORT)
const port = process.env.PORT || 3000;

// IMPORTANT : On ajoute '0.0.0.0' pour être visible sur le réseau Render
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Serveur validé et actif sur le port ${port}`);
});
