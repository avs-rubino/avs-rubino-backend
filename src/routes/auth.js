const express = require('express');
const router = express.Router();
const admin = require('../config/firebase');
const { verifyTokenOnly } = require('../middleware/auth');
const mailer = require('../services/mailer');

/**
 * POST /api/auth/register-notify
 * Endpoint Zero-Trust per registrare o notificare il primo accesso di un utente.
 * Se l'utente non ha alcun ruolo o è nuovo, gli viene assegnato esplicitamente
 * il ruolo 'Utente_Normale' (0 permessi) e viene inoltrata la notifica email all'admin.
 */
router.post('/register-notify', verifyTokenOnly, async (req, res, next) => {
  try {
    const { uid, email, name } = req.user;
    const currentRole = req.user.role;

    // Se l'utente ha già un ruolo amministrativo approvato
    if (currentRole === 'Super_Admin' || currentRole === 'Editor_Admin') {
      return res.status(200).json({
        status: 'approved',
        role: currentRole,
        message: 'Account già attivo e autorizzato.',
      });
    }

    // Se l'utente ha già il ruolo Utente_Normale
    if (currentRole === 'Utente_Normale') {
      return res.status(200).json({
        status: 'pending',
        role: 'Utente_Normale',
        message: "Account in attesa di approvazione da parte di un Super Amministratore.",
      });
    }

    // Prima registrazione: assegnazione del ruolo 'Utente_Normale' con permessi = 0
    await admin.auth().setCustomUserClaims(uid, { role: 'Utente_Normale' });

    // Invio notifica email all'amministratore
    let notificationStatus = null;
    try {
      notificationStatus = await mailer.sendNewUserPendingNotification({
        email: email || 'Nessuna email',
        name: name || '',
        uid,
      });
    } catch (mailErr) {
      // Non bloccare la registrazione se l'invio mail fallisce, loggare l'errore
      console.error('⚠️ Impossibile recapitare email di notifica admin:', mailErr.message);
    }

    return res.status(201).json({
      status: 'pending',
      role: 'Utente_Normale',
      message: "Registrazione completata con successo con ruolo 'Utente_Normale'. In attesa di approvazione.",
      notification: notificationStatus,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
