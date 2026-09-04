const contentRouter = require('../routes/content');
const { getDayKeyFromDateString, mergeOverrideWithDefaults } = contentRouter._helpers;

describe('Content Helpers', () => {
  describe('getDayKeyFromDateString', () => {
    it('correctly resolves all 7 days of the week in Rome timezone', () => {
      expect(getDayKeyFromDateString('2026-08-31')).toBe('lunedi');
      expect(getDayKeyFromDateString('2026-09-01')).toBe('martedi');
      expect(getDayKeyFromDateString('2026-09-02')).toBe('mercoledi');
      expect(getDayKeyFromDateString('2026-09-03')).toBe('giovedi');
      expect(getDayKeyFromDateString('2026-09-04')).toBe('venerdi');
      expect(getDayKeyFromDateString('2026-09-05')).toBe('sabato');
      expect(getDayKeyFromDateString('2026-09-06')).toBe('domenica');
    });
  });

  describe('mergeOverrideWithDefaults', () => {
    const mockDefaults = [
      {
        id: 'def-1',
        days: ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi'],
        startTime: '09:30',
        endTime: '12:30',
        closed: false,
      },
      {
        id: 'def-2',
        days: ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi'],
        startTime: '16:00',
        endTime: '19:30',
        closed: false,
      },
      {
        id: 'def-sat',
        days: ['sabato'],
        startTime: '09:30',
        endTime: '13:00',
        closed: false,
      },
      {
        id: 'def-sun',
        days: ['domenica'],
        closed: true,
      },
    ];

    it('merges morning startTime "10:30" with default endTime "12:30"', () => {
      // 2026-09-03 is Thursday ('giovedi')
      const res = mergeOverrideWithDefaults(
        { dateFrom: '2026-09-03', startTime: '10:30' },
        mockDefaults
      );
      expect(res.startTime).toBe('10:30');
      expect(res.endTime).toBe('12:30');
    });

    it('merges morning endTime "12:00" with default startTime "09:30"', () => {
      const res = mergeOverrideWithDefaults(
        { dateFrom: '2026-09-03', endTime: '12:00' },
        mockDefaults
      );
      expect(res.startTime).toBe('09:30');
      expect(res.endTime).toBe('12:00');
    });

    it('merges afternoon startTime "17:00" with default endTime "19:30"', () => {
      const res = mergeOverrideWithDefaults(
        { dateFrom: '2026-09-03', startTime: '17:00' },
        mockDefaults
      );
      expect(res.startTime).toBe('17:00');
      expect(res.endTime).toBe('19:30');
    });

    it('merges afternoon endTime "18:30" with default startTime "16:00"', () => {
      const res = mergeOverrideWithDefaults(
        { dateFrom: '2026-09-03', endTime: '18:30' },
        mockDefaults
      );
      expect(res.startTime).toBe('16:00');
      expect(res.endTime).toBe('18:30');
    });

    it('preserves closed override untouched', () => {
      const res = mergeOverrideWithDefaults(
        { dateFrom: '2026-09-03', closed: true },
        mockDefaults
      );
      expect(res.closed).toBe(true);
      expect(res.startTime).toBeUndefined();
      expect(res.endTime).toBeUndefined();
    });

    it('preserves fully specified override without altering times', () => {
      const res = mergeOverrideWithDefaults(
        { dateFrom: '2026-09-03', startTime: '10:00', endTime: '14:00' },
        mockDefaults
      );
      expect(res.startTime).toBe('10:00');
      expect(res.endTime).toBe('14:00');
    });

    it('gracefully handles days with no open defaults without crashing', () => {
      // 2026-09-06 is Sunday ('domenica')
      const res = mergeOverrideWithDefaults(
        { dateFrom: '2026-09-06', startTime: '10:00' },
        mockDefaults
      );
      expect(res.startTime).toBe('10:00');
      expect(res.endTime).toBeUndefined();
    });
  });
});
