/* share.niveshsahayak.in: make a snapshot of the shop's own data for another person's phone (platform group P3, plat-share).
   Six things: party statement with UPI pay, catalogue to order from by WhatsApp (+ turn a pasted order into a draft Sales Order),
   e-receipt with warranty card, feedback / review QR, loyalty stamp cards, staff phone view. Each one is packed by NSShareCore
   into a link whose data sits after the # (never sent to any server) or a small file, shown to the owner exactly as the other person
   will see it, with the limits stated. Only what the owner ticks goes in. Screen words: NS.t('sh.*'); the viewer uses sv.*. */
(function () {
  'use strict';
  var NS = window.NS, $ = NS.$, $$ = NS.$$, esc = NS.esc, t = function (k, v) { return NS.t(k, v); }, C = window.NSShareCore, B = window.NSBooks, V = window.NSShareView;
  var VIEW = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://' + location.hostname + ':' + (window.NS_VIEW_PORT || 8896) + '/' : 'https://view.niveshsahayak.in/';
  var TABS = ['stmt', 'cat', 'rcpt', 'loy', 'staff', 'order'];
  var root, tab = 'stmt', bizs = [], docs = [], items = [], biz = null, S = {}, LOY = { prog: { title: '', goal: 10, reward: '', terms: '' }, cards: [], fb: { ask: '', review: '', wa: '' } }, ST = {}, made = null;

  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : 0; }
  function biz2() { return biz ? { n: biz.name, p: S.phone === false ? '' : biz.phone, u: S.upi === false ? '' : biz.upi, g: S.gstin ? biz.gstin : '', a: S.addr ? [biz.addr, biz.city].filter(Boolean).join(', ') : '' } : {}; }
  function mine() { return docs.filter(function (d) { return d.seller && biz && String(d.seller.name || '').trim().toLowerCase() === String(biz.name || '').trim().toLowerCase(); }); }
  function today() { return NS.today(); }
  function sel(id, opts, val, attrs) { return '<select id="' + id + '" class="gt-in"' + (attrs || '') + '>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
  function chk(id, label, on, hint) { return '<label class="sh-chk"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '> <span>' + esc(label) + (hint ? ' <small class="soft">' + esc(hint) + '</small>' : '') + '</span></label>'; }
  function val(id) { var n = $('#' + id, root); return n ? n.value : ''; }
  function on(id) { var n = $('#' + id, root); return !!(n && n.checked); }
  function saveS() { try { localStorage.setItem('ns-share', JSON.stringify(S)); } catch (e) {} }

  /* ---------- the common part: what goes in, expiry, passcode, then the result ---------- */
  function common(opt) {
    opt = opt || {};
    var days = S.days == null ? 30 : S.days;
    return '<div class="gt-card"><h3>' + esc(t('sh.inc')) + '</h3><p class="soft">' + esc(t('sh.inc.h')) + '</p>' +
      chk('c-phone', t('sh.i.phone'), S.phone !== false) + chk('c-upi', t('sh.i.upi'), S.upi !== false && !opt.noUpi, opt.noUpi ? '' : t('sh.i.upih')) + chk('c-gstin', t('sh.i.gstin'), !!S.gstin) + chk('c-addr', t('sh.i.addr'), !!S.addr) +
      '<div class="fg"><div><label class="gt-lbl" for="c-days">' + esc(t('sh.days')) + '</label>' + sel('c-days', [[0, t('sh.d.none')], [7, t('sh.d.n', { n: 7 })], [15, t('sh.d.n', { n: 15 })], [30, t('sh.d.n', { n: 30 })], [90, t('sh.d.n', { n: 90 })], [365, t('sh.d.n', { n: 365 })]], opt.days != null ? opt.days : days) + '<small class="soft">' + esc(t('sh.days.h')) + '</small></div>' +
      '<div><label class="gt-lbl" for="c-pass">' + esc(t('sh.pass')) + (opt.passReq ? ' *' : '') + '</label><input id="c-pass" class="gt-in" autocomplete="off" value="' + esc(opt.pass || '') + '" placeholder="' + esc(t('sh.pass.ph')) + '"><small class="soft">' + esc(t('sh.pass.h')) + '</small></div></div>' +
      '<div class="row"><button type="button" class="btn primary" data-make>' + esc(t('sh.make')) + '</button></div></div><div data-result></div>';
  }
  function bizPick() {
    return '<div class="gt-card"><label class="gt-lbl" for="b-sel">' + esc(t('sh.biz')) + '</label>' + (bizs.length ? sel('b-sel', bizs.map(function (b) { return [b.id, b.name]; }), biz && biz.id) +
      (biz && !biz.upi ? '<p class="note">' + esc(t('sh.noupi')) + ' <a href="https://my.niveshsahayak.in/#biz">' + esc(t('sh.addupi')) + '</a></p>' : '') : '<p class="note">' + esc(t('sh.nobiz')) + ' <a href="https://my.niveshsahayak.in/#biz">' + esc(t('sh.addbiz')) + '</a></p>') + '</div>';
  }

  /* ---------- each tab draws its own choices and returns [kind, data, opts] from build() ---------- */
  var BUILD = null;
  function tabStmt() {
    var P = biz ? B.parties(mine(), biz.name) : {}, keys = Object.keys(P).filter(function (k) { return P[k].bal > 0.004 || ST.all; }).sort(function (a, b) { return P[b].bal - P[a].bal; });
    BUILD = function () {
      var k = val('s-party'); if (!k) return null;
      var d = C.statementData(B, mine(), biz.name, k, { rows: on('s-rows') ? num(val('s-n')) || 12 : 0, bills: on('s-bills') });
      return d ? ['stmt', d, { noUpi: false }] : null;
    };
    return bizPick() + '<div class="gt-card"><h2>' + esc(t('sh.st.t')) + '</h2><p class="soft">' + esc(t('sh.st.h')) + '</p>' +
      (keys.length ? '<label class="gt-lbl" for="s-party">' + esc(t('sh.st.party')) + '</label>' + sel('s-party', keys.map(function (k) { return [k, P[k].name + ' - ' + NS.money(P[k].bal)]; }), ST.party) +
        chk('s-all', t('sh.st.all'), !!ST.all) + chk('s-bills', t('sh.st.bills'), true) + chk('s-rows', t('sh.st.rows'), true) + '<div class="fg"><div><label class="gt-lbl" for="s-n">' + esc(t('sh.st.n')) + '</label><input id="s-n" class="gt-in" type="number" min="1" max="40" value="12"></div></div>' +
        '<p class="note">' + esc(t('sh.st.wa')) + '</p>' : '<p class="note">' + esc(t('sh.st.none')) + '</p>') + '</div>' + (keys.length ? common() : '');
  }
  function tabCat() {
    var skip = ST.skip || {};
    BUILD = function () {
      var sk = {}; items.forEach(function (it) { if (!on('i-' + it.id)) sk[it.id] = 1; });
      var d = C.catalogueData(items, { skip: sk, note: val('k-note'), min: num(val('k-min')), mrp: on('k-mrp'), gm: val('k-gm') });
      return d.items.length ? ['cat', d, {}] : null;
    };
    var priced = items.filter(function (it) { return num(it.rate) > 0; });
    return bizPick() + '<div class="gt-card"><h2>' + esc(t('sh.ct.t')) + '</h2><p class="soft">' + esc(t('sh.ct.h')) + '</p>' +
      (priced.length ? '<div class="sh-list">' + priced.map(function (it) { return chk('i-' + it.id, it.desc + ' - ' + NS.money(num(it.rate)) + (it.unit ? ' / ' + it.unit : ''), !skip[it.id]); }).join('') + '</div>' +
        '<div class="row"><button type="button" class="btn sm" data-allitems="1">' + esc(t('sh.all')) + '</button><button type="button" class="btn sm" data-allitems="0">' + esc(t('sh.none')) + '</button></div>' +
        '<div class="fg"><div><label class="gt-lbl" for="k-min">' + esc(t('sh.ct.min')) + '</label><input id="k-min" class="gt-in" inputmode="decimal" value="' + esc(ST.min || '') + '"></div>' +
        '<div><label class="gt-lbl" for="k-note">' + esc(t('sh.ct.note')) + '</label><input id="k-note" class="gt-in" maxlength="300" value="' + esc(ST.note || '') + '" placeholder="' + esc(t('sh.ct.noteph')) + '"></div></div>' + '<label class="gt-lbl" for="k-gm">' + esc(t('sh.ct.gm')) + '</label>' + sel('k-gm', [['incl', t('sh.ct.gm.incl')], ['plus', t('sh.ct.gm.plus')], ['none', t('sh.ct.gm.none')]], ST.gm || 'incl') + chk('k-mrp', t('sh.ct.mrp'), false) +
        '<p class="note">' + esc(t('sh.ct.lim')) + '</p>' : '<p class="note">' + esc(t('sh.ct.none')) + ' <a href="https://price-list.niveshsahayak.in/">' + esc(t('sh.ct.pl')) + '</a></p>') + '</div>' + (priced.length ? common({ noUpi: true }) : '');
  }
  function billTotal(d) { try { return B.itemTotals(d).total; } catch (e) { return 0; } }
  function tabRcpt() {
    var bills = mine().filter(function (d) { return (d.type === 'invoice' || d.type === 'cashmemo') && d.items && d.items.length; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).slice(0, 40);
    var d = bills.filter(function (x) { return x.id === ST.bill; })[0] || bills[0], w = d && d.war || {};
    BUILD = function () {
      var dd = bills.filter(function (x) { return x.id === val('r-bill'); })[0]; if (!dd) return null;
      var months = [], serial = []; (dd.items || []).forEach(function (it, i) { months.push(num(val('r-m' + i))); serial.push(val('r-s' + i).trim()); });
      var war = { months: months, serial: serial, terms: val('r-terms'), claim: val('r-claim') };
      dd.war = war; NSStore.put('doc', dd).catch(function () {});   /* the bill keeps its warranty terms */
      return ['rcpt', C.receiptData(dd, billTotal(dd), war), { noUpi: true }];
    };
    return bizPick() + '<div class="gt-card"><h2>' + esc(t('sh.rc.t')) + '</h2><p class="soft">' + esc(t('sh.rc.h')) + '</p>' +
      (bills.length ? '<label class="gt-lbl" for="r-bill">' + esc(t('sh.rc.bill')) + '</label>' + sel('r-bill', bills.map(function (x) { return [x.id, (x.no || '') + ' · ' + NS.fmtDate(x.date) + ' · ' + ((x.buyer && x.buyer.name) || '') + ' · ' + NS.money(billTotal(x))]; }), d.id) +
        '<h3>' + esc(t('sh.rc.items')) + '</h3>' + d.items.map(function (it, i) { return '<div class="fg sh-line"><div><b>' + esc(it.desc || '') + '</b></div><div><label class="gt-lbl" for="r-m' + i + '">' + esc(t('sh.rc.months')) + '</label><input id="r-m' + i + '" class="gt-in" type="number" min="0" max="120" value="' + esc((w.months || [])[i] || 0) + '"></div><div><label class="gt-lbl" for="r-s' + i + '">' + esc(t('sh.rc.serial')) + '</label><input id="r-s' + i + '" class="gt-in" maxlength="30" value="' + esc((w.serial || [])[i] || '') + '"></div></div>'; }).join('') +
        '<label class="gt-lbl" for="r-terms">' + esc(t('sh.rc.terms')) + '</label><textarea id="r-terms" class="gt-in" rows="3" maxlength="600" placeholder="' + esc(t('sh.rc.termsph')) + '">' + esc(w.terms || S.terms || '') + '</textarea>' +
        '<label class="gt-lbl" for="r-claim">' + esc(t('sh.rc.claim')) + '</label><input id="r-claim" class="gt-in" maxlength="120" value="' + esc(w.claim || S.claim || '') + '">' +
        '<p class="note">' + esc(t('sh.rc.note')) + '</p>' : '<p class="note">' + esc(t('sh.rc.none')) + '</p>') + '</div>' + (bills.length ? common({ noUpi: true, days: 0 }) : '');
  }
  function tabLoy() {
    var p = LOY.prog, f = LOY.fb, cards = LOY.cards;
    BUILD = function () {
      var kind = ST.mk;
      if (kind === 'fb') { var fd = C.feedbackData({ ask: val('f-ask'), review: val('f-rev'), wa: val('f-wa') || (biz && biz.phone) || '' }); if (val('f-rev') && !fd.review) { NS.toast(t('sh.fb.badurl'), 'bad'); return null; } LOY.fb = { ask: val('f-ask'), review: val('f-rev'), wa: val('f-wa') }; saveLoy(); return ['fb', fd, { noUpi: true, days: 0 }]; }
      var c = cards.filter(function (x) { return x.id === ST.card; })[0]; if (!c) return null;
      return ['loy', C.loyaltyData(c, p), { noUpi: true, days: 0 }];
    };
    var cur = cards.filter(function (x) { return x.id === ST.card; })[0], v = cur && C.loyaltyView(cur, p.goal || 10);
    return bizPick() + '<div class="gt-card"><h2>' + esc(t('sh.fb.t')) + '</h2><p class="soft">' + esc(t('sh.fb.h')) + '</p>' +
      '<div class="fg"><div><label class="gt-lbl" for="f-ask">' + esc(t('sh.fb.ask')) + '</label><input id="f-ask" class="gt-in" maxlength="120" value="' + esc(f.ask) + '" placeholder="' + esc(t('sh.fb.askph')) + '"></div>' +
      '<div><label class="gt-lbl" for="f-rev">' + esc(t('sh.fb.rev')) + '</label><input id="f-rev" class="gt-in" type="url" value="' + esc(f.review) + '" placeholder="https://g.page/r/..."><small class="soft">' + esc(t('sh.fb.revh')) + '</small></div>' +
      '<div><label class="gt-lbl" for="f-wa">' + esc(t('sh.fb.wa')) + '</label><input id="f-wa" class="gt-in" inputmode="tel" value="' + esc(f.wa) + '"></div></div>' +
      '<p class="note">' + esc(t('sh.fb.policy')) + '</p><div class="row"><button type="button" class="btn primary" data-mk="fb">' + esc(t('sh.fb.make')) + '</button><button type="button" class="btn" data-stickers>' + esc(t('sh.fb.stickers')) + '</button></div></div>' +
      '<div class="gt-card"><h2>' + esc(t('sh.ly.t')) + '</h2><p class="soft">' + esc(t('sh.ly.h')) + '</p>' +
      '<div class="fg"><div><label class="gt-lbl" for="l-title">' + esc(t('sh.ly.prog')) + '</label><input id="l-title" class="gt-in" maxlength="60" value="' + esc(p.title) + '" placeholder="' + esc(t('sh.ly.progph')) + '"></div>' +
      '<div><label class="gt-lbl" for="l-goal">' + esc(t('sh.ly.goal')) + '</label><input id="l-goal" class="gt-in" type="number" min="2" max="30" value="' + esc(p.goal || 10) + '"></div>' +
      '<div><label class="gt-lbl" for="l-reward">' + esc(t('sh.ly.reward')) + '</label><input id="l-reward" class="gt-in" maxlength="60" value="' + esc(p.reward) + '" placeholder="' + esc(t('sh.ly.rewardph')) + '"></div></div>' +
      '<div class="row"><button type="button" class="btn" data-lsave>' + esc(t('sh.ly.save')) + '</button></div>' +
      '<h3>' + esc(t('sh.ly.cards')) + '</h3><div class="fg"><div><label class="gt-lbl" for="l-name">' + esc(t('sh.ly.cname')) + '</label><input id="l-name" class="gt-in" maxlength="40"></div><div class="sh-end"><button type="button" class="btn" data-ladd>' + esc(t('sh.ly.add')) + '</button></div></div>' +
      (cards.length ? '<div class="gt-scroll"><table class="gt-tbl gt-list"><thead><tr><th>' + esc(t('sh.ly.cname')) + '</th><th class="n">' + esc(t('sh.ly.stamps')) + '</th><th></th></tr></thead><tbody>' + cards.map(function (c) {
        var w = C.loyaltyView(c, p.goal || 10); return '<tr><td>' + esc(c.name) + '</td><td class="n">' + w.filled + ' / ' + w.goal + (w.rewards ? ' · <b>' + esc(t('sh.ly.rw')) + '</b>' : '') + '</td><td class="sh-acts"><button type="button" class="btn sm" data-stamp="' + esc(c.id) + '">+1</button>' +
          (w.rewards ? '<button type="button" class="btn sm" data-give="' + esc(c.id) + '">' + esc(t('sh.ly.give')) + '</button>' : '') + '<button type="button" class="btn sm" data-mk="loy" data-card="' + esc(c.id) + '">' + esc(t('sh.ly.link')) + '</button><button type="button" class="btn sm" data-ldel="' + esc(c.id) + '" aria-label="' + esc(t('sh.del')) + '">×</button></td></tr>'; }).join('') + '</tbody></table></div>' : '') +
      '<p class="note">' + esc(t('sh.ly.note')) + '</p></div>' + common({ noUpi: true, days: 0 });
  }
  function tabStaff() {
    var slips = mine().filter(function (d) { return d.type === 'salary' && d.buyer && d.buyer.name; }).sort(function (a, b) { return String(b.month).localeCompare(String(a.month)); }).slice(0, 60);
    var d = slips.filter(function (x) { return x.id === ST.slip; })[0] || slips[0];
    var pass = ST.pass || String(Math.floor(1000 + Math.random() * 9000)); ST.pass = pass;
    BUILD = function () {
      var s = slips.filter(function (x) { return x.id === val('t-slip'); })[0]; if (!s) return null;
      var name = String(s.buyer.name).trim().toLowerCase();
      var adv = mine().filter(function (x) { return x.type === 'sadv' && String(x.emp || (x.buyer && x.buyer.name) || '').trim().toLowerCase() === name; });
      return attendance(s).then(function (att) { return ['staff', C.staffData(s, B, adv, on('t-att') ? att : null, { slip: on('t-slip-on'), adv: on('t-adv') }), { noUpi: true, days: 15, passReq: true }]; });
    };
    return bizPick() + '<div class="gt-card"><h2>' + esc(t('sh.sf.t')) + '</h2><p class="soft">' + esc(t('sh.sf.h')) + '</p>' +
      (slips.length ? '<label class="gt-lbl" for="t-slip">' + esc(t('sh.sf.slip')) + '</label>' + sel('t-slip', slips.map(function (x) { return [x.id, x.buyer.name + ' · ' + x.month]; }), d.id) +
        chk('t-slip-on', t('sh.sf.i.slip'), true) + chk('t-att', t('sh.sf.i.att'), true, t('sh.sf.i.atth')) + chk('t-adv', t('sh.sf.i.adv'), true) + '<p class="note"><b>' + esc(t('sh.sf.warn')) + '</b> ' + esc(t('sh.sf.warn2')) + '</p>' : '<p class="note">' + esc(t('sh.sf.none')) + ' <a href="https://salary-slip.niveshsahayak.in/">' + esc(t('sh.sf.mk')) + '</a></p>') + '</div>' + (slips.length ? common({ noUpi: true, days: 15, passReq: true, pass: pass }) : '');
  }
  /* attendance: the payroll feature (meta 'attendance', branch gap-pay) when it exists; else nothing is included. Hook: NS.shareHooks.attendance(empName, month) may return a promise of {day: code} */
  function attendance(slip) {
    var hk = NS.shareHooks && NS.shareHooks.attendance;
    if (hk) return Promise.resolve(hk(slip.buyer.name, slip.month)).catch(function () { return null; });
    return Promise.all([NSStore.meta('attendance'), NSStore.meta('staff')]).then(function (r) {
      var a = r[0], s = r[1], nm = String(slip.buyer.name).trim().toLowerCase();
      var e = s && s.emps && s.emps.filter(function (x) { return String(x.name).trim().toLowerCase() === nm; })[0];
      var m = a && a.months && a.months[slip.month] && e && a.months[slip.month][e.id];
      return m && m.d ? m.d : null;
    }).catch(function () { return null; });
  }
  function tabOrder() {
    BUILD = null;
    var po = ST.po;
    return bizPick() + '<div class="gt-card"><h2>' + esc(t('sh.or.t')) + '</h2><p class="soft">' + esc(t('sh.or.h')) + '</p><label class="gt-lbl" for="o-text">' + esc(t('sh.or.paste')) + '</label><textarea id="o-text" class="gt-in" rows="6" spellcheck="false">' + esc(ST.otext || '') + '</textarea>' +
      '<div class="row"><button type="button" class="btn primary" data-oread>' + esc(t('sh.or.read')) + '</button></div>' +
      (po ? (po.items.length ? '<h3>' + esc(t('sh.or.found', { n: po.items.length })) + '</h3><p>' + esc(po.name || t('sh.or.noname')) + '</p>' + '<div class="gt-scroll"><table class="gt-tbl gt-list"><thead><tr><th>' + esc(t('sv.item')) + '</th><th class="n">' + esc(t('sv.qty')) + '</th><th class="n">' + esc(t('sv.rate')) + '</th><th class="n">' + esc(t('sv.amt')) + '</th></tr></thead><tbody>' +
        po.items.map(function (r) { return '<tr><td>' + esc(r.desc) + '</td><td class="n">' + r.qty + ' ' + esc(r.unit) + '</td><td class="n">' + NS.money(r.rate) + '</td><td class="n">' + NS.money(r.amount) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="fg"><div><label class="gt-lbl" for="o-gst">' + esc(t('sh.or.gst')) + '</label>' + sel('o-gst', [[0, '0%'], [5, '5%'], [12, '12%'], [18, '18%'], [28, '28%']], ST.gst == null ? 18 : ST.gst) + '</div></div><div class="row"><button type="button" class="btn primary" data-odraft>' + esc(t('sh.or.draft')) + '</button></div><p class="soft">' + esc(t('sh.or.note')) + '</p>' + (ST.draftId ? '<p class="ok-note">' + esc(t('sh.or.done')) + ' <a class="btn sm" href="' + esc(siteUrl('sales-order') + '?open=' + ST.draftId) + '">' + esc(t('sh.or.open')) + '</a></p>' : '') : '<p class="note">' + esc(t('sh.or.empty')) + '</p>') : '') + '</div>';
  }
  function siteUrl(s) { var x = ((window.NS_CFG && NS_CFG.tools) || []).filter(function (a) { return a[0] === s; })[0]; return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && x ? 'http://localhost:' + x[4] + '/' : 'https://' + (x ? x[1] : s + '.niveshsahayak.in') + '/'; }

  /* ---------- result ---------- */
  function sizeNote(sz) { return sz.chat ? t('sh.sz.ok', { n: sz.len }) : sz.cut ? t('sh.sz.cut', { n: sz.len }) : t('sh.sz.file', { n: sz.len }); }
  function make(over) {
    var out = $('[data-result]', root); if (!out || !BUILD) return;
    var days = val('c-days'), pass = val('c-pass').trim();
    S.phone = on('c-phone'); S.upi = on('c-upi'); S.gstin = on('c-gstin'); S.addr = on('c-addr'); S.days = +days; saveS();
    if (!biz) { NS.toast(t('sh.nobiz'), 'bad'); return; }
    Promise.resolve(BUILD()).then(function (r) {
      if (!r) { NS.toast(t('sh.nothing'), 'bad'); return null; }
      if (r[2].passReq && !pass) { NS.toast(t('sh.needpass'), 'bad'); return null; }
      if (pass && !C.canCrypt()) { NS.toast(t('sh.nocrypto'), 'bad'); return null; }
      var env = C.make(r[0], biz2(), r[1], { days: +days });
      return C.pack(env, { pass: pass || null }).then(function (tok) { made = { env: env, tok: tok, pass: pass }; return made; });
    }).then(function (m) {
      if (!m) return;
      var link = C.linkOf(VIEW, m.tok), sz = C.sizes(m.tok, VIEW), msg = shareText(m.env, link, !!m.pass);
      out.innerHTML = '<div class="gt-card"><h2>' + esc(t('sh.res')) + '</h2><p class="' + (sz.chat ? 'ok-note' : 'note') + '">' + esc(sizeNote(sz)) + (m.pass ? ' ' + esc(t('sh.res.pass')) : '') + '</p>' +
        '<label class="gt-lbl" for="r-link">' + esc(t('sh.res.link')) + '</label><input id="r-link" class="gt-in mono" readonly value="' + esc(link) + '">' +
        '<div class="row gt-acts"><button type="button" class="btn" data-copy>' + esc(t('sh.copy')) + '</button>' + (sz.fileOnly ? '' : '<a class="btn primary" data-wa href="' + esc('https://wa.me/?text=' + encodeURIComponent(msg)) + '" target="_blank" rel="noopener">' + esc(t('sh.wa')) + '</a>') +
        '<button type="button" class="btn" data-file>' + esc(t('sh.file')) + '</button></div>' +
        (sz.qr ? '<div class="sv-qr sh-qr" data-qr></div><p class="soft">' + esc(t('sh.qr.h')) + '</p>' : '<p class="soft">' + esc(t('sh.qr.no', { n: C.LIMIT.qr })) + '</p>') +
        '<p class="note">' + esc(t('sh.res.limit')) + '</p></div><div class="gt-card"><h3>' + esc(t('sh.prev')) + '</h3><div class="sv-prev" data-prev></div></div>';
      if (sz.qr) V.qr($('[data-qr]', out), link);
      V.render(m.env, $('[data-prev]', out), { preview: true });
      out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }).catch(function (e) { NS.toast(String(e && e.message || e), 'bad'); });
  }
  function shareText(env, link, enc) {
    var n = (env.b && env.b.n) || '', k = env.k;
    var head = k === 'stmt' ? t('sh.m.stmt', { n: n, p: env.d.pn }) : k === 'cat' ? t('sh.m.cat', { n: n }) : k === 'rcpt' ? t('sh.m.rcpt', { n: n, no: env.d.no }) : k === 'fb' ? t('sh.m.fb', { n: n }) : k === 'loy' ? t('sh.m.loy', { n: n }) : t('sh.m.staff', { n: n });
    return head + '\n' + link + (enc ? '\n' + t('sh.m.pass') : '') + (env.x ? '\n' + t('sh.m.until', { d: NS.fmtDate(env.x) }) : '');
  }
  function download(name, text, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

  /* ---------- loyalty store and stickers ---------- */
  function saveLoy() { return NSStore.meta('loyalty', LOY).catch(function () { NS.toast(t('nosave', { e: '' }), 'bad'); }); }
  function stickers() {
    var fd = C.feedbackData({ ask: val('f-ask'), review: val('f-rev'), wa: val('f-wa') || (biz && biz.phone) || '' }), w = window.open('', '_blank');
    if (!w) { NS.toast(t('sh.popup'), 'bad'); return; }
    C.pack(C.make('fb', biz2(), fd, { days: 0 })).then(function (tk) {
      var link = C.linkOf(VIEW, tk), box = document.createElement('div');
      return V.qr(box, link).then(function () {
        var one = '<div class="stk"><b>' + esc(val('f-ask') || t('sh.stk.ask')) + '</b><div class="q">' + box.innerHTML + '</div><small>' + esc(biz ? biz.name : '') + '</small></div>';
        w.document.write('<!doctype html><meta charset="utf-8"><title>' + esc(t('sh.stk.title')) + '</title><style>body{margin:12mm;font-family:sans-serif}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}.stk{border:1px dashed #888;padding:4mm;text-align:center;break-inside:avoid}.q{width:38mm;margin:2mm auto}.q svg{width:100%;height:auto}small{display:block}@media print{.np{display:none}}' + NS.pageBoxes(true) + '</style><p class="np">' + esc(t('sh.stk.h')) + ' <button onclick="print()">' + esc(t('sv.print')) + '</button></p><div class="g">' + new Array(13).join(one) + '</div>');
        w.document.close();
      });
    });
  }

  /* ---------- page ---------- */
  function draw() {
    var tabs = '<div class="seg sh-tabs" role="tablist">' + TABS.map(function (k) { return '<button type="button" class="btn sm" role="tab" aria-selected="' + (k === tab) + '" data-tab="' + k + '">' + esc(t('sh.tab.' + k)) + '</button>'; }).join('') + '</div>';
    var body = tab === 'stmt' ? tabStmt() : tab === 'cat' ? tabCat() : tab === 'rcpt' ? tabRcpt() : tab === 'loy' ? tabLoy() : tab === 'staff' ? tabStaff() : tabOrder();
    root.innerHTML = '<p class="note sh-limit">' + esc(t('sh.limit')) + '</p>' + tabs + body;
  }
  function onClick(e) {
    var b = e.target.closest('button,a'); if (!b) return;
    if (b.hasAttribute('data-tab')) { tab = b.getAttribute('data-tab'); ST = {}; location.hash = tab; draw(); return; }
    if (b.hasAttribute('data-make')) { ST.mk = ST.mk || ''; make(); return; }
    if (b.hasAttribute('data-mk')) { ST.mk = b.getAttribute('data-mk'); if (b.hasAttribute('data-card')) ST.card = b.getAttribute('data-card'); make(); return; }
    if (b.hasAttribute('data-copy')) { var l = $('#r-link', root); l.select(); if (navigator.clipboard) navigator.clipboard.writeText(l.value).then(function () { NS.toast(t('sv.copied')); }); return; }
    if (b.hasAttribute('data-file') && made) { download('snapshot-' + made.env.k + '-' + made.env.t + '.nsshare', C.fileText(made.tok, (made.env.b && made.env.b.n) || ''), 'text/plain'); return; }
    if (b.hasAttribute('data-allitems')) { var v = b.getAttribute('data-allitems') === '1'; $$('.sh-list input', root).forEach(function (i) { i.checked = v; }); return; }
    if (b.hasAttribute('data-stickers')) { stickers(); return; }
    if (b.hasAttribute('data-lsave')) { LOY.prog = { title: val('l-title').trim(), goal: Math.max(2, Math.min(30, num(val('l-goal')) || 10)), reward: val('l-reward').trim(), terms: LOY.prog.terms || '' }; saveLoy().then(function () { NS.toast(t('sh.saved')); draw(); }); return; }
    if (b.hasAttribute('data-ladd')) { var nm = val('l-name').trim(); if (!nm) return; LOY.cards.push({ id: 'c' + Date.now().toString(36), name: nm, stamps: [], used: 0 }); saveLoy().then(draw); return; }
    var id;
    if ((id = b.getAttribute('data-stamp'))) { C.loyaltyAdd(LOY.cards.filter(function (c) { return c.id === id; })[0], today(), 1); saveLoy().then(draw); return; }
    if ((id = b.getAttribute('data-give'))) { C.loyaltyGive(LOY.cards.filter(function (c) { return c.id === id; })[0], LOY.prog.goal || 10); saveLoy().then(draw); return; }
    if ((id = b.getAttribute('data-ldel'))) { NS.ask ? NS.ask(t('sh.ly.delq')).then(function (y) { if (y) { LOY.cards = LOY.cards.filter(function (c) { return c.id !== id; }); saveLoy().then(draw); } }) : 0; return; }
    if (b.hasAttribute('data-oread')) { ST.otext = val('o-text'); ST.po = C.parseOrder(ST.otext); ST.draftId = ''; draw(); return; }
    if (b.hasAttribute('data-odraft') && ST.po && biz) {
      var no = 'WA-' + today().replace(/-/g, '').slice(2) + '-' + Math.random().toString(36).slice(2, 5).toUpperCase(), seller = Object.assign({}, biz); ['id', 'created', 'updated'].forEach(function (k) { delete seller[k]; });
      ST.gst = +val('o-gst'); var dr = C.draftOrder(ST.po, seller, no, today(), ST.gst);
      NSStore.put('doc', dr).then(function (o) { ST.draftId = o.id; draw(); }, function (er) { NS.toast(t('nosave', { e: er.message }), 'bad'); });
    }
  }
  function onChange(e) {
    var n = e.target;
    if (n.id === 'b-sel') { biz = bizs.filter(function (b) { return b.id === n.value; })[0]; ST = {}; draw(); }
    else if (n.id === 's-party') ST.party = n.value;
    else if (n.id === 's-all') { ST.all = n.checked; draw(); }
    else if (n.id === 'r-bill') { ST.bill = n.value; draw(); }
    else if (n.id === 't-slip') { ST.slip = n.value; draw(); }
  }
  function load() {
    return NSStore.ready().then(function () { return Promise.all([NSStore.list('biz'), NSStore.list('doc'), NSStore.list('item'), NSStore.meta('loyalty')]); }).then(function (r) {
      bizs = r[0].filter(function (b) { return b.name; }); docs = r[1]; items = r[2].filter(function (i) { return i.desc; });
      if (r[3] && typeof r[3] === 'object') { LOY = Object.assign(LOY, r[3]); LOY.prog = Object.assign({ title: '', goal: 10, reward: '', terms: '' }, LOY.prog); LOY.cards = LOY.cards || []; LOY.fb = Object.assign({ ask: '', review: '', wa: '' }, LOY.fb); }
      var def = null; try { def = (S.biz || '') } catch (e) {}
      biz = bizs.filter(function (b) { return b.id === def; })[0] || bizs[0] || null;
      var h = location.hash.replace(/^#/, '').split('/');
      if (TABS.indexOf(h[0]) >= 0) tab = h[0];
      if (h[0] === 'stmt' && h[1]) ST.party = decodeURIComponent(h[1]);
      draw();
    }).catch(function () { root.innerHTML = '<p class="note">' + esc(t('sh.err')) + '</p>'; });
  }
  function start() {
    root = $('#share-tool'); if (!root) return;
    try { S = JSON.parse(localStorage.getItem('ns-share') || '{}'); } catch (e) { S = {}; }
    root.addEventListener('click', onClick); root.addEventListener('change', onChange);
    load();
    window.addEventListener('hashchange', function () {   /* a link from the App (#stmt/<party>) or a bookmark while the page is open */
      var h = location.hash.replace(/^#/, '').split('/');
      if (TABS.indexOf(h[0]) < 0 || !biz) return;
      if (h[0] === tab && !(h[0] === 'stmt' && h[1])) return;
      tab = h[0]; ST = {}; if (h[0] === 'stmt' && h[1]) ST.party = decodeURIComponent(h[1]); draw();
    });
    document.addEventListener('ns-lang', function () { if (biz) draw(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
