const express = require('express');
const router = express.Router();
const { z } = require('zod');
const admin = require('../config/firebase');

const updateRoleSchema = z.object({
  role: z.enum(['Super_Admin', 'Editor_Admin', 'Utente_Normale'], {
    errorMap: () => ({
      message: "Il ruolo selezionato non è valido. Ammessi: 'Super_Admin', 'Editor_Admin', 'Utente_Normale'",
    }),
  }),
});

/**
 * GET /api/admin/users
 * Restituisce l'elenco di tutti gli utenti registrati su Firebase Auth con i relativi ruoli.
 * Riservato a: Super_Admin.
 */
router.get('/', async (req, res, next) => {
  try {
    const listUsersResult = await admin.auth().listUsers(100);
    const users = listUsersResult.users.map((u) => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || '',
      photoURL: u.photoURL || '',
      role: (u.customClaims && u.customClaims.role) ? u.customClaims.role : 'Utente_Normale',
      disabled: u.disabled,
      creationTime: u.metadata.creationTime,
      lastSignInTime: u.metadata.lastSignInTime,
    }));

    // Ordina: prima gli 'Utente_Normale' in attesa di approvazione, poi per data creazione decrescente
    users.sort((a, b) => {
      if (a.role === 'Utente_Normale' && b.role !== 'Utente_Normale') return -1;
      if (a.role !== 'Utente_Normale' && b.role === 'Utente_Normale') return 1;
      return new Date(b.creationTime || 0) - new Date(a.creationTime || 0);
    });

    return res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/users/:uid/role
 * Aggiorna il ruolo (Custom User Claims) di un utente specifico.
 * Riservato a: Super_Admin.
 */
router.put('/:uid/role', async (req, res, next) => {
  try {
    const { uid } = req.params;

    const parseResult = updateRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Dati richiesta non validi',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    const { role } = parseResult.data;

    // Protezione: impedisci all'amministratore di declassare se stesso involontariamente
    if (req.user.uid === uid && role !== 'Super_Admin') {
      return res.status(400).json({
        error: 'Non puoi revocare il ruolo Super_Admin dal tuo stesso account.',
      });
    }

    // Verifica esistenza utente su Firebase Auth
    const userRecord = await admin.auth().getUser(uid);
    if (!userRecord) {
      return res.status(404).json({ error: 'Utente non trovato.' });
    }

    // Aggiorna Custom Claims
    await admin.auth().setCustomUserClaims(uid, {
      ...userRecord.customClaims,
      role,
    });

    return res.status(200).json({
      success: true,
      message: `Ruolo per l'utente ${userRecord.email} aggiornato a '${role}'.`,
      uid,
      role,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/users/:uid
 * Elimina un utente da Firebase Authentication.
 * Riservato a: Super_Admin.
 */
router.delete('/:uid', async (req, res, next) => {
  try {
    const { uid } = req.params;

    // Protezione: impedisci all'amministratore di eliminare se stesso
    if (req.user.uid === uid) {
      return res.status(400).json({
        error: 'Non puoi eliminare il tuo stesso account.',
      });
    }

    await admin.auth().deleteUser(uid);
    return res.status(200).json({
      success: true,
      message: 'Utente rimosso con successo da Firebase Authentication.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
