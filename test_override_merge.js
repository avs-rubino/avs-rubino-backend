const assert = require('assert');
const { postOverrideSchema } = require('./src/middleware/validate');
const contentRouter = require('./src/routes/content');
const { getDayKeyFromDateString, mergeOverrideWithDefaults } = contentRouter._helpers;

console.log('🧪 Starting tests for Override Validation and Defaults Merge...\n');

// ══════════════════════════════════════════════════════════════════
// 1. Tests for postOverrideSchema (Zod Validation)
// ══════════════════════════════════════════════════════════════════
console.log('--- 1. Testing Zod Validation Schema ---');

// Case 1.1: Valid closed override without times
const closedValid = postOverrideSchema.safeParse({
  clinicLocation: 'orariFormia',
  override: {
    dateFrom: '2026-09-02',
    closed: true,
  },
});
assert.strictEqual(closedValid.success, true, 'Case 1.1: closed: true without times must be valid');
console.log('✅ Case 1.1 Passed: closed: true without times accepted');

// Case 1.2: Valid override with both startTime and endTime
const fullValid = postOverrideSchema.safeParse({
  clinicLocation: 'orariFormia',
  override: {
    dateFrom: '2026-09-02',
    startTime: '09:00',
    endTime: '13:00',
  },
});
assert.strictEqual(fullValid.success, true, 'Case 1.2: full times must be valid');
console.log('✅ Case 1.2 Passed: override with both times accepted');

// Case 1.3: Valid override with only startTime
const startOnlyValid = postOverrideSchema.safeParse({
  clinicLocation: 'orariFormia',
  override: {
    dateFrom: '2026-09-02',
    startTime: '10:00',
  },
});
assert.strictEqual(startOnlyValid.success, true, 'Case 1.3: only startTime must be valid');
console.log('✅ Case 1.3 Passed: override with only startTime accepted');

// Case 1.4: Valid override with only endTime
const endOnlyValid = postOverrideSchema.safeParse({
  clinicLocation: 'orariSecondoStudio',
  override: {
    dateFrom: '2026-09-02',
    endTime: '12:00',
  },
});
assert.strictEqual(endOnlyValid.success, true, 'Case 1.4: only endTime must be valid');
console.log('✅ Case 1.4 Passed: override with only endTime accepted');

// Case 1.5: Invalid override without closed and without any times
const invalidNoTimes = postOverrideSchema.safeParse({
  clinicLocation: 'orariFormia',
  override: {
    dateFrom: '2026-09-02',
  },
});
assert.strictEqual(invalidNoTimes.success, false, 'Case 1.5: override without times and not closed must fail validation');
console.log('✅ Case 1.5 Passed: override with no times and not closed rejected with 400 validation error');

// Case 1.6: Invalid override with empty strings
const invalidEmptyStrings = postOverrideSchema.safeParse({
  clinicLocation: 'orariFormia',
  override: {
    dateFrom: '2026-09-02',
    startTime: '   ',
    endTime: '',
  },
});
assert.strictEqual(invalidEmptyStrings.success, false, 'Case 1.6: override with whitespace/empty times must fail validation');
console.log('✅ Case 1.6 Passed: override with whitespace times rejected');


// ══════════════════════════════════════════════════════════════════
// 2. Tests for getDayKeyFromDateString
// ══════════════════════════════════════════════════════════════════
console.log('\n--- 2. Testing getDayKeyFromDateString ---');
assert.strictEqual(getDayKeyFromDateString('2026-08-31'), 'lunedi');
assert.strictEqual(getDayKeyFromDateString('2026-09-01'), 'martedi');
assert.strictEqual(getDayKeyFromDateString('2026-09-02'), 'mercoledi');
assert.strictEqual(getDayKeyFromDateString('2026-09-03'), 'giovedi');
assert.strictEqual(getDayKeyFromDateString('2026-09-04'), 'venerdi');
assert.strictEqual(getDayKeyFromDateString('2026-09-05'), 'sabato');
assert.strictEqual(getDayKeyFromDateString('2026-09-06'), 'domenica');
console.log('✅ Passed: Weekdays correctly resolved for all 7 days in Rome timezone');


// ══════════════════════════════════════════════════════════════════
// 3. Tests for mergeOverrideWithDefaults
// ══════════════════════════════════════════════════════════════════
console.log('\n--- 3. Testing mergeOverrideWithDefaults ---');

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

// Case 3.1: Morning start time provided, end time missing
// 2026-09-03 is Thursday ('giovedi')
const resMorningStart = mergeOverrideWithDefaults(
  { dateFrom: '2026-09-03', startTime: '10:30' },
  mockDefaults
);
assert.strictEqual(resMorningStart.startTime, '10:30');
assert.strictEqual(resMorningStart.endTime, '12:30');
console.log('✅ Case 3.1 Passed: Morning startTime "10:30" merged with default endTime "12:30"');

// Case 3.2: Morning end time provided, start time missing
const resMorningEnd = mergeOverrideWithDefaults(
  { dateFrom: '2026-09-03', endTime: '12:00' },
  mockDefaults
);
assert.strictEqual(resMorningEnd.startTime, '09:30');
assert.strictEqual(resMorningEnd.endTime, '12:00');
console.log('✅ Case 3.2 Passed: Morning endTime "12:00" merged with default startTime "09:30"');

// Case 3.3: Afternoon start time provided, end time missing
const resAfternoonStart = mergeOverrideWithDefaults(
  { dateFrom: '2026-09-03', startTime: '17:00' },
  mockDefaults
);
assert.strictEqual(resAfternoonStart.startTime, '17:00');
assert.strictEqual(resAfternoonStart.endTime, '19:30');
console.log('✅ Case 3.3 Passed: Afternoon startTime "17:00" merged with default endTime "19:30"');

// Case 3.4: Afternoon end time provided, start time missing
const resAfternoonEnd = mergeOverrideWithDefaults(
  { dateFrom: '2026-09-03', endTime: '18:30' },
  mockDefaults
);
assert.strictEqual(resAfternoonEnd.startTime, '16:00');
assert.strictEqual(resAfternoonEnd.endTime, '18:30');
console.log('✅ Case 3.4 Passed: Afternoon endTime "18:30" merged with default startTime "16:00"');

// Case 3.5: Closed override remains untouched
const resClosed = mergeOverrideWithDefaults(
  { dateFrom: '2026-09-03', closed: true },
  mockDefaults
);
assert.strictEqual(resClosed.closed, true);
assert.strictEqual(resClosed.startTime, undefined);
assert.strictEqual(resClosed.endTime, undefined);
console.log('✅ Case 3.5 Passed: Closed override untouched');

// Case 3.6: Both times already provided -> untouched
const resBothProvided = mergeOverrideWithDefaults(
  { dateFrom: '2026-09-03', startTime: '10:00', endTime: '14:00' },
  mockDefaults
);
assert.strictEqual(resBothProvided.startTime, '10:00');
assert.strictEqual(resBothProvided.endTime, '14:00');
console.log('✅ Case 3.6 Passed: Fully specified override preserved exactly as given');

// Case 3.7: Day with no open defaults (e.g. Sunday)
// 2026-09-06 is Sunday ('domenica')
const resSunday = mergeOverrideWithDefaults(
  { dateFrom: '2026-09-06', startTime: '10:00' },
  mockDefaults
);
assert.strictEqual(resSunday.startTime, '10:00');
assert.strictEqual(resSunday.endTime, undefined);
console.log('✅ Case 3.7 Passed: Day with no open defaults gracefully handled without crashing');

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉\n');
