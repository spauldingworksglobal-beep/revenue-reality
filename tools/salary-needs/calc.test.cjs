// Run: node --test tools/salary-needs/calc.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const SN = require('./salary-needs.js');

const sc = () => SN.newScenario('Test');
function withItems(s, key, items) {
  s.cats[key] = { on: true, items: items.map((it, i) => Object.assign({ id: key + i, name: 'x', freq: 'monthly', amount: '' }, it)) };
  s.order.push(key);
  return s;
}
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('spec check: 5,000/mo life, 1,000/mo support → 4,000/mo, 48,000/yr, $23.08/hr at 2,080 hours', () => {
  const s = withItems(sc(), 'housing', [{ amount: '5,000' }]);
  s.support = { answered: 'yes', sources: [{ id: 's1', type: 'work', name: '', amount: '1000', freq: 'monthly' }] };
  const R = SN.calc(s);
  close(R.A, 60000); close(R.B, 12000); close(R.C, 48000);
  close(R.need.monthly, 4000); close(R.need.weekly, 48000 / 52);
  assert.equal(SN.HOURS_PER_YEAR, 2080);
  assert.equal(R.hours.perYear, 2080);
  assert.equal(SN.fmtMoney(R.need.hourly, 'always'), '$23.08');
  assert.equal(R.incomplete, false);
});

test('frequency conversions annualize correctly', () => {
  const s = withItems(sc(), 'food', [
    { amount: '100', freq: 'weekly' }, { amount: '100', freq: 'biweekly' }, { amount: '100', freq: 'semimonthly' },
    { amount: '100', freq: 'monthly' }, { amount: '100', freq: 'quarterly' }, { amount: '100', freq: 'annually' }
  ]);
  close(SN.calc(s).A, 100 * (52 + 26 + 24 + 12 + 4 + 1));
});

test('blank amount is incomplete; explicit 0 is complete', () => {
  const blank = withItems(sc(), 'housing', [{ amount: '' }]);
  assert.equal(SN.calc(blank).incomplete, true);
  assert.equal(SN.calc(blank).missing.length, 1);
  const zero = withItems(sc(), 'housing', [{ amount: '0' }]);
  assert.equal(SN.calc(zero).incomplete, false);
  close(SN.calc(zero).A, 0);
});

test('negative and garbage amounts are rejected, not summed', () => {
  assert.equal(SN.parseAmount('-5').state, 'negative');
  assert.equal(SN.parseAmount('abc').state, 'invalid');
  assert.equal(SN.parseAmount('$1,250.50').value, 1250.5);
  const s = withItems(sc(), 'housing', [{ amount: '-500' }, { amount: '1000' }]);
  const R = SN.calc(s);
  close(R.A, 12000); assert.equal(R.invalid.length, 1);
  const bad = withItems(sc(), 'housing', [{ amount: '100', freq: 'fortnightly' }]);
  assert.equal(SN.calc(bad).invalid.length, 1);
});

test('other income is subtracted once; when it exceeds needs, required is 0 and the surplus is reported', () => {
  const s = withItems(sc(), 'housing', [{ amount: '1000' }]);
  s.support = { answered: 'yes', sources: [{ id: 's', type: 'partner', name: '', amount: '1500', freq: 'monthly' }] };
  const R = SN.calc(s);
  close(R.C, 0); close(R.supportSurplus, 6000); close(R.B, 18000);
  s.support.answered = 'no';
  close(SN.calc(s).B, 0); close(SN.calc(s).C, 12000);
  const unanswered = withItems(sc(), 'housing', [{ amount: '1000' }]);
  assert.equal(SN.calc(unanswered).supportAnswered, null);
  close(SN.calc(unanswered).C, 12000);
});

test('one-time goal counts only its monthly contribution, once, with or without the Savings category', () => {
  const s = withItems(sc(), 'savings', [{ amount: '200' }]);
  s.goals = [{ id: 'g', name: 'Move', goal: '12,000', saved: '3,000', months: '18' }];
  let R = SN.calc(s);
  close(R.A, 200 * 12 + (9000 / 18) * 12);
  close(R.goalsAnnual, 6000); close(R.goals[0].monthly, 500);
  close(R.cats[0].annual, 2400); // category subtotal excludes the goal
  const noSavings = withItems(sc(), 'housing', [{ amount: '1000' }]);
  noSavings.goals = [{ id: 'g', name: 'Move', goal: '12,000', saved: '3,000', months: '18' }];
  R = SN.calc(noSavings);
  close(R.A, 12000 + 6000);
  const goalsOnly = sc();
  goalsOnly.goals = [{ id: 'g', name: 'Move', goal: '6,000', saved: '', months: '12' }];
  close(SN.calc(goalsOnly).A, 6000); assert.equal(SN.calc(goalsOnly).hasAnyInput, true);
  const incompleteGoal = withItems(sc(), 'savings', []);
  incompleteGoal.goals = [{ id: 'g', name: '', goal: '5000', saved: '', months: '' }];
  assert.equal(SN.calc(incompleteGoal).incomplete, true);
  assert.equal(SN.goalMonthly({ goal: '100', saved: '500', months: '4' }).monthly, 0);
  assert.equal(SN.goalMonthly({ goal: '100', saved: '', months: '2.5' }).state, 'invalid');
});

test('user-named scenarios are independent after copying', () => {
  const now = withItems(SN.newScenario('Now'), 'housing', [{ amount: '1500' }]);
  const next = SN.cloneScenario(now, 'After the move');
  assert.equal(next.name, 'After the move');
  assert.equal(next.copiedFrom, 'Now');
  assert.notEqual(next.id, now.id);
  assert.notEqual(next.cats.housing.items[0].id, now.cats.housing.items[0].id);
  next.cats.housing.items[0].amount = '2500';
  close(SN.calc(now).A, 18000); close(SN.calc(next).A, 30000);
  const blank = SN.newScenario('Blank');
  close(SN.calc(blank).A, 0); assert.equal(SN.calc(blank).hasAnyInput, false);
});

test('display rounding only: internal precision kept', () => {
  const s = withItems(sc(), 'housing', [{ amount: '1000', freq: 'annually' }]);
  const R = SN.calc(s);
  close(R.need.monthly, 1000 / 12);
  assert.equal(SN.fmtMoney(R.need.monthly), '$83.33');
  assert.equal(SN.fmtMoney(48000), '$48,000');
  assert.equal(SN.fmtMoney(R.need.hourly, 'always'), '$0.48');
});


/* ---- PDF export ---------------------------------------------------- */

const EM = '—', RSQ = '’', TIMES = '×', DIV = '÷', MID = '·', MINUS = '−';

function pdfText(bytes) { return Buffer.from(bytes).toString('latin1'); }
function scenarioWithNumbers() {
  const s = withItems(SN.newScenario('My life now'), 'housing', [{ name: 'Rent or mortgage', amount: '5,000' }]);
  s.support = { answered: 'yes', sources: [{ id: 's1', type: 'partner', name: 'Partner', amount: '1000', freq: 'monthly' }] };
  s.goals = [{ id: 'g1', name: 'Move', goal: '12,000', saved: '3,000', months: '18' }];
  return s;
}

test('Helvetica width tables are complete and plausible', () => {
  assert.equal(SN.HELV.length, 95);
  assert.equal(SN.HELVB.length, 95);
  assert.ok(SN.HELV.every((n) => n > 0 && n <= 1015));
  assert.ok(SN.HELVB.every((n) => n > 0 && n <= 1015));
  assert.equal(SN.HELV[0], 278);
  assert.equal(SN.HELV['W'.charCodeAt(0) - 32], 944);
  assert.equal(SN.HELVB['W'.charCodeAt(0) - 32], 944);
  assert.equal(SN.HELV['i'.charCodeAt(0) - 32], 222);
  assert.ok(SN.textWidth('MMMM', 10, false) > SN.textWidth('iiii', 10, false));
  assert.ok(SN.textWidth('Total', 10, true) > SN.textWidth('Total', 10, false));
});

test('text is mapped to single-byte WinAnsi so PDF offsets stay correct', () => {
  const mapped = SN.winAnsi(EM + RSQ + TIMES + DIV + MID + MINUS + '  A');
  for (let i = 0; i < mapped.length; i++) assert.ok(mapped.charCodeAt(i) < 256, 'byte ' + i);
  assert.equal(SN.winAnsi(MINUS + '1,000'), '-1,000');
  assert.equal(SN.winAnsi(EM).charCodeAt(0), 151);
  assert.equal(SN.winAnsi(RSQ).charCodeAt(0), 146);
});

test('the PDF is a structurally valid document', () => {
  const s = scenarioWithNumbers();
  SN.setGoalsForPdf(s.goals);
  const bytes = SN.buildPdf(SN.calc(s), 'My life now', new Date(2026, 8, 9));
  const text = pdfText(bytes);
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));

  const startxref = Number(text.slice(text.lastIndexOf('startxref') + 9, text.lastIndexOf('%%EOF')).trim());
  assert.equal(text.slice(startxref, startxref + 4), 'xref');
  const size = Number(/\/Size (\d+)/.exec(text)[1]);
  const entries = text.slice(text.indexOf('\n', startxref + 5) + 1).split('\n');
  for (let i = 1; i < size; i++) {
    const off = Number(entries[i].slice(0, 10));
    assert.equal(text.slice(off, off + String(i).length + 6), i + ' 0 obj', 'object ' + i);
  }
  const decls = [...text.matchAll(/<< \/Length (\d+) >>\nstream\n/g)];
  assert.ok(decls.length >= 1);
  decls.forEach((m, i) => {
    const body = text.slice(m.index + m[0].length);
    assert.equal(body.indexOf('\nendstream'), Number(m[1]), 'stream ' + i);
  });
  assert.ok(text.includes('/BaseFont /Helvetica-Bold'));
  assert.ok(/\/Count [1-9]/.test(text));
});

test('the PDF carries the scenario, figures, goals and notes, and no controls', () => {
  const s = scenarioWithNumbers();
  SN.setGoalsForPdf(s.goals);
  const text = pdfText(SN.buildPdf(SN.calc(s), 'My life now', new Date(2026, 8, 9)));
  const has = (str) => assert.ok(text.includes('(' + str + ')'), 'missing: ' + str);
  has('My life now');
  has('Downloaded September 9, 2026');
  has('SALARY NEEDS');
  has('A TOOL BY SPAULDING WORKS');
  has('$5,500 per month');          // 5,000 housing + 500 from the one-time goal
  has('$4,500');                     // remaining after 1,000 of other income
  has('$54,000');                    // annual
  has('$25.96');                     // hourly at 2,080 hours
  has('Rent or mortgage');
  has('Move');
  has('$500');
  has('Partner');
  has('REQUIRED TAKE-HOME, BY PERIOD');
  has('HOW THESE NUMBERS WERE CALCULATED');
  ['Add an expense', 'Start over', 'Download results', 'Show my results', 'Name this expense', 'Remove scenario']
    .forEach((c) => assert.ok(!text.includes('(' + c + ')'), 'control leaked: ' + c));
});

test('an incomplete scenario is stamped, not silently rounded off', () => {
  const s = withItems(SN.newScenario('Draft'), 'housing', [{ amount: '2,000' }, { amount: '' }]);
  SN.setGoalsForPdf(s.goals);
  const text = pdfText(SN.buildPdf(SN.calc(s), 'Draft', new Date(2026, 8, 9)));
  assert.ok(text.includes('This scenario is incomplete'));
  assert.ok(text.includes('1 selected row still needs an amount'));
});

test('filenames are slugged safely and dated', () => {
  assert.equal(SN.slug('My life now'), 'my-life-now');
  assert.equal(SN.slug('After the move!! (2027)'), 'after-the-move-2027');
  assert.equal(SN.slug('   '), 'scenario');
  assert.equal(SN.slug(EM), 'scenario');
  assert.ok(SN.slug('A'.repeat(80)).length <= 40);
  assert.equal(SN.isoDate(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal('salary-needs-' + SN.slug('My life now') + '-' + SN.isoDate(new Date(2026, 8, 9)) + '.pdf',
    'salary-needs-my-life-now-2026-09-09.pdf');
});

test('long labels and many rows paginate instead of overflowing', () => {
  const s = SN.newScenario('Long');
  const many = [];
  for (let i = 0; i < 40; i++) many.push({ name: 'A very long expense description number ' + i + ' that keeps going well past one line', amount: '100' });
  withItems(s, 'housing', many);
  SN.setGoalsForPdf(s.goals);
  const text = pdfText(SN.buildPdf(SN.calc(s), 'Long', new Date(2026, 8, 9)));
  const count = Number(/\/Count (\d+)/.exec(text)[1]);
  assert.ok(count > 1, 'expected multiple pages, got ' + count);
  assert.ok(text.includes('Page 1 of ' + count));
  assert.ok(text.includes('Page ' + count + ' of ' + count));
});
