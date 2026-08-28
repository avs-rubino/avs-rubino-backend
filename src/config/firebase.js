const admin = require('firebase-admin');

/**
 * Inizializzazione Firebase Admin con Application Default Credentials.
 *
 * In Cloud Run:
 * - GOOGLE_CLOUD_PROJECT viene fornito automaticamente dal runtime
 * - Le credenziali vengono fornite dal service account del servizio
 * - Firestore usa il database (default) automaticamente
 * - Storage usa il bucket di default automaticamente
 */
const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'vet-clinics-493413';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId,
  storageBucket: `${projectId}.firebasestorage.app`
});

module.exports = admin;
