const admin = require("../config/firebase");

/**
 * Middleware di autenticazione e autorizzazione Zero-Trust.
 * - Verifica la validità dell'ID Token Firebase.
 * - Blocca esplicitamente il ruolo base 'Utente_Normale' (permessi = 0).
 * - Ammette solo i ruoli approvati: 'Super_Admin' e 'Editor_Admin'.
 * - Riserva le operazioni distruttive (DELETE) esclusivamente al 'Super_Admin'.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Token di autenticazione mancante o non valido.' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Paradigma Zero-Trust: 'Utente_Normale' o assenza di ruolo esplicito = 0 permessi
    if (decodedToken.role === 'Utente_Normale') {
      return res.status(403).json({
        error: "Forbidden: Il tuo account è registrato come 'Utente_Normale' (0 permessi). È richiesta l'approvazione di un Super Amministratore.",
      });
    }

    if (decodedToken.role !== 'Super_Admin' && decodedToken.role !== 'Editor_Admin') {
      return res.status(403).json({
        error: 'Forbidden: Ruolo non autorizzato ad accedere alle risorse amministrative.',
      });
    }

    // Blocco delle operazioni distruttive (DELETE) per il ruolo Editor_Admin
    if (decodedToken.role === 'Editor_Admin' && req.method === 'DELETE') {
      return res.status(403).json({
        error: 'Forbidden: Operazione non consentita per il ruolo Editor_Admin. Richiesti privilegi Super_Admin.',
      });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Sessione scaduta o token non valido.' });
  }
};

/**
 * Middleware per proteggere endpoint ad uso esclusivo del Super_Admin (es. gestione utenti e ruoli).
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Super_Admin') {
    return res.status(403).json({
      error: 'Forbidden: Operazione riservata esclusivamente agli utenti con ruolo Super_Admin.',
    });
  }
  next();
};

/**
 * Middleware per verificare l'autenticità del token Firebase senza richiedere ruoli privilegiati.
 * Utilizzato per il flusso di auto-registrazione e notifica iniziale.
 */
const verifyTokenOnly = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Token di autenticazione mancante.' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Token non valido.' });
  }
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requireSuperAdmin = requireSuperAdmin;
module.exports.verifyTokenOnly = verifyTokenOnly;
