/**
 * Middleware centralizzato per la gestione degli errori in Express.
 * Cattura tutte le eccezioni non gestite inoltrate via next(err).
 */
const errorHandler = (err, req, res, next) => {
  // Se gli header HTTP sono già stati inviati, delega a Express
  if (res.headersSent) {
    return next(err);
  }

  // Log dettagliato dell'errore lato server
  console.error(`🔥 [${new Date().toISOString()}] UNHANDLED ERROR su ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || err.status || 500;
  const clientMessage = statusCode < 500 ? (err.message || 'Richiesta non valida') : 'Errore interno del server';

  res.status(statusCode).json({
    error: clientMessage
  });
};

module.exports = errorHandler;
