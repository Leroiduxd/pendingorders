
require("dotenv").config();
const { ethers } = require("ethers");
const axios = require("axios");

// ——— CONFIGURATION ———
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0xcf98a713a9eb9d4f6dc2fc638cadebd0e0ee0f8b";
const SUPRA_API_URL = process.env.SUPRA_API_URL || "https://proof-production.up.railway.app/get-proof";

const ABI = [
  "event PendingOrderCreated(uint256 indexed orderId, address indexed user, uint256 assetIndex, uint256 usdSize, uint256 leverage, bool isLong, uint256 slPrice, uint256 tpPrice)",
  "function executePendingOrder(uint256 orderId, bytes proof) external",
];

// ——— PROVIDERS ———
const wsProvider = new ethers.WebSocketProvider("wss://testnet.dplabs-internal.com");
const httpProvider = new ethers.JsonRpcProvider("https://testnet.dplabs-internal.com");
const wallet = new ethers.Wallet(PRIVATE_KEY, httpProvider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
const contractWs = contract.connect(wsProvider);

// ——— FILE D'ATTENTE ———
let queue = [];
let processing = false;
let processedOrders = new Set();

// ——— TRAITEMENT DE LA FILE ———
async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;

  const { orderId, assetIndex } = queue.shift();

  if (processedOrders.has(orderId)) {
    console.log(`⚠️ Order ${orderId} déjà traité. Ignoré.`);
    processing = false;
    setImmediate(processQueue);
    return;
  }

  try {
    console.log(`\n⏳ Récupération de la proof depuis l'API Supra...`);
    const res = await axios.post(SUPRA_API_URL, { index: assetIndex });

    if (!res.data || !res.data.proof_bytes) throw new Error("❌ Proof invalide ou manquante");

    const proof = res.data.proof_bytes;
    console.log(`✅ Proof reçue. Envoi de la transaction...`);

    const tx = await contract.executePendingOrder(orderId, proof);
    console.log(`📤 TX envoyée : ${tx.hash}`);
    await tx.wait();
    console.log("✅ Exécution réussie ✅");

    processedOrders.add(orderId);
  } catch (error) {
    console.error("❌ Erreur :", error.message || error);
  }

  processing = false;
  setImmediate(processQueue);
}

// ——— ECOUTE DES EVENTS ———
console.log("📡 En écoute sur PendingOrderCreated...");
contractWs.on("PendingOrderCreated", (orderId, user, assetIndex) => {
  console.log("\n🆕 Nouveau PendingOrderCreated détecté !");
  console.log("📦 Order ID :", orderId.toString());
  console.log("📊 Asset Index :", assetIndex.toString());

  queue.push({
    orderId: Number(orderId),
    assetIndex: Number(assetIndex),
  });

  processQueue();
});
