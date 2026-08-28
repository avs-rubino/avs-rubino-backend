const express = require('express');
const router = express.Router();
const admin = require("../config/firebase");
const { validateContent, validateDeleteOverrideByDate, validatePostOverride } = require('../middleware/validate');

const db = admin.firestore();
const collection = db.collection('clinic_content');

// Funzione helper per ottenere la data odierna nel fuso orario di Roma (formato YYYY-MM-DD)
const getRomeDateString = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
};

// GET all content
router.get('/', async (req, res) => {
  try {
    const snapshot = await collection.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (error) {
    console.error("🔥 ERRORE CRITICO NELLA ROTTA GET /content:", error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST new content
router.post('/', validateContent, async (req, res) => {
  try {
    const docRef = await collection.add(req.body);
    res.status(201).json({ id: docRef.id, ...req.body });
  } catch (error) {
    console.error("🔥 ERRORE CRITICO NELLA ROTTA POST /content:", error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// POST /override - Transazione atomica per salvare eccezioni con rimozione automatica conflitti e GC storico
router.post('/override', validatePostOverride, async (req, res) => {
  const { clinicLocation, override } = req.body;

  try {
    const generalInfoSnap = await collection.where('type', '==', 'general_info').limit(1).get();
    
    if (generalInfoSnap.empty) {
      // Crea il documento general_info se non esiste ancora
      const newDoc = {
        type: 'general_info',
        [clinicLocation]: {
          defaults: [],
          overrides: [override],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await collection.add(newDoc);
      return res.status(201).json({
        success: true,
        message: 'Eccezione oraria salvata atomicamente',
        override,
        replacedPrevious: false,
        replacedCount: 0,
        id: docRef.id,
      });
    }

    const docRef = generalInfoSnap.docs[0].ref;
    let conflictingCount = 0;

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) {
        throw new Error('Documento general_info non trovato');
      }

      const data = doc.data();
      const currentLoc = data[clinicLocation] || { defaults: [], overrides: [] };
      const existingOverrides = Array.isArray(currentLoc.overrides) ? currentLoc.overrides : [];

      const today = getRomeDateString();
      const newDateFrom = override.dateFrom;
      const newDateTo = override.dateTo || override.dateFrom;

      // 1. Controllo sovrapposizioni/conflitti: existing.dateFrom <= new.dateTo AND existing.dateTo >= new.dateFrom
      const isConflicting = (existing) => {
        const existFrom = existing.dateFrom;
        const existTo = existing.dateTo || existing.dateFrom;
        if (!existFrom) return false;
        return existFrom <= newDateTo && existTo >= newDateFrom;
      };

      const conflicting = existingOverrides.filter(isConflicting);
      conflictingCount = conflicting.length;
      const remainingOverrides = existingOverrides.filter(o => !isConflicting(o));

      // Inserimento della nuova eccezione
      let updatedOverrides = [...remainingOverrides, override];

      // 2. Routine di Garbage Collection silente dello storico scaduto (se >= 5 scadute, rimuove la più vecchia)
      const isExpired = (item) => {
        const itemEnd = item.dateTo || item.dateFrom;
        return itemEnd && itemEnd < today;
      };

      const expiredItems = updatedOverrides.filter(isExpired);
      if (expiredItems.length >= 5) {
        expiredItems.sort((a, b) => {
          const dateA = a.dateFrom || '';
          const dateB = b.dateFrom || '';
          return dateA.localeCompare(dateB);
        });
        const oldestExpired = expiredItems[0];

        const removeIndex = updatedOverrides.findIndex(o =>
          (oldestExpired.id && o.id === oldestExpired.id) ||
          (o.dateFrom === oldestExpired.dateFrom && o.dateTo === oldestExpired.dateTo && o.startTime === oldestExpired.startTime && o.endTime === oldestExpired.endTime)
        );

        if (removeIndex !== -1) {
          updatedOverrides.splice(removeIndex, 1);
          console.log(`[GC Overrides] Rimossa silente eccezione scaduta più vecchia: ${oldestExpired.dateFrom} (Sede: ${clinicLocation})`);
        }
      }

      transaction.update(docRef, {
        [`${clinicLocation}.overrides`]: updatedOverrides,
        updatedAt: new Date().toISOString(),
      });
    });

    res.status(200).json({
      success: true,
      message: 'Eccezione oraria salvata atomicamente',
      override,
      replacedPrevious: conflictingCount > 0,
      replacedCount: conflictingCount,
    });
  } catch (error) {
    console.error("🔥 ERRORE TRANSAZIONE OVERRIDE:", error);
    res.status(500).json({ error: "Errore durante il salvataggio atomico dell'orario" });
  }
});

// DELETE /override/by-date - Eliminazione transazionale delle eccezioni per una data specifica
router.delete('/override/by-date', validateDeleteOverrideByDate, async (req, res) => {
  const { clinicLocation, date } = req.query;

  try {
    const generalInfoSnap = await collection.where('type', '==', 'general_info').limit(1).get();

    if (generalInfoSnap.empty) {
      return res.status(200).json({
        success: true,
        message: 'Nessun documento orari trovato',
        deletedCount: 0,
        date,
        clinicLocation,
      });
    }

    const docRef = generalInfoSnap.docs[0].ref;
    let deletedCount = 0;

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) {
        throw new Error('Documento general_info non trovato');
      }

      const data = doc.data();
      const currentLoc = data[clinicLocation] || { defaults: [], overrides: [] };
      const existingOverrides = Array.isArray(currentLoc.overrides) ? currentLoc.overrides : [];

      // Filtra rimuovendo tutte le eccezioni il cui intervallo comprende la data specificata
      const remainingOverrides = existingOverrides.filter(o => {
        const from = o.dateFrom;
        const to = o.dateTo || o.dateFrom;
        if (!from) return true;
        const matches = (from <= date && to >= date);
        if (matches) {
          deletedCount++;
          return false;
        }
        return true;
      });

      transaction.update(docRef, {
        [`${clinicLocation}.overrides`]: remainingOverrides,
        updatedAt: new Date().toISOString(),
      });
    });

    res.status(200).json({
      success: true,
      message: `Eliminate ${deletedCount} eccezione/i per la data ${date}`,
      deletedCount,
      date,
      clinicLocation,
    });
  } catch (error) {
    console.error("🔥 ERRORE TRANSAZIONE DELETE OVERRIDE BY DATE:", error);
    res.status(500).json({ error: "Errore durante l'eliminazione dell'eccezione oraria" });
  }
});

// PUT update content
router.put('/:id', validateContent, async (req, res) => {
  try {
    await collection.doc(req.params.id).update(req.body);
    res.status(200).json({ id: req.params.id, ...req.body });
  } catch (error) {
    console.error("🔥 ERRORE CRITICO NELLA ROTTA PUT /content:", error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE content
router.delete('/:id', async (req, res) => {
  try {
    await collection.doc(req.params.id).delete();
    res.status(200).json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error("🔥 ERRORE CRITICO NELLA ROTTA DELETE /content:", error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

module.exports = router;
