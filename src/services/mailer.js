const nodemailer = require('nodemailer');

/**
 * Servizio di notifica email per AVS Rubino.
 * Invia notifiche quando nuovi utenti effettuano la registrazione e attendono approvazione.
 */

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Invia email all'amministratore per notificare una nuova richiesta di registrazione.
 * @param {Object} params
 * @param {string} params.email - Email del nuovo utente
 * @param {string} [params.name] - Nome visualizzato del nuovo utente
 * @param {string} params.uid - UID Firebase del nuovo utente
 */
const sendNewUserPendingNotification = async ({ email, name, uid }) => {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 's4kur4mb0@gmail.com';
  const fromAddress = process.env.EMAIL_FROM || '"AVS Rubino - Notifiche" <no-reply@avsrubino.it>';
  const transporter = getTransporter();

  const userDisplayName = name ? `${name} (${email})` : email;
  const registrationDate = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });

  if (!transporter) {
    console.warn(
      `⚠️ [MAILER] Configurazione SMTP non rilevata (SMTP_HOST/USER/PASS assenti). ` +
      `Simulazione invio email a ${adminEmail}: Nuovo utente registrato [${userDisplayName}, UID: ${uid}]`
    );
    return {
      sent: false,
      simulated: true,
      recipient: adminEmail,
    };
  }

  const mailOptions = {
    from: fromAddress,
    to: adminEmail,
    subject: `[AVS Rubino] Nuova richiesta di accesso: ${email}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f766e; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Ambulatorio Veterinario Rubino</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Notifica Nuovo Utente in Attesa di Approvazione</p>
        </div>
        <div style="padding: 24px;">
          <p>Gentile Amministratore,</p>
          <p>Un nuovo utente ha effettuato l'accesso per la prima volta tramite autenticazione Google / Firebase ed è attualmente registrato come <strong>Utente Normale</strong> con <strong>0 permessi</strong> (Zero-Trust):</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 6px;">
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; width: 35%;">Email:</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Nome:</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${name || 'Non specificato'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">UID:</td>
              <td style="padding: 10px; font-family: monospace; font-size: 12px; border-bottom: 1px solid #e2e8f0;">${uid}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Data registrazione:</td>
              <td style="padding: 10px;">${registrationDate} (Europe/Rome)</td>
            </tr>
          </table>
          <p>Per abilitare l'utente o assegnargli il ruolo di <em>Editor</em> o <em>Admin</em>, accedi al pannello di amministrazione e visita la sezione <strong>Gestione Utenti</strong>.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
          Sistema automatico IAM Zero-Trust &bull; AVS Rubino
        </div>
      </div>
    `,
    text: `Un nuovo utente ha effettuato l'accesso ad AVS Rubino: ${userDisplayName} (UID: ${uid}) in data ${registrationDate}. Il profilo è attualmente 'Utente Normale' senza permessi. Accedi al pannello per approvarlo.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 [MAILER] Email di notifica inviata con successo a ${adminEmail}. MessageID: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [MAILER] Errore durante l'invio della notifica email:`, error);
    throw error;
  }
};

module.exports = {
  sendNewUserPendingNotification,
  getTransporter,
};
