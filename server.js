const port = process.env.PORT || 3000; 

app.listen(port, '0.0.0.0', () => {
    console.log(`Serveur d'acquisition prêt sur le port ${port}`);
});
