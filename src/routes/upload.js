const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const admin = require('../config/firebase');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato file non supportato. Caricare solo immagini JPG, PNG o WEBP.'));
    }
  },
});

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'La dimensione del file supera il limite massimo di 5MB.' });
      }
      return res.status(400).json({ error: `Errore caricamento file: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    const bucket = admin.storage().bucket();
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${req.file.originalname}`;
    const file = bucket.file(fileName);

    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
      resumable: false,
    });

    stream.on('error', (err) => {
      console.error("🔥 ERRORE UPLOAD STREAM:", err);
      res.status(500).json({ error: 'Impossibile caricare il file.' });
    });

    stream.on('finish', async () => {
      // Make file public
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      res.status(200).json({ url: publicUrl });
    });

    stream.end(req.file.buffer);
  } catch (error) {
    console.error("🔥 ERRORE CRITICO NELLA ROTTA POST /upload:", error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

module.exports = router;

