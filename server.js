
require("dotenv").config();
const express = require("express");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/run", (req, res) => {
  console.log("🚀 Appel reçu sur /run, lancement de railway.js pendant 5 minutes...");
  const process = exec("node railway.js");

  // Arrêt automatique au bout de 5 minutes
  setTimeout(() => {
    process.kill();
    console.log("🛑 Listener arrêté après 5 minutes");
  }, 5 * 60 * 1000);

  res.send("✅ Listener lancé pour 5 minutes.");
});

app.listen(PORT, () => {
  console.log(`✅ Serveur HTTP actif sur le port ${PORT}`);
});
