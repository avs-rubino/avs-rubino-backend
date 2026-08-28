const express = require('express');
const router = express.Router();
const admin = require("../config/firebase");

const db = admin.firestore();
const collection = db.collection('clinic_content');

// GET all content (Public)
router.get('/', async (req, res) => {
  try {
    const snapshot = await collection.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.setHeader('Cache-Control', 'public, max-age=180, stale-while-revalidate=60');
    res.status(200).json(data);
  } catch (error) {
    console.error("🔥 ERRORE CRITICO NELLA ROTTA GET /public/content:", error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

module.exports = router;
