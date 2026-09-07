/* Salary Needs — a tool by Spaulding Works. Standalone piece of Revenue Reality.
   Everything is scoped: one IIFE, one root element ([data-sn]), classes prefixed sn-.
   No network calls. Entries are kept only in this browser (localStorage) so a reload doesn't lose work. */
(function (root) {
  'use strict';

  /* =========================================================
     1. TEXT — every label, question, and helper line lives here.
     ========================================================= */
  var TEXT = {
    attribution: 'A tool by Spaulding Works',
    title: 'Salary Needs',
    intro: 'What does it take to afford your life?',
    supporting: 'Choose your expenses, enter your costs, and see what you need to bring home after what’s already helping.',
    afterTax: 'Every figure is take-home, after tax. Nothing here is grossed up for taxes.',

    scenario: {
      label: 'Scenario',
      nameLabel: 'Scenario name',
      namePh: 'Name this scenario',
      defaultName: 'My life now',
      untitled: 'Untitled scenario',
      add: 'Add a scenario',
      addIntro: 'Each scenario keeps its own expenses and support, so you can compare versions of your life side by side.',
      newNameLabel: 'Name the new scenario',
      copy: 'Copy current entries',
      blank: 'Start blank',
      cancel: 'Cancel',
      copied: 'Started from a copy of {name}. Change anything that\u2019s different in this version of your life.',
      gotIt: 'Got it',
      remove: 'Remove scenario',
      removeConfirm: 'Remove {name}? Its entries will be lost.',
      yesRemove: 'Yes, remove',
      startOver: 'Start over',
      startOverConfirm: 'Clear every entry in every scenario?',
      yesClear: 'Yes, clear everything'
    },

    step1: {
      eyebrow: '1. Build your life costs',
      q: 'What does your life need to cover?',
      pick: 'Select what applies. Each category opens rows you can rename, add to, or remove.',
      helper: 'Enter the portion you personally need to cover.',
      cols: { name: 'Expense', amount: 'Amount', freq: 'Frequency' },
      namePh: 'Name this expense',
      add: 'Add an expense',
      remove: 'Remove',
      subtotal: 'per month',
      empty: 'Nothing selected yet. Choose a category above to begin.',
      savingsNote: 'Savings count toward what you want your income to support. They’re listed separately from spending in the breakdown.',
      goalsTitle: 'One-time goals',
      goalHelp: 'For something you’re saving toward once—a move, a down payment, a certification—enter the goal, what you already have, and how many months you want to fund the rest over. Only the monthly contribution counts, never the whole goal.',
      goalCols: { name: 'Goal', goal: 'Goal amount', saved: 'Already saved', months: 'Months to fund', monthly: 'Per month' },
      goalPh: 'Name this goal',
      addGoal: 'Add a one-time goal'
    },

    /* Category list reconciled with Revenue Reality v2 (LifeCategoryKind / SecurityItemKind in packages/domain). */
    categories: [
      { key: 'housing', label: 'Housing', kind: 'spending', v2: 'HOUSING', starter: 'Rent or mortgage', hint: 'Rent or mortgage.' },
      { key: 'utilities', label: 'Utilities', kind: 'spending', v2: 'HOUSING', starter: 'Electricity, gas, water', hint: 'Electricity, gas, water.' },
      { key: 'phone', label: 'Phone and internet', kind: 'spending', v2: 'COMMUNICATIONS', starter: 'Phone and internet', hint: '' },
      { key: 'food', label: 'Food', kind: 'spending', v2: 'FOOD', starter: 'Groceries', hint: 'Groceries and eating out.' },
      { key: 'transport', label: 'Transportation', kind: 'spending', v2: 'TRANSPORTATION', starter: 'Transit or car costs', hint: 'Public transit, car payments, fuel, insurance, parking, maintenance.' },
      { key: 'health', label: 'Health', kind: 'spending', v2: 'HEALTHCARE', starter: 'Health insurance', hint: 'Insurance, prescriptions, appointments, therapy.' },
      { key: 'dependents', label: 'Children and dependents', kind: 'spending', v2: 'DEPENDENTS', starter: 'Childcare', hint: 'Childcare, school costs, activities, caregiving.' },
      { key: 'personal', label: 'Personal care', kind: 'spending', v2: 'PERSONAL_CARE', starter: 'Hair and grooming', hint: 'Hair, grooming, clothing, laundry.' },
      { key: 'debt', label: 'Debt payments', kind: 'spending', v2: 'DEBT_PAYMENT', starter: 'Credit card payments', hint: 'Credit cards, student loans, other personal debt.' },
      { key: 'subs', label: 'Subscriptions and memberships', kind: 'spending', v2: 'OTHER', starter: 'Subscriptions', hint: '' },
      { key: 'family', label: 'Family or community support', kind: 'spending', v2: 'FAMILY_SUPPORT', starter: 'Family support', hint: 'Money you regularly give to family or community.' },
      { key: 'rec', label: 'Recreation, entertainment, and travel', kind: 'spending', v2: 'OTHER', starter: 'Recreation and travel', hint: '' },
      { key: 'savings', label: 'Savings', kind: 'savings', v2: 'SECURITY', starter: 'Emergency savings', hint: 'Emergency savings, retirement, and other life goals.' },
      { key: 'custom', label: 'Add your own expense', kind: 'spending', v2: 'OTHER', starter: '', hint: 'Anything real that doesn’t fit above.' }
    ],

    freq: [
      { key: 'weekly', label: 'Weekly', perYear: 52 },
      { key: 'biweekly', label: 'Every two weeks', perYear: 26 },
      { key: 'semimonthly', label: 'Twice monthly', perYear: 24 },
      { key: 'monthly', label: 'Monthly', perYear: 12 },
      { key: 'quarterly', label: 'Quarterly', perYear: 4 },
      { key: 'annually', label: 'Annually', perYear: 1 }
    ],

    step2: {
      eyebrow: '2. Account for what is already helping',
      q: 'Is anything else regularly helping fund your life right now?',
      yes: 'Yes', no: 'No',
      cols: { type: 'Source', name: 'Name', amount: 'Amount', freq: 'Frequency' },
      types: [
        { key: 'work', label: 'Other paid work' },
        { key: 'partner', label: 'Partner or household contribution' },
        { key: 'family', label: 'Recurring family support' },
        { key: 'benefits', label: 'Benefits or other recurring income' },
        { key: 'other', label: 'Other' }
      ],
      addSource: 'Add a source',
      doubleCount: 'Count each dollar once. If you entered only your share of the rent above, don’t list your partner’s share here. Don’t include what you already earn from the business or work you’re evaluating—that’s the number this tool works out. Savings balances, loans, business revenue, and one-off or promised future payments aren’t recurring income.',
      finish: 'Show my results'
    },

    results: {
      eyebrow: 'Your results',
      title: 'After-tax take-home',
      incomplete: 'Incomplete',
      incompleteNote: '{n} selected {rows} an amount. The totals below are a floor until they’re filled in.',
      requires: 'Your life requires',
      perMonth: 'per month',
      supported: 'Already supported by other income',
      need: 'Remaining take-home needed',
      sentence: 'Based on what you entered, you need to bring home <b>{x} per month</b> to cover this version of your life.',
      sentenceAfterSupport: 'Based on what you entered, you need to bring home <b>{x} per month</b> after other support to cover this version of your life.',
      sentenceEmpty: 'Select your expenses to see what this version of your life requires.',
      supportExceeds: 'Other income already covers your entered needs with {x} per month to spare, so nothing is required from the work you’re evaluating.',
      tableCaption: 'Required take-home, by period',
      cols: { period: 'Period', annual: 'Annual', monthly: 'Monthly', weekly: 'Weekly', hourly: 'Hourly' },
      rowNeed: 'Required take-home',
      basis: 'Monthly is annual ÷ 12. Weekly is annual ÷ 52 calendar weeks. Hourly assumes a {hours}-hour week for {weeks} weeks, {total} working hours a year. It shows what each working hour has to carry; it is not a client billing rate.',
      details: 'See the breakdown',
      spending: 'Spending',
      savings: 'Savings contributions',
      goals: 'One-time goals, as monthly contributions',
      support: 'Other income and support',
      total: 'Life requirement',
      none: 'None entered',
      notAnswered: 'Not answered yet',
      monthly: 'per month',
      dash: '—'
    },

    validation: {
      missing: 'Enter an amount. 0 is fine.',
      invalid: 'Enter a valid amount of 0 or more.',
      scenarioName: 'Give this scenario a name.',
      months: 'Enter a whole number of months, 1 or more.'
    }
  };

  /* =========================================================
     2. CALCULATION — pure functions, no DOM.
     ========================================================= */
  var HOURS_PER_WEEK = 40, WEEKS_PER_YEAR = 52;
  var HOURS_PER_YEAR = HOURS_PER_WEEK * WEEKS_PER_YEAR; // 2,080 — stated in the results, never hidden
  var FREQ = {};
  TEXT.freq.forEach(function (f) { FREQ[f.key] = f; });
  var CATS = {};
  TEXT.categories.forEach(function (c) { CATS[c.key] = c; });

  function parseAmount(s) {
    if (s === null || s === undefined) return { state: 'blank' };
    var t = String(s).replace(/[\s$,]/g, '');
    if (t === '') return { state: 'blank' };
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return { state: 'invalid' };
    var n = Number(t);
    if (!isFinite(n)) return { state: 'invalid' };
    if (n < 0) return { state: 'negative' };
    return { state: 'ok', value: n };
  }

  function parseCount(s, min, max, integer) {
    if (s === null || s === undefined || String(s).trim() === '') return { state: 'blank' };
    var t = String(s).replace(/[\s,]/g, '');
    if (!/^\d+\.?\d*$/.test(t)) return { state: 'invalid' };
    var n = Number(t);
    if (!isFinite(n) || n < min || n > max) return { state: 'invalid' };
    if (integer && n !== Math.floor(n)) return { state: 'invalid' };
    return { state: 'ok', value: n };
  }

  function perYear(freq) { return FREQ[freq] ? FREQ[freq].perYear : null; }

  function goalMonthly(g) {
    var goal = parseAmount(g.goal);
    var saved = parseAmount(g.saved);
    var months = parseCount(g.months, 1, 1200, true);
    if (goal.state === 'blank' || months.state === 'blank') return { state: 'blank' };
    if (goal.state !== 'ok' || months.state !== 'ok') return { state: 'invalid' };
    if (saved.state === 'blank') saved = { state: 'ok', value: 0 };
    if (saved.state !== 'ok') return { state: 'invalid' };
    var remaining = Math.max(0, goal.value - saved.value);
    return { state: 'ok', monthly: remaining / months.value, remaining: remaining };
  }

  function views(annual) {
    return { annual: annual, monthly: annual / 12, weekly: annual / 52, hourly: annual / HOURS_PER_YEAR };
  }

  /* A = annual life requirement (spending + savings + goal contributions), B = annual other support,
     C = max(0, A − B) = what the work being evaluated has to bring home. Nothing is subtracted twice. */
  function calc(sc) {
    var missing = [], invalid = [], cats = [], A = 0, hasAnyInput = false;

    sc.order.forEach(function (k) {
      var c = sc.cats[k];
      if (!c || !c.on) return;
      var def = CATS[k];
      var items = [], sub = 0;
      c.items.forEach(function (it) {
        hasAnyInput = true;
        var p = parseAmount(it.amount), py = perYear(it.freq);
        var name = it.name || def.starter || def.label;
        if (p.state === 'blank') { missing.push({ id: it.id, label: name }); items.push({ id: it.id, name: name, annual: null, state: 'blank' }); return; }
        if (p.state !== 'ok' || py === null) { invalid.push({ id: it.id, label: name }); items.push({ id: it.id, name: name, annual: null, state: 'invalid' }); return; }
        var an = p.value * py; sub += an;
        items.push({ id: it.id, name: name, annual: an, state: 'ok' });
      });
      var goals = [];
      if (def.kind === 'savings') {
        sc.goals.forEach(function (g) {
          hasAnyInput = true;
          var r = goalMonthly(g);
          var name = g.name || 'Goal';
          if (r.state === 'blank') { missing.push({ id: g.id, label: name }); goals.push({ id: g.id, name: name, annual: null, state: 'blank' }); return; }
          if (r.state !== 'ok') { invalid.push({ id: g.id, label: name }); goals.push({ id: g.id, name: name, annual: null, state: 'invalid' }); return; }
          sub += r.monthly * 12;
          goals.push({ id: g.id, name: name, annual: r.monthly * 12, monthly: r.monthly, state: 'ok' });
        });
      }
      A += sub;
      cats.push({ key: k, label: def.label, kind: def.kind, annual: sub, items: items, goals: goals });
    });

    var support = [], B = 0;
    if (sc.support.answered === 'yes') {
      sc.support.sources.forEach(function (src) {
        hasAnyInput = true;
        var p = parseAmount(src.amount), py = perYear(src.freq);
        var typeDef = null;
        TEXT.step2.types.forEach(function (t) { if (t.key === src.type) typeDef = t; });
        var name = src.name || (typeDef ? typeDef.label : 'Other');
        if (p.state === 'blank') { missing.push({ id: src.id, label: name }); support.push({ id: src.id, name: name, annual: null, state: 'blank' }); return; }
        if (p.state !== 'ok' || py === null) { invalid.push({ id: src.id, label: name }); support.push({ id: src.id, name: name, annual: null, state: 'invalid' }); return; }
        var an = p.value * py; B += an;
        support.push({ id: src.id, name: name, annual: an, state: 'ok' });
      });
    }

    var C = Math.max(0, A - B);
    return {
      A: A, B: B, C: C,
      supportSurplus: B > A ? B - A : 0,
      cats: cats, support: support, supportAnswered: sc.support.answered,
      missing: missing, invalid: invalid, incomplete: missing.length > 0, hasAnyInput: hasAnyInput,
      hours: { perWeek: HOURS_PER_WEEK, weeks: WEEKS_PER_YEAR, perYear: HOURS_PER_YEAR },
      need: views(C)
    };
  }

  /* =========================================================
     3. FORMATTING
     ========================================================= */
  function roundCents(n) { return Math.round(n * 100) / 100; }
  function fmtMoney(n, cents) {
    if (n === null || n === undefined || !isFinite(n)) return TEXT.results.dash;
    var r = roundCents(n), neg = r < 0, abs = Math.abs(r);
    var whole = cents === 'never' || (cents !== 'always' && Math.abs(abs - Math.round(abs)) < 0.005);
    var s = abs.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
    return (neg ? '−' : '') + '$' + s;
  }
  function fmtNum(n) { return (Math.round(n * 100) / 100).toLocaleString('en-US'); }
  function fill(t, vars) { return t.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ''; }); }
  function h(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* =========================================================
     4. STATE — a list of user-named scenarios, each fully independent.
     ========================================================= */
  var STORE_KEY = 'sw-salary-needs-v2';
  var seq = 0;
  function uid() { seq += 1; return 'r' + Date.now().toString(36) + seq.toString(36); }

  function newScenario(name) {
    return { id: uid(), name: name || '', cats: {}, order: [], goals: [], support: { answered: null, sources: [] }, copiedFrom: null, copiedAck: false };
  }
  function newItem(cat) { return { id: uid(), name: cat.starter || '', amount: '', freq: 'monthly' }; }
  function newGoal() { return { id: uid(), name: '', goal: '', saved: '', months: '' }; }
  function newSource(type) { return { id: uid(), type: type || 'work', name: '', amount: '', freq: 'monthly' }; }
  function cloneScenario(src, name) {
    var s = JSON.parse(JSON.stringify(src));
    s.id = uid(); s.name = name || ''; s.copiedFrom = src.name || TEXT.scenario.untitled; s.copiedAck = false;
    var remap = function (o) { o.id = uid(); return o; };
    Object.keys(s.cats).forEach(function (k) { s.cats[k].items.forEach(remap); });
    s.goals.forEach(remap); s.support.sources.forEach(remap);
    return s;
  }
  function displayName(sc) { return (sc.name && sc.name.trim()) || TEXT.scenario.untitled; }

  var state, ui;
  function freshState() { var first = newScenario(TEXT.scenario.defaultName); return { scenarios: [first], active: first.id }; }
  function freshUi() { return { touched: {}, submitted: false, addOpen: false, newName: '', confirm: null, breakdownOpen: false }; }
  state = freshState(); ui = freshUi();

  function active() {
    for (var i = 0; i < state.scenarios.length; i++) if (state.scenarios[i].id === state.active) return state.scenarios[i];
    state.active = state.scenarios[0].id;
    return state.scenarios[0];
  }
  function findRow(sc, id) {
    var out = null;
    Object.keys(sc.cats).forEach(function (k) { sc.cats[k].items.forEach(function (it) { if (it.id === id) out = { kind: 'item', row: it, cat: k }; }); });
    sc.goals.forEach(function (g) { if (g.id === id) out = { kind: 'goal', row: g }; });
    sc.support.sources.forEach(function (src) { if (src.id === id) out = { kind: 'source', row: src }; });
    return out;
  }

  function save() {
    try { root.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 2, scenarios: state.scenarios, active: state.active })); } catch (e) { /* storage unavailable: keep in memory */ }
  }
  function load() {
    try {
      var raw = root.localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && d.v === 2 && Array.isArray(d.scenarios) && d.scenarios.length) { state.scenarios = d.scenarios; state.active = d.active; active(); }
    } catch (e) { /* ignore corrupt storage */ }
  }

  /* =========================================================
     5. RENDERING
     ========================================================= */
  var T = TEXT, els = {};

  function freqOptions(sel) {
    return T.freq.map(function (f) { return '<option value="' + f.key + '"' + (f.key === sel ? ' selected' : '') + '>' + h(f.label) + '</option>'; }).join('');
  }
  function errFor(id) { return '<span class="sn-err" id="sn-err-' + id + '" data-err="' + id + '" aria-live="polite"></span>'; }
  function moneyInput(id, field, value, label) {
    return '<label class="sn-cell-label" for="sn-' + id + '-' + field + '">' + h(label) + '</label>' +
      '<div class="sn-money"><input class="sn-input sn-amt" id="sn-' + id + '-' + field + '" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" value="' + h(value) + '" data-id="' + id + '" data-f="' + field + '" aria-describedby="sn-err-' + id + '"></div>';
  }

  function itemRow(cat, it) {
    return '<div class="sn-row" data-row="' + it.id + '">' +
      '<div class="sn-cell sn-cell-name"><label class="sn-cell-label" for="sn-' + it.id + '-name">' + h(T.step1.cols.name) + '</label><input class="sn-input" id="sn-' + it.id + '-name" type="text" autocomplete="off" placeholder="' + h(T.step1.namePh) + '" value="' + h(it.name) + '" data-id="' + it.id + '" data-f="name"></div>' +
      '<div class="sn-cell sn-cell-amt">' + moneyInput(it.id, 'amount', it.amount, T.step1.cols.amount) + errFor(it.id) + '</div>' +
      '<div class="sn-cell sn-cell-freq"><label class="sn-cell-label" for="sn-' + it.id + '-freq">' + h(T.step1.cols.freq) + '</label><select class="sn-input" id="sn-' + it.id + '-freq" data-id="' + it.id + '" data-f="freq">' + freqOptions(it.freq) + '</select></div>' +
      '<div class="sn-cell sn-cell-x"><button type="button" class="sn-x" data-act="remove-item" data-id="' + it.id + '" aria-label="' + h(T.step1.remove + ' ' + (it.name || cat.label)) + '">&times;</button></div>' +
      '</div>';
  }

  function goalRow(g) {
    return '<div class="sn-goal" data-row="' + g.id + '">' +
      '<div class="sn-cell sn-cell-name"><label class="sn-cell-label" for="sn-' + g.id + '-name">' + h(T.step1.goalCols.name) + '</label><input class="sn-input" id="sn-' + g.id + '-name" type="text" autocomplete="off" placeholder="' + h(T.step1.goalPh) + '" value="' + h(g.name) + '" data-id="' + g.id + '" data-f="name"></div>' +
      '<div class="sn-cell">' + moneyInput(g.id, 'goal', g.goal, T.step1.goalCols.goal) + errFor(g.id) + '</div>' +
      '<div class="sn-cell">' + moneyInput(g.id, 'saved', g.saved, T.step1.goalCols.saved) + '</div>' +
      '<div class="sn-cell sn-cell-months"><label class="sn-cell-label" for="sn-' + g.id + '-months">' + h(T.step1.goalCols.months) + '</label><input class="sn-input" id="sn-' + g.id + '-months" type="text" inputmode="numeric" autocomplete="off" placeholder="12" value="' + h(g.months) + '" data-id="' + g.id + '" data-f="months" aria-describedby="sn-err-' + g.id + '"></div>' +
      '<div class="sn-cell sn-cell-out"><span class="sn-cell-label">' + h(T.step1.goalCols.monthly) + '</span><div class="sn-goal-out"><b data-goal-monthly="' + g.id + '">' + T.results.dash + '</b><small>' + h(T.step1.goalCols.monthly) + '</small></div></div>' +
      '<div class="sn-cell sn-cell-x"><button type="button" class="sn-x" data-act="remove-goal" data-id="' + g.id + '" aria-label="' + h(T.step1.remove + ' ' + (g.name || 'goal')) + '">&times;</button></div>' +
      '</div>';
  }

  function groupHtml(sc, key) {
    var cat = CATS[key], c = sc.cats[key];
    var html = '<section class="sn-group" data-cat="' + key + '" aria-labelledby="sn-g-' + key + '">' +
      '<div class="sn-group-head"><h4 id="sn-g-' + key + '">' + h(cat.label) + '</h4><span class="sn-group-total"><b data-cat-total="' + key + '">$0</b> ' + h(T.step1.subtotal) + '</span></div>' +
      (cat.hint ? '<p class="sn-note">' + h(cat.hint) + '</p>' : '') +
      (cat.kind === 'savings' ? '<p class="sn-note">' + h(T.step1.savingsNote) + '</p>' : '') +
      '<div class="sn-cols" aria-hidden="true"><span>' + h(T.step1.cols.name) + '</span><span>' + h(T.step1.cols.amount) + '</span><span>' + h(T.step1.cols.freq) + '</span><span></span></div>' +
      c.items.map(function (it) { return itemRow(cat, it); }).join('') +
      '<button type="button" class="sn-link" data-act="add-item" data-cat="' + key + '">+ ' + h(T.step1.add) + '</button>';
    if (cat.kind === 'savings') {
      html += '<div class="sn-goals"><h5>' + h(T.step1.goalsTitle) + '</h5><p class="sn-note">' + h(T.step1.goalHelp) + '</p>' +
        (sc.goals.length ? '<div class="sn-cols-goal" aria-hidden="true"><span>' + h(T.step1.goalCols.name) + '</span><span>' + h(T.step1.goalCols.goal) + '</span><span>' + h(T.step1.goalCols.saved) + '</span><span>' + h(T.step1.goalCols.months) + '</span><span>' + h(T.step1.goalCols.monthly) + '</span><span></span></div>' : '') +
        sc.goals.map(goalRow).join('') +
        '<button type="button" class="sn-link" data-act="add-goal">+ ' + h(T.step1.addGoal) + '</button></div>';
    }
    return html + '</section>';
  }

  function sourceRow(src) {
    var typeOpts = T.step2.types.map(function (t) { return '<option value="' + t.key + '"' + (t.key === src.type ? ' selected' : '') + '>' + h(t.label) + '</option>'; }).join('');
    return '<div class="sn-row" data-row="' + src.id + '">' +
      '<div class="sn-cell sn-cell-type"><label class="sn-cell-label" for="sn-' + src.id + '-type">' + h(T.step2.cols.type) + '</label><select class="sn-input" id="sn-' + src.id + '-type" data-id="' + src.id + '" data-f="type">' + typeOpts + '</select></div>' +
      '<div class="sn-cell sn-cell-name"><label class="sn-cell-label" for="sn-' + src.id + '-name">' + h(T.step2.cols.name) + '</label><input class="sn-input" id="sn-' + src.id + '-name" type="text" autocomplete="off" placeholder="' + h(T.step2.cols.name) + '" value="' + h(src.name) + '" data-id="' + src.id + '" data-f="name"></div>' +
      '<div class="sn-cell sn-cell-amt">' + moneyInput(src.id, 'amount', src.amount, T.step2.cols.amount) + errFor(src.id) + '</div>' +
      '<div class="sn-cell sn-cell-freq"><label class="sn-cell-label" for="sn-' + src.id + '-freq">' + h(T.step2.cols.freq) + '</label><select class="sn-input" id="sn-' + src.id + '-freq" data-id="' + src.id + '" data-f="freq">' + freqOptions(src.freq) + '</select></div>' +
      '<div class="sn-cell sn-cell-x"><button type="button" class="sn-x" data-act="remove-source" data-id="' + src.id + '" aria-label="' + h(T.step1.remove + ' ' + (src.name || 'source')) + '">&times;</button></div>' +
      '</div>';
  }

  function renderInputs() {
    var sc = active();
    var chips = T.categories.map(function (cat) {
      var on = sc.cats[cat.key] && sc.cats[cat.key].on;
      return '<button type="button" class="sn-chip" aria-pressed="' + (on ? 'true' : 'false') + '" data-act="toggle-cat" data-cat="' + cat.key + '">' + h(cat.label) + '</button>';
    }).join('');
    var groups = sc.order.filter(function (k) { return sc.cats[k] && sc.cats[k].on; }).map(function (k) { return groupHtml(sc, k); }).join('');
    var yes = sc.support.answered === 'yes', no = sc.support.answered === 'no';
    els.inputs.innerHTML =
      '<section class="sn-step" aria-labelledby="sn-s1"><p class="v2-eyebrow">' + h(T.step1.eyebrow) + '</p><h2 class="sn-q" id="sn-s1">' + h(T.step1.q) + '</h2>' +
      '<p class="sn-help"><b>' + h(T.step1.helper) + '</b> ' + h(T.step1.pick) + '</p>' +
      '<div class="sn-chips" role="group" aria-label="' + h(T.step1.q) + '">' + chips + '</div>' +
      (groups || '<p class="sn-empty">' + h(T.step1.empty) + '</p>') +
      '</section>' +

      '<section class="sn-step" aria-labelledby="sn-s2"><p class="v2-eyebrow">' + h(T.step2.eyebrow) + '</p><h2 class="sn-q" id="sn-s2">' + h(T.step2.q) + '</h2>' +
      '<div class="sn-seg" role="group" aria-label="' + h(T.step2.q) + '">' +
      '<button type="button" class="sn-chip" aria-pressed="' + yes + '" data-act="support" data-v="yes">' + h(T.step2.yes) + '</button>' +
      '<button type="button" class="sn-chip" aria-pressed="' + no + '" data-act="support" data-v="no">' + h(T.step2.no) + '</button></div>' +
      (yes ? '<div class="sn-srcs"><p class="sn-note" style="margin-bottom:12px">' + h(T.step2.doubleCount) + '</p>' +
        '<div class="sn-cols" aria-hidden="true"><span>' + h(T.step2.cols.type) + '</span><span>' + h(T.step2.cols.name) + '</span><span>' + h(T.step2.cols.amount) + '</span><span>' + h(T.step2.cols.freq) + '</span><span></span></div>' +
        sc.support.sources.map(sourceRow).join('') +
        '<button type="button" class="sn-link" data-act="add-source">+ ' + h(T.step2.addSource) + '</button></div>' : '') +
      '</section>' +

      '<div class="sn-finish"><button type="button" class="sn-btn sn-btn-primary" data-act="finish">' + h(T.step2.finish) + '</button><p class="sn-note">' + h(T.afterTax) + '</p></div>';
  }

  function renderScenarios() {
    var sc = active(), v = T.validation;
    var tabs = state.scenarios.map(function (s) {
      return '<button type="button" role="tab" class="sn-tab" aria-selected="' + (s.id === state.active) + '" data-act="switch" data-id="' + s.id + '">' + h(displayName(s)) + '</button>';
    }).join('');
    var nameErr = (ui.submitted || ui.touched['name-' + sc.id]) && !(sc.name && sc.name.trim()) ? v.scenarioName : '';
    var html = '<div class="sn-scen-bar"><div class="sn-tabs" role="tablist" aria-label="' + h(T.scenario.label) + '">' + tabs + '</div>' +
      '<div class="sn-scen-actions">' +
      (!ui.addOpen ? '<button type="button" class="sn-btn" data-act="add-open">+ ' + h(T.scenario.add) + '</button>' : '') +
      '</div></div>' +
      '<div class="sn-scen-name"><div class="sn-field"><label for="sn-scn-name">' + h(T.scenario.nameLabel) + '</label><input class="sn-input" id="sn-scn-name" type="text" maxlength="48" autocomplete="off" placeholder="' + h(T.scenario.namePh) + '" value="' + h(sc.name) + '" data-scn-name aria-describedby="sn-err-scn-name"><span class="sn-err" id="sn-err-scn-name" data-err="scn-name">' + h(nameErr) + '</span></div>' +
      (state.scenarios.length > 1 ? '<button type="button" class="sn-btn sn-btn-quiet" data-act="confirm" data-v="remove">' + h(T.scenario.remove) + '</button>' : '') + '</div>';
    if (ui.addOpen) {
      var suggested = ui.newName;
      html += '<div class="sn-panel" data-add><p class="sn-note">' + h(T.scenario.addIntro) + '</p>' +
        '<div class="sn-field"><label for="sn-new-name">' + h(T.scenario.newNameLabel) + '</label><input class="sn-input" id="sn-new-name" type="text" maxlength="48" autocomplete="off" placeholder="' + h(T.scenario.namePh) + '" value="' + h(suggested) + '" data-new-name></div>' +
        '<div class="sn-scen-actions"><button type="button" class="sn-btn sn-btn-primary" data-act="create" data-mode="copy">' + h(T.scenario.copy) + '</button>' +
        '<button type="button" class="sn-btn" data-act="create" data-mode="blank">' + h(T.scenario.blank) + '</button>' +
        '<button type="button" class="sn-link" data-act="add-close">' + h(T.scenario.cancel) + '</button></div></div>';
    }
    if (sc.copiedFrom && !sc.copiedAck) {
      html += '<div class="sn-callout" role="status"><p>' + h(fill(T.scenario.copied, { name: sc.copiedFrom })) + '</p><button type="button" class="sn-btn sn-btn-quiet" data-act="ack-copy">' + h(T.scenario.gotIt) + '</button></div>';
    }
    if (ui.confirm === 'remove') {
      html += '<div class="sn-confirm" role="alertdialog" aria-label="' + h(T.scenario.remove) + '"><p>' + h(fill(T.scenario.removeConfirm, { name: displayName(sc) })) + '</p><button type="button" class="sn-btn sn-btn-primary" data-act="remove-scenario">' + h(T.scenario.yesRemove) + '</button><button type="button" class="sn-btn" data-act="confirm" data-v="">' + h(T.scenario.cancel) + '</button></div>';
    }
    els.scen.innerHTML = html;
  }

  function renderResults(R) {
    var r = T.results, sc = active();
    var sentence;
    if (!R.hasAnyInput && !R.cats.length) sentence = h(r.sentenceEmpty);
    else if (R.supportSurplus > 0.005) sentence = h(fill(r.supportExceeds, { x: fmtMoney(R.supportSurplus / 12) }));
    else if (R.B > 0.005) sentence = fill(r.sentenceAfterSupport, { x: fmtMoney(R.C / 12) });
    else sentence = fill(r.sentence, { x: fmtMoney(R.C / 12) });

    var spending = R.cats.filter(function (c) { return c.kind === 'spending'; });
    var savings = R.cats.filter(function (c) { return c.kind === 'savings'; });
    var none = '<li><span>' + h(r.none) + '</span><span></span></li>';
    function money(v) { return v === null ? h(r.dash) : fmtMoney(v / 12); }
    var bd = '<div><h5>' + h(r.spending) + '</h5><ul>' + (spending.length ? spending.map(function (c) {
      return '<li><span>' + h(c.label) + '</span><span>' + fmtMoney(c.annual / 12) + '</span></li>' +
        c.items.map(function (it) { return '<li class="is-sub"><span>' + h(it.name) + '</span><span>' + money(it.annual) + '</span></li>'; }).join('');
    }).join('') : none) + '</ul></div>';
    var savingsItems = [], goalItems = [];
    savings.forEach(function (c) { savingsItems = savingsItems.concat(c.items); goalItems = goalItems.concat(c.goals); });
    bd += '<div><h5>' + h(r.savings) + '</h5><ul>' + (savingsItems.length ? savingsItems.map(function (it) { return '<li><span>' + h(it.name) + '</span><span>' + money(it.annual) + '</span></li>'; }).join('') : none) + '</ul></div>';
    if (goalItems.length) bd += '<div><h5>' + h(r.goals) + '</h5><ul>' + goalItems.map(function (g) { return '<li><span>' + h(g.name) + '</span><span>' + (g.annual === null ? h(r.dash) : fmtMoney(g.monthly)) + '</span></li>'; }).join('') + '</ul></div>';
    bd += '<ul><li class="is-total"><span>' + h(r.total) + '</span><span>' + fmtMoney(R.A / 12) + ' ' + h(r.monthly) + '</span></li></ul>';
    bd += '<div><h5>' + h(r.support) + '</h5><ul>' + (R.supportAnswered === null ? '<li><span>' + h(r.notAnswered) + '</span><span></span></li>' : R.support.length ? R.support.map(function (s) { return '<li><span>' + h(s.name) + '</span><span>' + money(s.annual) + '</span></li>'; }).join('') : none) + '</ul></div>';

    var rows = ['annual', 'monthly', 'weekly', 'hourly'].map(function (k) {
      return '<tr><th scope="row">' + h(r.cols[k]) + '</th><td>' + fmtMoney(R.need[k], k === 'hourly' ? 'always' : undefined) + '</td></tr>';
    }).join('');

    els.results.innerHTML =
      '<div class="sn-results-top"><div><p class="v2-eyebrow">' + h(r.eyebrow) + '</p><p id="sn-results-title" data-results-title>' + h(displayName(sc)) + ' · ' + h(r.title) + '</p></div>' +
      (R.incomplete ? '<span class="sn-badge">' + h(r.incomplete) + '</span>' : '') + '</div>' +
      (R.incomplete ? '<p class="sn-badge-note">' + h(fill(r.incompleteNote, { n: R.missing.length, rows: R.missing.length === 1 ? 'row still needs' : 'rows still need' })) + '</p>' : '') +
      '<p class="sn-lead-l">' + h(r.requires) + '</p><p class="sn-big">' + fmtMoney(R.A / 12) + '<small>' + h(r.perMonth) + '</small></p>' +
      '<div class="sn-lines">' +
      '<div class="sn-line"><span class="sn-line-l">' + h(r.supported) + '</span><span class="sn-line-v">' + (R.supportAnswered === 'yes' ? '−' : '') + fmtMoney(R.B / 12) + '</span></div>' +
      '<div class="sn-line is-key"><span class="sn-line-l">' + h(r.need) + '</span><span class="sn-line-v">' + fmtMoney(R.C / 12) + '<small>' + h(r.perMonth) + '</small></span></div>' +
      '</div>' +
      '<p class="sn-sentence" aria-live="polite">' + sentence + '</p>' +
      '<div class="sn-tablewrap"><table class="sn-table"><caption>' + h(r.tableCaption) + '</caption><thead><tr><th scope="col">' + h(r.cols.period) + '</th><th scope="col">' + h(r.rowNeed) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="sn-basis">' + h(fill(r.basis, { hours: fmtNum(R.hours.perWeek), weeks: fmtNum(R.hours.weeks), total: fmtNum(R.hours.perYear) })) + '</p>' +
      '<details class="sn-details" data-details' + (ui.breakdownOpen ? ' open' : '') + '><summary>' + h(r.details) + '</summary><div class="sn-bd">' + bd + '</div></details>' +
      '<div class="sn-results-foot"><span>' + h(T.attribution) + '</span><button type="button" class="sn-btn" data-act="confirm" data-v="reset">' + h(T.scenario.startOver) + '</button></div>' +
      (ui.confirm === 'reset' ? '<div class="sn-confirm" role="alertdialog" aria-label="' + h(T.scenario.startOver) + '"><p>' + h(T.scenario.startOverConfirm) + '</p><button type="button" class="sn-btn sn-btn-yellow" data-act="reset">' + h(T.scenario.yesClear) + '</button><button type="button" class="sn-btn" data-act="confirm" data-v="">' + h(T.scenario.cancel) + '</button></div>' : '');
  }

  function showErr(id, msg) {
    var el = els.root.querySelector('[data-err="' + id + '"]');
    if (el) el.textContent = msg || '';
    var inputs = els.root.querySelectorAll('[aria-describedby="sn-err-' + id + '"]');
    for (var i = 0; i < inputs.length; i++) inputs[i].classList.toggle('is-invalid', !!msg);
  }

  function updateDerived(R) {
    var sc = active(), v = T.validation;
    var show = function (id) { return ui.submitted || ui.touched[id]; };
    R.cats.forEach(function (c) {
      var el = els.root.querySelector('[data-cat-total="' + c.key + '"]');
      if (el) el.textContent = fmtMoney(c.annual / 12);
      c.items.forEach(function (it) { showErr(it.id, it.state === 'ok' ? '' : show(it.id) ? (it.state === 'blank' ? v.missing : v.invalid) : ''); });
      c.goals.forEach(function (g) {
        var out = els.root.querySelector('[data-goal-monthly="' + g.id + '"]');
        if (out) out.textContent = g.annual === null ? T.results.dash : fmtMoney(g.monthly);
        var raw = null;
        sc.goals.forEach(function (x) { if (x.id === g.id) raw = x; });
        var msg = '';
        if (g.state !== 'ok' && show(g.id)) {
          var mo = raw ? parseCount(raw.months, 1, 1200, true) : { state: 'blank' };
          msg = mo.state === 'invalid' ? v.months : g.state === 'blank' ? v.missing : v.invalid;
        }
        showErr(g.id, msg);
      });
    });
    R.support.forEach(function (s) { showErr(s.id, s.state === 'ok' ? '' : show(s.id) ? (s.state === 'blank' ? v.missing : v.invalid) : ''); });
    showErr('scn-name', (ui.submitted || ui.touched['name-' + sc.id]) && !(sc.name && sc.name.trim()) ? v.scenarioName : '');
  }

  function refresh() {
    var R = calc(active());
    renderResults(R);
    updateDerived(R);
    save();
    return R;
  }
  function renderAll() { renderScenarios(); renderInputs(); refresh(); }

  /* =========================================================
     6. EVENTS
     ========================================================= */
  function focusEl(sel) { var el = els.root.querySelector(sel); if (el) el.focus(); }

  function onInput(e) {
    var t = e.target, sc = active();
    if (t.hasAttribute('data-scn-name')) {
      sc.name = t.value;
      var tab = els.root.querySelector('[data-act="switch"][data-id="' + sc.id + '"]');
      if (tab) tab.textContent = displayName(sc);
      var title = els.root.querySelector('[data-results-title]');
      if (title) title.textContent = displayName(sc) + ' · ' + T.results.title;
      save();
      return;
    }
    if (t.hasAttribute('data-new-name')) { ui.newName = t.value; return; }
    var id = t.getAttribute('data-id'), f = t.getAttribute('data-f');
    if (!id || !f) return;
    var r = findRow(sc, id);
    if (!r) return;
    r.row[f] = t.value;
    if (t.tagName === 'SELECT') ui.touched[id] = true;
    refresh();
  }

  function onBlur(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    if (t.hasAttribute('data-scn-name')) { ui.touched['name-' + active().id] = true; renderScenarios(); refresh(); return; }
    var id = t.getAttribute('data-id');
    if (!id) return;
    ui.touched[id] = true;
    if (t.classList.contains('sn-amt')) {
      var p = parseAmount(t.value);
      if (p.state === 'ok') {
        var pretty = p.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        if (pretty !== t.value) { t.value = pretty; onInput({ target: t }); return; }
      }
    }
    refresh();
  }

  function onKey(e) {
    if (e.key === 'Enter' && e.target && e.target.hasAttribute && e.target.hasAttribute('data-new-name')) {
      e.preventDefault();
      var b = els.root.querySelector('[data-act="create"][data-mode="copy"]');
      if (b) b.click();
    }
  }

  function onClick(e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b || !els.root.contains(b)) return;
    var act = b.getAttribute('data-act'), sc = active(), key = b.getAttribute('data-cat'), id = b.getAttribute('data-id');
    switch (act) {
      case 'toggle-cat': {
        var cat = CATS[key];
        if (!sc.cats[key]) { sc.cats[key] = { on: true, items: [newItem(cat)] }; sc.order.push(key); }
        else { sc.cats[key].on = !sc.cats[key].on; if (sc.cats[key].on && !sc.cats[key].items.length) sc.cats[key].items.push(newItem(cat)); }
        renderInputs(); refresh(); focusEl('[data-act="toggle-cat"][data-cat="' + key + '"]'); break;
      }
      case 'add-item': { var it = newItem({ starter: '' }); sc.cats[key].items.push(it); renderInputs(); refresh(); focusEl('#sn-' + it.id + '-name'); break; }
      case 'remove-item': {
        var r = findRow(sc, id); if (!r) break;
        var list = sc.cats[r.cat].items; list.splice(list.indexOf(r.row), 1);
        renderInputs(); refresh(); focusEl('[data-act="add-item"][data-cat="' + r.cat + '"]'); break;
      }
      case 'add-goal': { var g = newGoal(); sc.goals.push(g); renderInputs(); refresh(); focusEl('#sn-' + g.id + '-name'); break; }
      case 'remove-goal': { sc.goals = sc.goals.filter(function (x) { return x.id !== id; }); renderInputs(); refresh(); focusEl('[data-act="add-goal"]'); break; }
      case 'support': {
        var v = b.getAttribute('data-v'); sc.support.answered = v;
        if (v === 'yes' && !sc.support.sources.length) sc.support.sources.push(newSource());
        renderInputs(); refresh(); focusEl('[data-act="support"][data-v="' + v + '"]'); break;
      }
      case 'add-source': { var s = newSource(); sc.support.sources.push(s); renderInputs(); refresh(); focusEl('#sn-' + s.id + '-type'); break; }
      case 'remove-source': { sc.support.sources = sc.support.sources.filter(function (x) { return x.id !== id; }); renderInputs(); refresh(); focusEl('[data-act="add-source"]'); break; }
      case 'finish': { ui.submitted = true; renderScenarios(); refresh(); scrollToResults(); break; }
      case 'switch': { state.active = id; ui.confirm = null; ui.addOpen = false; ui.submitted = false; renderAll(); focusEl('[data-act="switch"][data-id="' + id + '"]'); break; }
      case 'add-open': { ui.addOpen = true; ui.newName = ''; ui.confirm = null; renderScenarios(); focusEl('#sn-new-name'); break; }
      case 'add-close': { ui.addOpen = false; renderScenarios(); focusEl('[data-act="add-open"]'); break; }
      case 'create': {
        var name = (ui.newName || '').trim() || (T.scenario.untitled + ' ' + (state.scenarios.length + 1));
        var created = b.getAttribute('data-mode') === 'copy' ? cloneScenario(sc, name) : newScenario(name);
        state.scenarios.push(created); state.active = created.id;
        ui.addOpen = false; ui.newName = ''; ui.submitted = false; ui.confirm = null;
        renderAll(); focusEl('[data-act="switch"][data-id="' + created.id + '"]'); break;
      }
      case 'ack-copy': { sc.copiedAck = true; renderScenarios(); save(); focusEl('#sn-scn-name'); break; }
      case 'confirm': { ui.confirm = b.getAttribute('data-v') || null; renderScenarios(); renderResults(calc(sc)); focusEl(ui.confirm ? '[role="alertdialog"] button' : '[data-act="confirm"]'); break; }
      case 'remove-scenario': {
        if (state.scenarios.length > 1) {
          var idx = state.scenarios.indexOf(sc);
          state.scenarios.splice(idx, 1);
          state.active = state.scenarios[Math.max(0, idx - 1)].id;
        }
        ui.confirm = null; renderAll(); focusEl('[data-act="switch"][data-id="' + state.active + '"]'); break;
      }
      case 'reset': {
        state = freshState(); ui = freshUi();
        try { root.localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
        renderAll(); focusEl('#sn-scn-name'); break;
      }
    }
  }

  function scrollToResults() {
    els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var t = els.results.querySelector('#sn-results-title');
    if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  }

  function init() {
    var rootEl = document.querySelector('[data-sn]');
    if (!rootEl || rootEl.getAttribute('data-sn-ready')) return;
    rootEl.setAttribute('data-sn-ready', '1');
    els.root = rootEl;
    els.scen = rootEl.querySelector('[data-sn-scenarios]');
    els.inputs = rootEl.querySelector('[data-sn-inputs]');
    els.results = rootEl.querySelector('[data-sn-results]');
    ['attribution', 'title', 'intro', 'supporting'].forEach(function (k) { var el = rootEl.querySelector('[data-t="' + k + '"]'); if (el) el.textContent = TEXT[k]; });
    load();
    renderAll();
    rootEl.addEventListener('input', onInput);
    rootEl.addEventListener('focusout', onBlur);
    rootEl.addEventListener('keydown', onKey);
    rootEl.addEventListener('click', onClick);
    rootEl.addEventListener('toggle', function (e) { if (e.target && e.target.hasAttribute('data-details')) ui.breakdownOpen = e.target.open; }, true);
  }

  var api = { TEXT: TEXT, calc: calc, parseAmount: parseAmount, parseCount: parseCount, goalMonthly: goalMonthly, fmtMoney: fmtMoney, newScenario: newScenario, cloneScenario: cloneScenario, FREQ: FREQ, HOURS_PER_YEAR: HOURS_PER_YEAR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    root.SalaryNeeds = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
