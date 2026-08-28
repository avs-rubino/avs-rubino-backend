const { z } = require('zod');

// Schema per gli orari (defaults & overrides)
const scheduleEntrySchema = z.object({
  id: z.string().optional(),
  days: z.array(z.string()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  closed: z.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const scheduleSchema = z.object({
  defaults: z.array(scheduleEntrySchema).optional(),
  overrides: z.array(scheduleEntrySchema).optional(),
});

// Schema generale per i contenuti del sito e la galleria
const contentSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['general_info', 'gallery']),
  avvisi: z.string().optional(),
  orariFormia: z.union([z.string(), scheduleSchema]).optional(),
  orariSecondoStudio: z.union([z.string(), scheduleSchema]).optional(),
  url: z.string().url().optional(), // per elementi gallery
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Schema per la cancellazione delle eccezioni per data (query params)
const deleteOverrideByDateSchema = z.object({
  clinicLocation: z.enum(['orariFormia', 'orariSecondoStudio'], {
    errorMap: () => ({ message: "clinicLocation deve essere 'orariFormia' oppure 'orariSecondoStudio'" }),
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Il parametro date deve essere nel formato YYYY-MM-DD' }),
});

// Schema per l'inserimento/modifica atomica di un'eccezione oraria
const postOverrideSchema = z.object({
  clinicLocation: z.enum(['orariFormia', 'orariSecondoStudio'], {
    errorMap: () => ({ message: "clinicLocation deve essere 'orariFormia' oppure 'orariSecondoStudio'" }),
  }),
  override: z.object({
    id: z.string().optional(),
    closed: z.boolean().optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom deve essere nel formato YYYY-MM-DD' }),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo deve essere nel formato YYYY-MM-DD' }).optional().nullable(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  }),
});

const validateContent = (req, res, next) => {
  try {
    req.body = contentSchema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati inviati non validi', details: err.issues || err.errors });
    }
    return res.status(400).json({ error: 'Errore di validazione del formato dati' });
  }
};

const validateDeleteOverrideByDate = (req, res, next) => {
  try {
    req.query = deleteOverrideByDateSchema.parse(req.query);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Parametri query non validi', details: err.issues || err.errors });
    }
    return res.status(400).json({ error: 'Errore di validazione dei parametri' });
  }
};

const validatePostOverride = (req, res, next) => {
  try {
    req.body = postOverrideSchema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati override non validi', details: err.issues || err.errors });
    }
    return res.status(400).json({ error: 'Errore di validazione del formato dati' });
  }
};

module.exports = {
  validateContent,
  validateDeleteOverrideByDate,
  validatePostOverride,
};

