const { postOverrideSchema, deleteOverrideByDateSchema } = require('../middleware/validate');

describe('Zod Validation Schemas', () => {
  describe('postOverrideSchema', () => {
    it('Case 1.1: closed: true without times accepted', () => {
      const res = postOverrideSchema.safeParse({
        clinicLocation: 'orariFormia',
        override: {
          dateFrom: '2026-09-02',
          closed: true,
        },
      });
      expect(res.success).toBe(true);
    });

    it('Case 1.2: override with both times accepted', () => {
      const res = postOverrideSchema.safeParse({
        clinicLocation: 'orariFormia',
        override: {
          dateFrom: '2026-09-02',
          startTime: '09:00',
          endTime: '13:00',
        },
      });
      expect(res.success).toBe(true);
    });

    it('Case 1.3: override with only startTime accepted', () => {
      const res = postOverrideSchema.safeParse({
        clinicLocation: 'orariFormia',
        override: {
          dateFrom: '2026-09-02',
          startTime: '10:00',
        },
      });
      expect(res.success).toBe(true);
    });

    it('Case 1.4: override with only endTime accepted', () => {
      const res = postOverrideSchema.safeParse({
        clinicLocation: 'orariSecondoStudio',
        override: {
          dateFrom: '2026-09-02',
          endTime: '12:00',
        },
      });
      expect(res.success).toBe(true);
    });

    it('Case 1.5: override without times and not closed rejected with validation error', () => {
      const res = postOverrideSchema.safeParse({
        clinicLocation: 'orariFormia',
        override: {
          dateFrom: '2026-09-02',
        },
      });
      expect(res.success).toBe(false);
    });

    it('Case 1.6: override with whitespace/empty times rejected', () => {
      const res = postOverrideSchema.safeParse({
        clinicLocation: 'orariFormia',
        override: {
          dateFrom: '2026-09-02',
          startTime: '   ',
          endTime: '',
        },
      });
      expect(res.success).toBe(false);
    });

    it('Case 1.7: impossible calendar dates rejected', () => {
      const resInvalidMonth = postOverrideSchema.safeParse({
        clinicLocation: 'orariFormia',
        override: {
          dateFrom: '2026-99-99',
          closed: true,
        },
      });
      expect(resInvalidMonth.success).toBe(false);

      const resFeb30 = postOverrideSchema.safeParse({
        clinicLocation: 'orariFormia',
        override: {
          dateFrom: '2026-02-30',
          closed: true,
        },
      });
      expect(resFeb30.success).toBe(false);
    });

    it('Case 1.8: impossible times rejected', () => {
      const resHour = postOverrideSchema.safeParse({
        clinicLocation: 'orariFormia',
        override: {
          dateFrom: '2026-09-02',
          startTime: '25:00',
        },
      });
      expect(resHour.success).toBe(false);

      const resMin = postOverrideSchema.safeParse({
        clinicLocation: 'orariFormia',
        override: {
          dateFrom: '2026-09-02',
          startTime: '10:65',
        },
      });
      expect(resMin.success).toBe(false);
    });

    it('Case 1.9: dateTo before dateFrom rejected', () => {
      const res = postOverrideSchema.safeParse({
        clinicLocation: 'orariFormia',
        override: {
          dateFrom: '2026-09-10',
          dateTo: '2026-09-05',
          closed: true,
        },
      });
      expect(res.success).toBe(false);
    });

    it('Case 1.10: endTime <= startTime rejected', () => {
      const res = postOverrideSchema.safeParse({
        clinicLocation: 'orariFormia',
        override: {
          dateFrom: '2026-09-02',
          startTime: '14:00',
          endTime: '10:00',
        },
      });
      expect(res.success).toBe(false);
    });
  });

  describe('deleteOverrideByDateSchema', () => {
    it('valid delete parameters pass', () => {
      const res = deleteOverrideByDateSchema.safeParse({
        clinicLocation: 'orariFormia',
        date: '2026-09-02',
      });
      expect(res.success).toBe(true);
    });

    it('invalid calendar date rejected', () => {
      const res = deleteOverrideByDateSchema.safeParse({
        clinicLocation: 'orariFormia',
        date: '2026-99-99',
      });
      expect(res.success).toBe(false);
    });

    it('invalid clinic location rejected', () => {
      const res = deleteOverrideByDateSchema.safeParse({
        clinicLocation: 'sedeSconosciuta',
        date: '2026-09-02',
      });
      expect(res.success).toBe(false);
    });
  });
});
