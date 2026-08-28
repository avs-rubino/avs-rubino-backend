# AVS Rubino - Backend REST API

Microservizio backend Node.js sviluppato con Express.js. Agisce come sorgente dati centralizzata per tutti i client frontend (Web, Admin, Voice PWA), fornendo accesso sicuro in lettura e scrittura a **Google Cloud Firestore** e gestendo gli upload multimediali verso **Google Cloud Storage**.

## 🏛️ Ecosistema AVS Rubino

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

## 🚀 Funzionalità Principali
- **Gestione Contenuti**: Espone API pubbliche per la lettura degli orari e API protette (CRUD) per la scrittura di avvisi ed eccezioni orarie.
- **Transazioni Atomiche (Anti-Lost Update)**:
  - `POST /api/admin/content/override`: Inserimento atomico di eccezioni orarie con **risoluzione automatica dei conflitti/sovrapposizioni** (se l'intervallo si sovrappone a una o più eccezioni esistenti, queste vengono rimosse e sostituite) e **Garbage Collection silente** (se sono presenti $\ge 5$ eccezioni già scadute, la più remota viene rimossa dallo storico senza avvisi per il client).
  - `DELETE /api/admin/content/override/by-date?clinicLocation=...&date=YYYY-MM-DD`: Rimozione transazionale di tutte le eccezioni associate o sovrapposte alla data specificata per la clinica indicata.
- **Gestione Uploads**: Integrazione con `@google-cloud/storage` e `multer` per l'invio sicuro di immagini nella galleria clinica.
- **Autenticazione**: Integrazione nativa con Firebase Admin SDK per la verifica stateless dei token JWT (Bearer).


## 🛡️ Sicurezza & Hardening
- **Helmet:** Protezione header HTTP e rimozione fingerprint framework.
- **CORS Allowlist:** Accesso cross-origin rigorosamente consentito solo ai domini front-end configurati.
- **Rate Limiting:** Prevenzione abusi e attacchi brute-force in-memory.
- **Validazione Payload:** Schema validation stretta utilizzando la libreria `zod`.

## 📋 Prerequisiti
- **Node.js:** v18.x o superiore.
- **Google Cloud SDK (`gcloud`)**: configurato se si necessita operare con l'infrastruttura di deploy.
- **Credenziali Firebase**: File JSON del service account per l'accesso ai DB (default: `admin-key.json` con permessi 0600).

## 🛠️ Avvio Locale

1. Installa i pacchetti Node:
   ```bash
   npm install
   ```

2. Configura le variabili e le chiavi:
   Copia il template fornito e imposta eventuali porte custom.
   ```bash
   cp .env.example .env
   ```
   Posiziona il file `admin-key.json` (credendiali service account) nella root del progetto se vuoi interfacciarti con i servizi Cloud reali in sviluppo. Il file è escluso dal versionamento (`.gitignore`).

3. Avvia il server:
   ```bash
   npm start
   ```
   Il server ascolterà sulla porta specificata in `.env` (default: 5000).

## 🐳 Dockerizzazione e Container
Il progetto è containerizzato per facilitare il rilascio su piattaforme gestite.
```bash
docker build -t avs-rubino-backend .
docker run -p 8080:8080 avs-rubino-backend
```

## 🔄 Deploy (Cloud Run)
Il deployment è completamente delegato alla CI/CD di GitHub Actions (`.github/workflows/deploy.yml`). Ad ogni push sul branch `main`, viene compilata una nuova immagine Docker che viene distribuita in modo immutabile e serverless su **Google Cloud Run** (`europe-west1`). L'identity management in esecuzione è fornito nativamente da Google tramite Application Default Credentials (ADC).
