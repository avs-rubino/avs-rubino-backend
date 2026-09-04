# AVS Rubino - Backend REST API

Microservizio centrale Node.js/Express.js per l'ecosistema AVS Rubino. Gestisce le operazioni di lettura e scrittura su Google Cloud Firestore, gli upload su Google Cloud Storage, l'autenticazione basata su ruoli e le notifiche e-mail di amministrazione.

## Ecosistema AVS Rubino

Questo repository è uno dei 5 moduli dell'ecosistema digitale dell'Ambulatorio Veterinario Specialistico Rubino. Panoramica completa, architettura e flussi: **[github.com/avs-rubino](https://github.com/avs-rubino)**

| Modulo | Ruolo |
|---|---|
| [avs-rubino-frontend](https://github.com/avs-rubino/avs-rubino-frontend) | Portale web pubblico |
| [avs-rubino-admin](https://github.com/avs-rubino/avs-rubino-admin) | Pannello di amministrazione |
| **avs-rubino-backend** | API REST centrale |
| [avs-rubino-voice-api](https://github.com/avs-rubino/avs-rubino-voice-api) | Microservizio NLU vocale |
| [avs-rubino-voice-pwa](https://github.com/avs-rubino/avs-rubino-voice-pwa) | PWA vocale gestione orari |

> **Dipendenze dirette di questo modulo:** [avs-rubino-frontend](https://github.com/avs-rubino/avs-rubino-frontend), [avs-rubino-admin](https://github.com/avs-rubino/avs-rubino-admin), [avs-rubino-voice-pwa](https://github.com/avs-rubino/avs-rubino-voice-pwa) (è il consumato: espone le API a tutti e 3)

---

## Architettura e Funzionalità

- **Runtime**: Node.js (Express.js)
- **Database & Storage**: Google Cloud Firestore, Google Cloud Storage
- **Identity & Access**: Firebase Admin SDK con verifica token JWT e Custom Claims (RBAC: `Super_Admin`, `Editor_Admin`)
- **Validazione Dati**: Schema validation deterministica con Zod
- **Transazioni Atomiche**:
  - `POST /api/admin/content/override`: Inserimento atomico di variazioni orarie con deduplicazione automatica dei conflitti, auto-merge degli orari di default e pulizia delle date trascorse.
  - `DELETE /api/admin/content/override/by-date`: Cancellazione atomica di tutte le eccezioni per data e clinica.
- **Sicurezza**: Protezione header con Helmet, CORS ristretto ai client autorizzati, rate limiting.

## Prerequisiti

- **Node.js**: >= 18.x
- **npm**: >= 8.x
- **Google Cloud Project**: Progetto GCP configurato (`vet-clinics-493413`) o emulatore Firestore locale.
- **Credenziali di Servizio**: File JSON del service account (`admin-key.json`) per l'accesso Cloud in locale.

## Setup Locale

1. Installazione delle dipendenze:
   ```bash
   npm install
   ```

2. Configurazione delle variabili d'ambiente:
   ```bash
   cp .env.example .env
   ```

3. Posizionamento delle credenziali Google Cloud:
   Posizionare `admin-key.json` nella root del modulo (incluso in `.gitignore`) e valorizzare `GOOGLE_APPLICATION_CREDENTIALS` se necessario.

4. Avvio dell'applicazione:
   ```bash
   npm start
   ```
   Il server si avvia sulla porta configurata (default: `5000`).

## Variabili d'Ambiente

| Variabile | Tipo | Descrizione | Default / Esempio | Richiesta |
|---|---|---|---|---|
| `PORT` | Number | Porta di ascolto del server HTTP | `5000` | No |
| `GOOGLE_CLOUD_PROJECT` | String | ID del progetto Google Cloud | `vet-clinics-493413` | Sì |
| `GOOGLE_APPLICATION_CREDENTIALS` | String | Percorso del file chiave service account (dev locale) | `admin-key.json` | No (in prod usa ADC) |
| `SMTP_HOST` | String | Server SMTP per notifiche e-mail | `smtp.gmail.com` | No |
| `SMTP_PORT` | Number | Porta per il servizio SMTP | `587` | No |
| `SMTP_SECURE` | Boolean | Utilizzo TLS diretto (true per porta 465) | `false` | No |
| `SMTP_USER` | String | Nome utente / account SMTP | - | No |
| `SMTP_PASS` | String | Password / App Password del servizio SMTP | - | No |
| `EMAIL_FROM` | String | Mittente visualizzato nelle notifiche | `AVS Rubino <no-reply@avsrubino.it>` | No |
| `ADMIN_NOTIFICATION_EMAIL` | String | Indirizzo e-mail destinatario per notifiche staff | `admin@avsrubino.it` | No |

## Script Disponibili

| Comando | Descrizione |
|---|---|
| `npm start` | Avvia il server Node.js |
| `npm test` | Esegue la suite di test con Vitest in modalità singola run |
| `npm run test:watch` | Avvia i test in modalità osservatore continuo |
| `npm run test:coverage` | Esegue i test e calcola la copertura del codice |

## Testing

La test suite è implementata con **Vitest**:

```bash
npm test
```

Aree coperte:
- `src/__tests__/auth_iam.test.js`: Verifica e decodifica token JWT, controlli RBAC con fallimenti per token invalidi o privilegi insufficienti.
- `src/__tests__/content_helpers.test.js`: Risoluzione conflitti temporali, logica di auto-merge e garbage collection delle eccezioni obsolete.
- `src/__tests__/validation.test.js`: Schemi di validazione Zod su formati data ISO 8601, fasce orarie e consistenza dei payload.

## Containerizzazione e CI/CD

### Docker
```bash
docker build -t avs-rubino-backend .
docker run -p 8080:8080 avs-rubino-backend
```

### Deployment (Google Cloud Run)
Il deployment è automatizzato via GitHub Actions (`.github/workflows/deploy.yml`):
- Ad ogni commit sul branch `main`, il workflow compila l'immagine Docker e rilascia il servizio su **Google Cloud Run** (`europe-west1`).
- L'autenticazione di runtime su Cloud Run sfrutta le Application Default Credentials (ADC) native di GCP.

<!-- ecosystem: avs-rubino -->
