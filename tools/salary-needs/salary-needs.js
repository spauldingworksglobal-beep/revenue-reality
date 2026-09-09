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
      savingsNote: 'Savings count toward what you want your income to support. They’re listed separately from spending in the breakdown.'
    },

    goals: {
      eyebrow: '2. Save toward something once',
      title: 'One-time goals',
      help: 'For something you’re saving toward once—a move, a down payment, a certification—enter the total you need, what you already have, and how many months you want to fund the rest over. Only the monthly contribution counts toward your salary requirement, never the whole goal.',
      cols: { name: 'Goal', goal: 'Total needed', saved: 'Already saved', months: 'Months to fund', monthly: 'Per month' },
      namePh: 'Name this goal',
      add: 'Add a goal',
      empty: 'No one-time goals yet.'
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
      eyebrow: '3. Account for what is already helping',
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
      dash: '—',
      download: 'Download results',
      downloadNote: 'Builds a PDF on your device. Nothing you entered is sent anywhere.',
      downloadError: 'The download didn’t start. Please try again.'
    },

    /* Wording used only inside the generated PDF. */
    pdf: {
      docTitle: 'Salary Needs',
      author: 'Spaulding Works',
      site: 'spauldingworks.global',
      downloaded: 'Downloaded {date}',
      untitled: 'Untitled scenario',
      summaryHead: 'What this version of your life requires',
      periodHead: 'Required take-home, by period',
      expenseHead: 'Expense breakdown, per month',
      supportHead: 'Other income and support, per month',
      goalsHead: 'One-time goals',
      goalLine: '{goal} total, {saved} already saved, over {months} months',
      goalMonths: '{n} months',
      supportTotal: 'Total other income',
      notesHead: 'How these numbers were calculated',
      notes: [
        'Every figure is take-home, after tax. Nothing here is grossed up for taxes.',
        'Recurring amounts are annualized before anything is added together: weekly × 52, every two weeks × 26, twice monthly × 24, monthly × 12, quarterly × 4, annually × 1.',
        'Monthly is annual ÷ 12. Weekly is annual ÷ 52 calendar weeks.',
        'Hourly assumes a {hours}-hour week for {weeks} weeks, {total} working hours a year. It shows what each working hour has to carry; it is not a client billing rate.',
        'Savings contributions count toward what your income has to support, and are listed apart from spending.',
        'A one-time goal contributes only its monthly amount, never the whole goal: (total needed − already saved) ÷ months to fund.',
        'Remaining take-home needed = life requirement − other income and support, and is never shown below zero.'
      ],
      incompleteNote: 'This scenario is incomplete. {n} selected {rows} an amount, so every total here is a floor, not a finished number.',
      surplusNote: 'Other income already covers the entered needs with {x} per month to spare, so nothing is required from the work being evaluated.',
      page: 'Page {n} of {total}',
      none: 'None entered'
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
      A += sub;
      cats.push({ key: k, label: def.label, kind: def.kind, annual: sub, items: items });
    });

    /* One-time goals: their monthly contribution is added to the requirement exactly once, whether or not Savings is selected. */
    var goals = [], goalsAnnual = 0;
    sc.goals.forEach(function (g) {
      hasAnyInput = true;
      var r = goalMonthly(g);
      var name = g.name || 'Goal';
      if (r.state === 'blank') { missing.push({ id: g.id, label: name }); goals.push({ id: g.id, name: name, annual: null, state: 'blank' }); return; }
      if (r.state !== 'ok') { invalid.push({ id: g.id, label: name }); goals.push({ id: g.id, name: name, annual: null, state: 'invalid' }); return; }
      goalsAnnual += r.monthly * 12;
      goals.push({ id: g.id, name: name, annual: r.monthly * 12, monthly: r.monthly, state: 'ok' });
    });
    A += goalsAnnual;

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
      cats: cats, goals: goals, goalsAnnual: goalsAnnual, support: support, supportAnswered: sc.support.answered,
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
     3b. PDF — a tiny, dependency-free writer.

     The document is assembled from the calculator's own numbers, never from
     a screenshot of the page, so the text stays selectable and sharp. Every
     byte is produced here in the visitor's browser: no library is fetched
     and nothing they entered is transmitted anywhere.

     Only the 14 standard PDF fonts are used (Helvetica), so no font file has
     to be embedded. Their advance widths are needed to wrap and right-align
     text, and are listed below in 1/1000 em, for character codes 32-126.
     ========================================================= */
  var HELV = ('278,278,355,556,556,889,667,191,333,333,389,584,278,278,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,' +
    '667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,' +
    '556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584').split(',').map(Number);
  var HELVB = ('278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,' +
    '722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,' +
    '556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584').split(',').map(Number);
  /* Characters outside 32-126 that this tool actually prints, mapped to their
     WinAnsi byte and width. Anything else falls back to a plain equivalent. */
  var HIGH = {
    '\u2014': [151, 1000, 1000], '\u2013': [150, 556, 556], '\u2019': [146, 222, 278], '\u2018': [145, 222, 278],
    '\u201c': [147, 333, 500], '\u201d': [148, 333, 500], '\u00d7': [215, 584, 584], '\u00f7': [247, 584, 584],
    '\u00b7': [183, 278, 278], '\u2022': [149, 350, 350], '\u00a0': [32, 278, 278]
  };
  var PLAIN = { '\u2212': '-', '\u2010': '-', '\u2011': '-' };

  /* Text -> WinAnsi bytes, as a string whose char codes are all 0-255 so that
     string length equals byte length when the cross-reference table is built. */
  function winAnsi(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i), code = str.charCodeAt(i);
      if (PLAIN[ch]) { out += PLAIN[ch]; continue; }
      if (HIGH[ch]) { out += String.fromCharCode(HIGH[ch][0]); continue; }
      out += code < 256 ? ch : '?';
    }
    return out;
  }
  function charWidth(ch, bold) {
    var code = ch.charCodeAt(0);
    if (PLAIN[ch]) { code = PLAIN[ch].charCodeAt(0); }
    if (HIGH[ch]) return HIGH[ch][bold ? 2 : 1];
    if (code >= 32 && code <= 126) return (bold ? HELVB : HELV)[code - 32];
    return bold ? HELVB[31] : HELV[31];
  }
  function textWidth(str, size, bold) {
    var w = 0;
    for (var i = 0; i < str.length; i++) w += charWidth(str.charAt(i), bold);
    return w * size / 1000;
  }
  function pdfEscape(str) { return winAnsi(str).replace(/[\\()]/g, '\\$&').replace(/\r/g, ''); }
  /* Document-info strings use their own encoding, so they go out as UTF-16BE hex. */
  function pdfHexString(str) {
    var hex = 'FEFF', t = String(str);
    for (var i = 0; i < t.length; i++) hex += ('000' + t.charCodeAt(i).toString(16).toUpperCase()).slice(-4);
    return '<' + hex + '>';
  }

  /* Word wrap against real glyph widths, so long labels never run off the page. */
  function wrapText(str, size, bold, maxW) {
    var words = String(str).split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + ' ' + words[i] : words[i];
      if (line && textWidth(next, size, bold) > maxW) { lines.push(line); line = words[i]; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  var PAGE_W = 612, PAGE_H = 792, MARGIN = 54;
  var INK = '0.067 0.067 0.067', CREAM = '0.957 0.945 0.910', YELLOW = '1 0.831 0',
      GRAY = '0.341 0.329 0.302', RULE = '0.82 0.81 0.78', CREAM_DIM = '0.78 0.77 0.74';

  function pdfPage() { return { ops: [] }; }

  /* The document builder: a cursor that walks down the page, opening a new one
     whenever the next block would not fit. */
  function pdfBuilder() {
    var pages = [], page = null, y = 0;
    var api = {
      get y() { return y; },
      set y(v) { y = v; },
      pages: pages,
      newPage: function () { page = pdfPage(); pages.push(page); y = PAGE_H - MARGIN; return page; },
      raw: function (op) { page.ops.push(op); },
      rect: function (x, yy, w, hh, color) { page.ops.push(color + ' rg ' + x.toFixed(2) + ' ' + yy.toFixed(2) + ' ' + w.toFixed(2) + ' ' + hh.toFixed(2) + ' re f'); },
      line: function (x1, yy1, x2, yy2, color, width) {
        page.ops.push((color || RULE) + ' RG ' + (width || 0.7) + ' w ' + x1.toFixed(2) + ' ' + yy1.toFixed(2) + ' m ' + x2.toFixed(2) + ' ' + yy2.toFixed(2) + ' l S');
      },
      /* Draw one line of text. `align` may be 'right'; `track` adds letter spacing. */
      text: function (str, x, yy, size, bold, color, align, track) {
        var t = String(str);
        if (!t) return;
        var w = textWidth(t, size, bold) + (track ? track * (t.length - 1) : 0);
        var tx = align === 'right' ? x - w : x;
        page.ops.push('BT ' + (color || INK) + ' rg /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf' +
          (track ? ' ' + track + ' Tc' : '') +
          ' 1 0 0 1 ' + tx.toFixed(2) + ' ' + yy.toFixed(2) + ' Tm (' + pdfEscape(t) + ') Tj' + (track ? ' 0 Tc' : '') + ' ET');
        return w;
      },
      ensure: function (need, onNewPage) {
        if (y - need < MARGIN + 22) { api.newPage(); if (onNewPage) onNewPage(); }
      }
    };
    return api;
  }

  /* Serialize the assembled pages into PDF bytes. Offsets are counted on a
     string of single-byte characters, so length and byte count agree. */
  function pdfSerialize(pages, meta) {
    var objs = [], out = '%PDF-1.4\n';
    function add(body) { objs.push(body); return objs.length; }
    var catalogId = add(null), pagesId = add(null), fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
        fontBoldId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
        infoId = add('<< /Title ' + pdfHexString(meta.title) + ' /Author ' + pdfHexString(meta.author) + ' /Creator ' + pdfHexString(meta.creator) + ' /Producer ' + pdfHexString(meta.creator) + ' /CreationDate (' + meta.date + ') >>');
    var kids = [];
    pages.forEach(function (p) {
      var stream = p.ops.join('\n');
      var streamId = add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
      var pageId = add('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' + PAGE_W + ' ' + PAGE_H + '] /Resources << /Font << /F1 ' + fontId + ' 0 R /F2 ' + fontBoldId + ' 0 R >> >> /Contents ' + streamId + ' 0 R >>');
      kids.push(pageId + ' 0 R');
    });
    objs[catalogId - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
    objs[pagesId - 1] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + pages.length + ' >>';

    var offsets = [];
    objs.forEach(function (body, i) {
      offsets.push(out.length);
      out += (i + 1) + ' 0 obj\n' + body + '\nendobj\n';
    });
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach(function (off) {
      out += ('0000000000' + off).slice(-10) + ' 00000 n \n';
    });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalogId + ' 0 R /Info ' + infoId + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';

    var bytes = new Uint8Array(out.length);
    for (var i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return bytes;
  }

  function pdfDateStamp(d) {
    function p(n) { return ('0' + n).slice(-2); }
    return 'D:' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }
  function longDate(d) {
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function isoDate(d) {
    function p(n) { return ('0' + n).slice(-2); }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function slug(str) {
    var out = String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
    return out || 'scenario';
  }

  /* Lay the results out as a document. R is a calc() result. */
  function buildPdf(R, scenarioName, now) {
    var P = T.pdf, r = T.results;
    var L = MARGIN, RGT = PAGE_W - MARGIN, COL = RGT - L;
    var b = pdfBuilder();
    var name = scenarioName || P.untitled;

    function continuedHeader() {
      b.rect(0, PAGE_H - 46, PAGE_W, 46, INK);
      b.text(P.docTitle.toUpperCase(), L, PAGE_H - 29, 11, true, CREAM, null, 1.1);
      b.text(name, RGT, PAGE_H - 29, 9, false, CREAM_DIM, 'right');
      b.y = PAGE_H - 46 - 30;
    }
    function sectionHead(label) {
      b.ensure(46, continuedHeader);
      b.y -= 10;
      b.text(label.toUpperCase(), L, b.y, 8, true, GRAY, null, 0.9);
      b.y -= 8;
      b.line(L, b.y, RGT, b.y, INK, 1.2);
      b.y -= 16;
    }
    /* label left, value right; `indent` steps the label in for sub-rows. */
    function row(label, value, opts) {
      opts = opts || {};
      var size = opts.size || 10, bold = !!opts.bold, indent = opts.indent || 0;
      var color = opts.color || (opts.muted ? GRAY : INK);
      var valW = value ? textWidth(String(value), size, bold) : 0;
      var lines = wrapText(label, size, bold, COL - indent - valW - 18);
      b.ensure(lines.length * (size + 4) + 6, continuedHeader);
      for (var i = 0; i < lines.length; i++) {
        b.text(lines[i], L + indent, b.y, size, bold, color);
        if (i === 0 && value) b.text(value, RGT, b.y, size, bold, opts.valueColor || color, 'right');
        b.y -= size + 4;
      }
      if (opts.rule) { b.y -= 4; b.line(L, b.y, RGT, b.y, RULE, 0.7); b.y -= 8; }
      else b.y -= opts.gap === undefined ? 2 : opts.gap;
    }
    function para(str, opts) {
      opts = opts || {};
      var size = opts.size || 9, indent = opts.indent || 0;
      var lines = wrapText(str, size, false, COL - indent);
      b.ensure(lines.length * (size + 3.5) + 4, continuedHeader);
      for (var i = 0; i < lines.length; i++) {
        b.text(lines[i], L + indent, b.y, size, false, opts.color || GRAY);
        b.y -= size + 3.5;
      }
      b.y -= opts.gap === undefined ? 6 : opts.gap;
    }
    function money(v) { return v === null || v === undefined ? r.dash : fmtMoney(v); }
    function monthly(annual) { return annual === null ? r.dash : fmtMoney(annual / 12); }

    /* ---- cover band ---- */
    b.newPage();
    var bandH = 150;
    b.rect(0, PAGE_H - bandH, PAGE_W, bandH, INK);
    b.rect(L, PAGE_H - bandH + 26, 46, 4, YELLOW);
    b.text(T.attribution.toUpperCase(), L, PAGE_H - 46, 8, true, YELLOW, null, 1.4);
    b.text(P.docTitle.toUpperCase(), L, PAGE_H - 86, 30, true, CREAM, null, 0.6);
    b.text(name, L, PAGE_H - 108, 12, false, CREAM);
    b.text(fill(P.downloaded, { date: longDate(now) }), RGT, PAGE_H - 108, 9, false, CREAM_DIM, 'right');
    b.y = PAGE_H - bandH - 34;

    if (R.incomplete) {
      b.rect(L, b.y - 4, COL, 22, '0.99 0.95 0.72');
      b.text(fill(P.incompleteNote, { n: R.missing.length, rows: R.missing.length === 1 ? 'row still needs' : 'rows still need' }), L + 10, b.y + 4, 8.5, true, INK);
      b.y -= 34;
    }

    /* ---- headline ---- */
    sectionHead(P.summaryHead);
    row(r.requires, money(R.A / 12) + ' ' + r.perMonth, { size: 11 });
    row(r.supported, (R.supportAnswered === 'yes' ? '\u2212' : '') + money(R.B / 12) + ' ' + r.perMonth, { size: 11, rule: true });
    b.ensure(52, continuedHeader);
    b.text(r.need.toUpperCase(), L, b.y, 9, true, GRAY, null, 0.9);
    b.y -= 30;
    b.text(fmtMoney(R.C / 12), L, b.y, 28, true, INK);
    b.text(r.perMonth, L + textWidth(fmtMoney(R.C / 12), 28, true) + 8, b.y + 2, 10, false, GRAY);
    b.y -= 10;
    b.rect(L, b.y, Math.min(COL, textWidth(fmtMoney(R.C / 12), 28, true) + 8), 4, YELLOW);
    b.y -= 22;
    if (R.supportSurplus > 0.005) para(fill(P.surplusNote, { x: fmtMoney(R.supportSurplus / 12) }));

    /* ---- period table ---- */
    sectionHead(P.periodHead);
    ['annual', 'monthly', 'weekly', 'hourly'].forEach(function (k, i) {
      row(r.cols[k], fmtMoney(R.need[k], k === 'hourly' ? 'always' : undefined), { size: 10, rule: i < 3, bold: k === 'monthly' });
    });

    /* ---- expenses ---- */
    sectionHead(P.expenseHead);
    var spending = R.cats.filter(function (c) { return c.kind === 'spending'; });
    var savings = R.cats.filter(function (c) { return c.kind === 'savings'; });
    if (!spending.length) row(P.none, '', { size: 10, muted: true });
    spending.forEach(function (c) {
      row(c.label, monthly(c.annual), { size: 10, bold: true, gap: 4 });
      c.items.forEach(function (it) { row(it.name, monthly(it.annual), { size: 9, indent: 14, muted: true }); });
      b.y -= 6;
    });
    var savingsItems = [];
    savings.forEach(function (c) { savingsItems = savingsItems.concat(c.items); });
    if (savingsItems.length) {
      row(r.savings, '', { size: 10, bold: true, gap: 4 });
      savingsItems.forEach(function (it) { row(it.name, monthly(it.annual), { size: 9, indent: 14, muted: true }); });
      b.y -= 6;
    }
    if (R.goals.length) {
      row(P.goalsHead, '', { size: 10, bold: true, gap: 4 });
      R.goals.forEach(function (g) {
        b.ensure(40, continuedHeader);
        row(g.name, g.annual === null ? r.dash : fmtMoney(g.monthly), { size: 9, indent: 14 });
        var raw = null;
        (activeScenarioGoals || []).forEach(function (x) { if (x.id === g.id) raw = x; });
        if (raw) {
          var detail = fill(P.goalLine, {
            goal: raw.goal ? fmtMoney(parseAmount(raw.goal).value) : r.dash,
            saved: raw.saved && parseAmount(raw.saved).state === 'ok' ? fmtMoney(parseAmount(raw.saved).value) : fmtMoney(0),
            months: raw.months || r.dash
          });
          para(detail, { size: 8, indent: 14, gap: 4 });
        }
      });
      b.y -= 2;
    }
    b.ensure(40, continuedHeader);
    b.y -= 2;
    b.line(L, b.y, RGT, b.y, INK, 1.2); b.y -= 14;
    row(r.total, money(R.A / 12) + ' ' + r.perMonth, { size: 11, bold: true });

    /* ---- support ---- */
    sectionHead(P.supportHead);
    if (R.supportAnswered === null) row(r.notAnswered, '', { size: 10, muted: true });
    else if (!R.support.length) row(P.none, '', { size: 10, muted: true });
    else {
      R.support.forEach(function (srcRow) { row(srcRow.name, monthly(srcRow.annual), { size: 10 }); });
      b.ensure(34, continuedHeader);
      b.y -= 4; b.line(L, b.y, RGT, b.y, RULE, 0.7); b.y -= 12;
      row(P.supportTotal, money(R.B / 12) + ' ' + r.perMonth, { size: 10, bold: true });
    }

    /* ---- notes ---- */
    sectionHead(P.notesHead);
    P.notes.forEach(function (note) {
      var line = fill(note, { hours: fmtNum(R.hours.perWeek), weeks: fmtNum(R.hours.weeks), total: fmtNum(R.hours.perYear) });
      b.ensure(20, continuedHeader);
      b.text('\u2022', L, b.y, 9, false, GRAY);
      para(line, { size: 9, indent: 14, gap: 4 });
    });

    /* ---- footers, once the page count is known ---- */
    var total = b.pages.length;
    b.pages.forEach(function (p, i) {
      var save = b.pages[i];
      b.raw = function (op) { save.ops.push(op); };
      var yy = MARGIN - 18;
      save.ops.push(RULE + ' RG 0.7 w ' + L + ' ' + (yy + 14) + ' m ' + RGT + ' ' + (yy + 14) + ' l S');
      save.ops.push('BT ' + GRAY + ' rg /F1 8 Tf 1 0 0 1 ' + L + ' ' + yy + ' Tm (' + pdfEscape(T.attribution + ' \u00b7 ' + P.site) + ') Tj ET');
      var pageLabel = fill(P.page, { n: i + 1, total: total });
      save.ops.push('BT ' + GRAY + ' rg /F1 8 Tf 1 0 0 1 ' + (RGT - textWidth(pageLabel, 8, false)).toFixed(2) + ' ' + yy + ' Tm (' + pdfEscape(pageLabel) + ') Tj ET');
    });

    return pdfSerialize(b.pages, {
      title: P.docTitle + ' \u2014 ' + name,
      author: P.author,
      creator: P.docTitle + ', a tool by ' + P.author,
      date: pdfDateStamp(now)
    });
  }

  /* The goal rows as the visitor typed them, so the PDF can show the inputs
     behind each monthly contribution. Set just before a document is built. */
  var activeScenarioGoals = null;

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
  function freshUi() { return { touched: {}, submitted: false, addOpen: false, newName: '', confirm: null, breakdownOpen: false, dlError: false }; }
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
      '<div class="sn-cell sn-cell-name"><label class="sn-cell-label" for="sn-' + g.id + '-name">' + h(T.goals.cols.name) + '</label><input class="sn-input" id="sn-' + g.id + '-name" type="text" autocomplete="off" placeholder="' + h(T.goals.namePh) + '" value="' + h(g.name) + '" data-id="' + g.id + '" data-f="name"></div>' +
      '<div class="sn-cell">' + moneyInput(g.id, 'goal', g.goal, T.goals.cols.goal) + errFor(g.id) + '</div>' +
      '<div class="sn-cell">' + moneyInput(g.id, 'saved', g.saved, T.goals.cols.saved) + '</div>' +
      '<div class="sn-cell sn-cell-months"><label class="sn-cell-label" for="sn-' + g.id + '-months">' + h(T.goals.cols.months) + '</label><input class="sn-input" id="sn-' + g.id + '-months" type="text" inputmode="numeric" autocomplete="off" placeholder="12" value="' + h(g.months) + '" data-id="' + g.id + '" data-f="months" aria-describedby="sn-err-' + g.id + '"></div>' +
      '<div class="sn-cell sn-cell-out"><span class="sn-cell-label">' + h(T.goals.cols.monthly) + '</span><div class="sn-goal-out"><b data-goal-monthly="' + g.id + '">' + T.results.dash + '</b><small>' + h(T.goals.cols.monthly) + '</small></div></div>' +
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

      '<section class="sn-step sn-goals" aria-labelledby="sn-sg"><p class="v2-eyebrow">' + h(T.goals.eyebrow) + '</p><h2 class="sn-q" id="sn-sg">' + h(T.goals.title) + '</h2>' +
      '<p class="sn-help">' + h(T.goals.help) + '</p>' +
      (sc.goals.length ? '<div class="sn-cols-goal" aria-hidden="true"><span>' + h(T.goals.cols.name) + '</span><span>' + h(T.goals.cols.goal) + '</span><span>' + h(T.goals.cols.saved) + '</span><span>' + h(T.goals.cols.months) + '</span><span>' + h(T.goals.cols.monthly) + '</span><span></span></div>' + sc.goals.map(goalRow).join('') : '<p class="sn-empty">' + h(T.goals.empty) + '</p>') +
      '<div class="sn-goals-add"><button type="button" class="sn-btn" data-act="add-goal">+ ' + h(T.goals.add) + '</button></div>' +
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
    /* The download only appears once there is a real, usable result behind it. */
    var canDownload = R.A > 0.005 && R.invalid.length === 0;
    var sentence;
    if (!R.hasAnyInput && !R.cats.length && !R.goals.length) sentence = h(r.sentenceEmpty);
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
    var savingsItems = [], goalItems = R.goals;
    savings.forEach(function (c) { savingsItems = savingsItems.concat(c.items); });
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
      (canDownload ? '<div class="sn-dl"><button type="button" class="sn-btn sn-btn-yellow" data-act="download">' + h(r.download) + '</button><p class="sn-dl-note">' + h(ui.dlError ? r.downloadError : r.downloadNote) + '</p></div>' : '') +
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
    });
    R.goals.forEach(function (g) {
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
      case 'download': { downloadResults(); break; }
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

  /* Build the active scenario as a PDF and hand it to the browser. The file is
     assembled here and released through an object URL; it never leaves the device. */
  function downloadResults() {
    var sc = active(), now = new Date();
    try {
      activeScenarioGoals = sc.goals;
      var bytes = buildPdf(calc(sc), (sc.name || '').trim(), now);
      var url = root.URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      var a = document.createElement('a');
      a.href = url;
      a.download = 'salary-needs-' + slug(sc.name) + '-' + isoDate(now) + '.pdf';
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      root.setTimeout(function () { root.URL.revokeObjectURL(url); }, 4000);
      if (ui.dlError) { ui.dlError = false; refresh(); }
    } catch (err) {
      ui.dlError = true;
      refresh();
    } finally {
      activeScenarioGoals = null;
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

  var api = { TEXT: TEXT, calc: calc, buildPdf: buildPdf, slug: slug, isoDate: isoDate, textWidth: textWidth, winAnsi: winAnsi, HELV: HELV, HELVB: HELVB, setGoalsForPdf: function (g) { activeScenarioGoals = g; }, parseAmount: parseAmount, parseCount: parseCount, goalMonthly: goalMonthly, fmtMoney: fmtMoney, newScenario: newScenario, cloneScenario: cloneScenario, FREQ: FREQ, HOURS_PER_YEAR: HOURS_PER_YEAR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    root.SalaryNeeds = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
