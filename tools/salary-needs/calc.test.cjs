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

test('one-time goal counts only its monthly contribution, never the whole goal', () => {
  const s = withItems(sc(), 'savings', [{ amount: '200' }]);
  s.goals = [{ id: 'g', name: 'Move', goal: '12,000', saved: '3,000', months: '18' }];
  close(SN.calc(s).A, 200 * 12 + (9000 / 18) * 12);
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
