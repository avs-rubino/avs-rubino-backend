const { z } = require('zod');

// Helper per validare l'esistenza reale di una data nel calendario (evita date impossibili come 2026-99-99 o 2026-02-30)
const isValidDateString = (val) => {
  if (typeof val !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return false;
  }
  const [year, month, day] = val.split('-').map(Number);
  if (year < 2000 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

// Schema atomico per date ISO reali (YYYY-MM-DD)
const isoDateSchema = z.string().refine(isValidDateString, {
  message: 'Data non valida o formato non conforme (atteso YYYY-MM-DD con data esistente nel calendario)',
});

// Schema atomico per orari in formato 24 ore (HH:MM)
const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
  message: 'Orario non valido (atteso formato 24 ore HH:MM, es. 09:30 o 18:00)',
});

// Schema per gli orari (defaults & overrides)
const scheduleEntrySchema = z.object({
  id: z.string().optional(),
  days: z.array(z.string()).optional(),
  startTime: timeStringSchema.optional(),
  endTime: timeStringSchema.optional(),
  closed: z.boolean().optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional().nullable(),
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
  date: isoDateSchema,
});

// Schema per l'inserimento/modifica atomica di un'eccezione oraria
const postOverrideSchema = z.object({
  clinicLocation: z.enum(['orariFormia', 'orariSecondoStudio'], {
    errorMap: () => ({ message: "clinicLocation deve essere 'orariFormia' oppure 'orariSecondoStudio'" }),
  }),
  override: z.object({
    id: z.string().optional(),
    closed: z.boolean().optional(),
    dateFrom: isoDateSchema,
    dateTo: isoDateSchema.optional().nullable(),
    startTime: timeStringSchema.optional(),
    endTime: timeStringSchema.optional(),
  }).superRefine((data, ctx) => {
    if (data.dateTo && data.dateFrom && data.dateTo < data.dateFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La data di fine (dateTo) non può precedere la data di inizio (dateFrom)",
        path: ['dateTo'],
      });
    }

    if (!data.closed) {
      const hasStart = typeof data.startTime === 'string' && data.startTime.trim() !== '';
      const hasEnd = typeof data.endTime === 'string' && data.endTime.trim() !== '';
      if (!hasStart && !hasEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Se l'eccezione non è una chiusura (closed: true), è necessario specificare almeno un orario di inizio (startTime) o di fine (endTime)",
          path: ['startTime'],
        });
      }

      if (hasStart && hasEnd && data.startTime >= data.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "L'orario di chiusura (endTime) deve essere successivo a quello di apertura (startTime)",
          path: ['endTime'],
        });
      }
    }
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
  postOverrideSchema,
  deleteOverrideByDateSchema,
};

