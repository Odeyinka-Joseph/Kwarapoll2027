/**
 * Kwara State 2027 Poll: shared backend (Google Apps Script + Google Sheets).
 * Paste into a NEW Google Sheet: Extensions > Apps Script. Tabs Users, Directory and Responses are created automatically.
 * Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone. Copy the /exec URL into config.json.
 * After editing this file you must create a NEW VERSION of the deployment (Deploy > Manage deployments > pencil > New version).
 *
 * SETUP_CODE protects the one-time creation of the first admin account. Keep it private; it is only needed once.
 */
const SETUP_CODE = "ZYSP9DJD";
/* ===== SHARED: survey definition and rules (identical in index.html and Code.gs) ===== */
const bad = m => { throw new Error(m); };
const str = v => (v === null || v === undefined) ? "" : String(v).trim();
const norm = p => { let d = String(p === null || p === undefined ? "" : p).replace(/\D/g, ""); if (d.startsWith("234") && d.length === 13) d = "0" + d.slice(3); else if (d.length === 10) d = "0" + d; return d; };

const LANGS = [[1, "English"], [2, "Yoruba"], [3, "Hausa"], [4, "Nupe"], [5, "Baruba"]];
const DISTRICTS = {
  "Kwara Central": ["Ilorin East", "Ilorin South", "Ilorin West", "Asa"],
  "Kwara South": ["Offa", "Oyun", "Ifelodun", "Irepodun", "Isin", "Ekiti", "Oke-Ero"],
  "Kwara North": ["Moro", "Baruten", "Edu", "Kaiama", "Patigi"]
};
const ALL_LGAS = Object.keys(DISTRICTS).reduce((x, k) => x.concat(DISTRICTS[k]), []).sort();
const lgaKey = s => String(s || "").toLowerCase().replace(/[^a-z]/g, "").replace(/(localgovernmentarea|localgovernment|lga)$/, "");
const LGA_INFO = {};
Object.keys(DISTRICTS).forEach(d => DISTRICTS[d].forEach(l => { LGA_INFO[lgaKey(l)] = { lga: l, district: d }; }));
const lgaInfo = s => LGA_INFO[lgaKey(s)] || null;

const GOV = [
  { k: "Danladi", full: "Salihu Yakubu Danladi", short: "Danladi", party: "APC", code: 1 },
  { k: "Kawu", full: "Bolakale Kawu", short: "Kawu", party: "PDP", code: 2 },
  { k: "Zakari", full: "Zakari Mohammed", short: "Zakari Mohammed", party: "ADC", code: 3 },
  { k: "Apaokagi", full: "Ridwan Apaokagi", short: "Apaokagi", party: "SDP", code: 4 }
];
const SENATE = {
  "Kwara Central": [["AbdulRahman AbdulRazaq", "APC"], ["Saliu Mustapha", "PDP"], ["Risikat Abdullahi", "ADC"]],
  "Kwara South": [["Olalekan Adewoye", "APC"], ["Saheed Popoola", "PDP"], ["Iyiola Oyedepo", "ADC"]],
  "Kwara North": [["Mahmud Umar Muhammad", "APC"], ["Kolo Baba Jiya", "PDP"], ["Taoheed Usman Bala", "ADC"]]
};
const ROT3 = "ABCD", ROT9 = "ABC";
const rotate = (arr, i) => arr.slice(i).concat(arr.slice(0, i));
const rotFor = idx => ({ r3: ROT3[idx % 4], r9: ROT9[idx % 3] });

const OPT = {
  contact: [[1, "Spoke to the respondent"], [2, "No answer / busy / switched off"], [3, "Wrong number"], [4, "Respondent not available, call back later"]],
  consent: [[1, "Yes, respondent agrees to continue"], [2, "No, respondent refuses (thank and end the call)"]],
  S1: [[1, "Yes, I live and vote there"], [2, "I still vote there, but I live somewhere else now"], [3, "I now vote somewhere else in Kwara"], [4, "I no longer vote in Kwara (thank and end the call)"]],
  Q1: [[5, "Very good"], [4, "Good"], [3, "Just okay"], [2, "Poor"], [1, "Very poor"], [99, "Don't know"]],
  Q2: [[1, "Insecurity, kidnapping, bandits"], [2, "Bad roads"], [3, "No light / electricity"], [4, "No water"], [5, "Hunger, cost of food, prices"], [6, "No jobs"], [7, "Hospitals / health"], [8, "Schools / education"], [9, "Farmers and herders clashes"], [10, "Other (write it)"], [99, "Don't know"]],
  Q3tail: [[5, "Someone else (write name)"], [97, "I have not decided"], [98, "I will not vote"], [99, "I don't want to say"]],
  Q4: [[1, "My mind is made up"], [2, "I could still change"], [99, "Don't know"]],
  Q5tail: [[97, "Not leaning to anyone"], [99, "Don't want to say"]],
  Q6: [[1, "I trust him / he will keep his word"], [2, "His party"], [3, "He is from my area / my zone"], [4, "What he has done before (his record)"], [5, "He helps people / gives to people"], [6, "The leader backing him (AbdulRazaq, Saraki, other)"], [7, "It is the turn of Kwara North"], [8, "He will bring change"], [9, "He will continue the work of this government"], [10, "Religion of the ticket"], [11, "Other (write it)"], [99, "Don't know"]],
  Q7: [[1, "Yes, I know him well"], [2, "Yes, a little"], [3, "Never heard"]],
  Q8: [[1, "I like him"], [2, "No strong feeling"], [3, "I don't like him"]],
  Q9tail: [[5, "Someone else (write name)"], [97, "Not decided"], [98, "Will not vote"], [99, "Don't want to say"]],
  Q10: [[1, "Yes, same party in both"], [2, "No, I may vote different parties"], [99, "Not sure"]],
  Q11: [[1, "Agree"], [2, "Disagree"], [3, "It does not matter to me"], [99, "Don't know"]],
  Q12: [[1, "Voted APC"], [2, "Voted PDP"], [3, "Voted SDP"], [4, "Voted another party"], [5, "Did not vote"], [6, "Too young to vote then"], [99, "Can't remember / don't want to say"]],
  Q13: [[4, "I will surely vote"], [3, "I will probably vote"], [2, "I may or may not vote"], [1, "I will not vote"]],
  Q14: [[1, "Yes, I have it"], [2, "I have not collected it yet"], [3, "I have lost it"], [99, "Not sure"]],
  D1: [[1, "Islam"], [2, "Christianity"], [3, "Traditional"], [4, "Other"]],
  D2: [[1, "Yoruba"], [2, "Ilorin (they say \"Ilorin\")"], [3, "Fulani"], [4, "Hausa"], [5, "Nupe"], [6, "Baruba (Bariba)"], [7, "Boko (Busa)"], [8, "Igbo"], [9, "Other (write it)"]]
};

/* ---- conditions ---- */
/* the main questionnaire opens after S1 = 1 or 2, or after S1 = 3 once the new local government is chosen */
const live = a => a.contact === "1" && a.consent === "1" && (a.S1 === "1" || a.S1 === "2" || (a.S1 === "3" && str(a.S1_lga) !== ""));
const picked = a => ["1", "2", "3", "4", "5"].indexOf(a.Q3) >= 0;
const ctxLga = (a, ctx) => a.S1 === "3" ? str(a.S1_lga) : str(ctx.reg.l);
const ctxDistrict = (a, ctx) => { const i = lgaInfo(ctxLga(a, ctx)); return i ? i.district : str(a.dist); };

const FIELDS = [
  { id: "contact", t: "radio", lab: "Call outcome", show: () => true },
  { id: "language", t: "radio", lab: "Language of interview", show: a => a.contact === "1" },
  { id: "consent", t: "radio", lab: "Consent to continue", show: a => a.contact === "1" },
  { id: "S1", t: "radio", lab: "S1", show: a => a.contact === "1" && a.consent === "1" },
  { id: "S1_lga", t: "lga", lab: "S1 new local government", show: a => a.contact === "1" && a.consent === "1" && a.S1 === "3" },
  { id: "S1_ward", t: "text", lab: "S1 new ward", show: a => a.contact === "1" && a.consent === "1" && a.S1 === "3" },
  { id: "Q1", t: "radio", lab: "Q1", show: live },
  { id: "Q2", t: "radio", lab: "Q2", show: live },
  { id: "Q2_other", t: "text", lab: "Q2 other", show: a => live(a) && a.Q2 === "10" },
  { id: "Q3", t: "radio", lab: "Q3", show: live },
  { id: "Q3_other", t: "text", lab: "Q3 other name", show: a => live(a) && a.Q3 === "5" },
  { id: "Q4", t: "radio", lab: "Q4", show: a => live(a) && picked(a) },
  { id: "Q5", t: "radio", lab: "Q5", show: a => live(a) && (a.Q3 === "97" || a.Q3 === "99") },
  { id: "Q6", t: "radio", lab: "Q6", show: a => live(a) && picked(a) },
  { id: "Q6_other", t: "text", lab: "Q6 other", show: a => live(a) && picked(a) && a.Q6 === "11" },
  { id: "Q6_leader", t: "text", lab: "Q6 leader named", req: false, show: a => live(a) && picked(a) && a.Q6 === "6" }
].concat(
  GOV.map(g => ({ id: "Q7_" + g.k, t: "radio", lab: "Q7 " + g.short, show: live }))
).concat(
  GOV.map(g => ({ id: "Q8_" + g.k, t: "radio", lab: "Q8 " + g.short, show: a => live(a) && (a["Q7_" + g.k] === "1" || a["Q7_" + g.k] === "2") }))
).concat([
  { id: "dist", t: "radio", lab: "Senate district", show: (a, c) => live(a) && !lgaInfo(ctxLga(a, c)) },
  { id: "Q9", t: "radio", lab: "Q9", show: live },
  { id: "Q9_other", t: "text", lab: "Q9 other name", show: a => live(a) && a.Q9 === "5" },
  { id: "Q10", t: "radio", lab: "Q10", show: live },
  { id: "Q11", t: "radio", lab: "Q11", show: live },
  { id: "Q12", t: "radio", lab: "Q12", show: live },
  { id: "Q13", t: "radio", lab: "Q13", show: live },
  { id: "Q14", t: "radio", lab: "Q14", show: live },
  { id: "D1", t: "radio", lab: "D1 Religion", show: live },
  { id: "D2", t: "radio", lab: "D2 People or tribe", show: live },
  { id: "D2_other", t: "text", lab: "D2 other", show: a => live(a) && a.D2 === "9" }
]);

function optsFor(id, a, ctx) {
  if (id === "Q3" || id === "Q5") {
    const i = Math.max(0, ROT3.indexOf(ctx.r3)), ord = rotate(GOV, i);
    return id === "Q3" ? ord.map(c => [c.code, c.full + ", " + c.party]).concat(OPT.Q3tail) : ord.map(c => [c.code, c.short + ", " + c.party]).concat(OPT.Q5tail);
  }
  if (id === "Q9") {
    const L = SENATE[ctxDistrict(a, ctx)]; if (!L) return [];
    return rotate(L.map((x, i) => [i + 1, x[0] + ", " + x[1]]), Math.max(0, ROT9.indexOf(ctx.r9))).concat(OPT.Q9tail);
  }
  if (id === "dist") return Object.keys(DISTRICTS).map(d => [d, d]);
  if (id === "language") return LANGS;
  if (id.indexOf("Q7_") === 0) return OPT.Q7;
  if (id.indexOf("Q8_") === 0) return OPT.Q8;
  return OPT[id] || [];
}

function validateAnswers(a, ctx) {
  const errs = [];
  FIELDS.forEach(f => {
    if (!f.show(a, ctx)) return;
    const v = str(a[f.id]);
    if (f.req === false && v === "") return;
    if (v === "") { errs.push({ id: f.id, msg: f.lab + ": please answer." }); return; }
    if (f.t === "radio" && !optsFor(f.id, a, ctx).some(o => String(o[0]) === v)) errs.push({ id: f.id, msg: f.lab + ": not a valid answer." });
    if (f.t === "lga" && ALL_LGAS.indexOf(v) < 0) errs.push({ id: f.id, msg: f.lab + ": choose a local government from the list." });
    if (f.t === "text" && v.length > 200) errs.push({ id: f.id, msg: f.lab + ": too long." });
  });
  return errs;
}

const statusOf = a => a.contact !== "1" ? ({ "2": "No answer", "3": "Wrong number", "4": "Call back" })[a.contact] : a.consent === "2" ? "Refused" : a.S1 === "4" ? "Screened out" : "Completed";

const META = ["callId", "savedAt", "date", "enumerator", "enumeratorName", "callStart", "callEnd", "durationMin", "status", "phone", "regName", "regGender", "regAgeGroup", "regLga", "regWard", "regPu", "language", "contact", "consent"];
const DATA = ["S1", "S1_lga", "S1_ward", "votingLga", "district", "Q1", "Q2", "Q2_other", "Q3", "Q3_other", "Q3_rot", "Q4", "Q5", "Q6", "Q6_other", "Q6_leader"]
  .concat(GOV.map(g => "Q7_" + g.k)).concat(GOV.map(g => "Q8_" + g.k))
  .concat(["Q9", "Q9_other", "Q9_rot", "Q10", "Q11", "Q12", "Q13", "Q14", "D1", "D2", "D2_other"]);
const COLS = META.concat(DATA);

const hhmm = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
function minutesBetween(s, e) { const a = s.split(":"), b = e.split(":"); let d = (+b[0] * 60 + +b[1]) - (+a[0] * 60 + +a[1]); if (d < 0) d += 1440; return d; }

/* Build the stored record. Validates everything again (the server never trusts the page). */
function buildRec(input, reg, idx, who, meta) {
  const a = {}; const src = input.answers || {};
  Object.keys(src).forEach(k => { a[k] = str(src[k]); });
  const rot = rotFor(idx), ctx = { reg: reg, idx: idx, r3: rot.r3, r9: rot.r9 };
  const errs = validateAnswers(a, ctx); if (errs.length) bad(errs[0].msg);
  const cs = str(input.callStart), ce = str(input.callEnd);
  if (cs && !hhmm(cs)) bad("Call start must be a time (HH:MM)."); if (ce && !hhmm(ce)) bad("Call end must be a time (HH:MM).");
  const rec = {}; COLS.forEach(k => { rec[k] = ""; });
  rec.callId = meta.callId; rec.savedAt = meta.savedAt;
  rec.date = /^\d{4}-\d{2}-\d{2}$/.test(str(input.date)) ? str(input.date) : meta.savedAt.slice(0, 10);
  rec.enumerator = who.u; rec.enumeratorName = who.name;
  rec.callStart = cs; rec.callEnd = ce; rec.durationMin = (cs && ce) ? String(minutesBetween(cs, ce)) : "";
  rec.status = statusOf(a); rec.phone = reg.p;
  rec.regName = reg.n; rec.regGender = reg.g; rec.regAgeGroup = reg.a; rec.regLga = reg.l; rec.regWard = reg.w; rec.regPu = reg.u;
  FIELDS.forEach(f => { if (COLS.indexOf(f.id) >= 0 && f.show(a, ctx)) rec[f.id] = a[f.id] === undefined ? "" : a[f.id]; });
  if (live(a)) {
    const raw = ctxLga(a, ctx), info = lgaInfo(raw);
    rec.votingLga = info ? info.lga : raw; rec.district = ctxDistrict(a, ctx);
    rec.Q3_rot = ctx.r3; rec.Q9_rot = ctx.r9;
  }
  return rec;
}

function mergeDir(people, rows, replace) {
  const map = new Map(replace ? [] : people.map(x => [x.p, x])); let added = 0, updated = 0;
  rows.forEach(r => {
    const p = norm(r.p); if (p.length !== 11) return;
    const x = { p: p, n: str(r.n), g: str(r.g), a: str(r.a), l: str(r.l), w: str(r.w), u: str(r.u) }, o = map.get(p);
    if (o) { updated++; map.set(p, { p: p, n: x.n || o.n, g: x.g || o.g, a: x.a || o.a, l: x.l || o.l, w: x.w || o.w, u: x.u || o.u }); } else { added++; map.set(p, x); }
  });
  return { list: Array.from(map.values()), added: added, updated: updated };
}

/* dirLgas: array of raw LGA strings from the register; resp: [{regLga,status,enumerator,durationMin}] */
function progressOf(dirLgas, resp) {
  const by = {}, key = s => { const i = lgaInfo(s); return i ? i.lga : "Other / unmatched"; };
  const slot = n => by[n] || (by[n] = { lga: n, registered: 0, completed: 0, other: 0 });
  ALL_LGAS.forEach(l => slot(l));
  dirLgas.forEach(l => { slot(key(l)).registered++; });
  const en = {}, tot = { register: dirLgas.length, calls: resp.length, completed: 0, refused: 0, screened: 0, noContact: 0 }; let dsum = 0, dn = 0;
  resp.forEach(r => {
    const s = slot(key(r.regLga)); if (r.status === "Completed") s.completed++; else s.other++;
    const e = en[r.enumerator] || (en[r.enumerator] = { u: r.enumerator, calls: 0, completed: 0, dsum: 0, dn: 0, under2: 0 });
    e.calls++;
    if (r.status === "Completed") { tot.completed++; e.completed++; const d = parseFloat(r.durationMin); if (!isNaN(d)) { e.dsum += d; e.dn++; dsum += d; dn++; if (d < 2) e.under2++; } }
    else if (r.status === "Refused") tot.refused++; else if (r.status === "Screened out") tot.screened++; else tot.noContact++;
  });
  const byLga = Object.keys(by).map(k => by[k]).filter(x => x.registered || x.completed || x.other || ALL_LGAS.indexOf(x.lga) >= 0);
  byLga.sort((x, y) => x.lga === "Other / unmatched" ? 1 : y.lga === "Other / unmatched" ? -1 : x.lga.localeCompare(y.lga));
  tot.avgMin = dn ? Math.round(dsum / dn * 10) / 10 : null;
  return { totals: tot, byLga: byLga, byEnum: Object.keys(en).map(k => { const e = en[k]; return { u: e.u, calls: e.calls, completed: e.completed, avgMin: e.dn ? Math.round(e.dsum / e.dn * 10) / 10 : null, under2: e.under2 }; }).sort((x, y) => y.completed - x.completed) };
}

const HEAD = {
  Users: ["username", "name", "role", "salt", "hash"],
  Directory: ["phone", "name", "gender", "ageGroup", "lga", "ward", "pollingUnit"],
  Responses: COLS
};

function fail(m, c) { const e = new Error(m); e.code = c || 400; throw e; }
function S(n) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); let s = ss.getSheetByName(n);
  if (!s) {
    s = ss.insertSheet(n); const h = HEAD[n];
    if (s.getMaxColumns() < h.length) s.insertColumnsAfter(s.getMaxColumns(), h.length - s.getMaxColumns());
    s.getRange(1, 1, 1, h.length).setNumberFormat("@").setValues([h]); s.setFrozenRows(1);
  }
  return s;
}
function ensureRows(s, n) { const m = s.getMaxRows(); if (m < n) s.insertRowsAfter(m, n - m); }
function writeBlock(s, startRow, rows) {
  if (!rows.length) return; ensureRows(s, startRow + rows.length - 1);
  const rg = s.getRange(startRow, 1, rows.length, rows[0].length); rg.setNumberFormat("@"); rg.setValues(rows);
}
function clearData(s) { const n = s.getLastRow() - 1; if (n > 0) s.getRange(2, 1, n, s.getLastColumn()).clearContent(); }
function readRows(s, ncol) { const n = s.getLastRow() - 1; return n < 1 ? [] : s.getRange(2, 1, n, ncol).getValues(); }
function withLock(fn) { const l = LockService.getScriptLock(); l.waitLock(25000); try { return fn(); } finally { l.releaseLock(); } }
function secret() { const p = PropertiesService.getScriptProperties(); let s = p.getProperty("SECRET"); if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty("SECRET", s); } return s; }
function hashPw(p, salt) {
  const sb = Utilities.newBlob(salt).getBytes(); let h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + "|" + p);
  for (let i = 0; i < 1500; i++) h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h.concat(sb));
  return Utilities.base64Encode(h);
}
function sign(o) { const b = Utilities.base64EncodeWebSafe(JSON.stringify(o)); return b + "." + Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(b, secret())); }
function unsign(t) {
  try {
    const a = String(t).split("."); if (a.length !== 2) return null;
    if (a[1] !== Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(a[0], secret()))) return null;
    const o = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(a[0])).getDataAsString()); return o.exp > Date.now() ? o : null;
  } catch (e) { return null; }
}
function throttle(key, max) {
  const c = CacheService.getScriptCache(), n = +c.get(key) || 0;
  if (n >= max) fail("Too many attempts. Try again in a few minutes.", 429);
  return function () { c.put(key, String(n + 1), 300); };
}

/* ---- users ---- */
function users() { return readRows(S("Users"), 5).map((r, i) => ({ u: String(r[0]), name: String(r[1]), role: String(r[2]), salt: String(r[3]), h: String(r[4]), row: i + 2 })); }
function auth(b, adminOnly) {
  const o = unsign(b.token); if (!o) fail("Not signed in", 401);
  const u = users().find(x => x.u === o.u); if (!u) fail("Account no longer exists", 401);
  if (adminOnly && u.role !== "admin") fail("Admin only", 403); return u;
}
function checkNew(us, u, p) {
  if (!/^[a-z0-9._-]{3,}$/.test(u)) bad("Username: at least 3 characters (a-z, 0-9, . _ -).");
  if (String(p || "").length < 6) bad("Password must be at least 6 characters.");
  if (us.some(x => x.u === u)) bad("Username already exists.");
}
function addUserRow(u, name, role, p) { const salt = Utilities.getUuid(); writeBlock(S("Users"), S("Users").getLastRow() + 1, [[u, name || u, role === "admin" ? "admin" : "user", salt, hashPw(p, salt)]]); }

/* ---- register (Directory) and responses ---- */
function dirAll() { return readRows(S("Directory"), 7).map(r => ({ p: norm(r[0]), n: str(r[1]), g: str(r[2]), a: str(r[3]), l: str(r[4]), w: str(r[5]), u: str(r[6]) })); }
function dirFind(D, phone) { const n = D.getLastRow() - 1; if (n < 1) return -1; const v = D.getRange(2, 1, n, 1).getValues(); for (let i = 0; i < n; i++) if (norm(v[i][0]) === phone) return i; return -1; }
function dirRowAt(D, i) { const r = D.getRange(i + 2, 1, 1, 7).getValues()[0]; return { p: norm(r[0]), n: str(r[1]), g: str(r[2]), a: str(r[3]), l: str(r[4]), w: str(r[5]), u: str(r[6]) }; }
function history(R, phone) {
  const n = R.getLastRow() - 1, out = { done: false, attempts: 0, last: "" }; if (n < 1) return out;
  const ph = R.getRange(2, COLS.indexOf("phone") + 1, n, 1).getValues(), st = R.getRange(2, COLS.indexOf("status") + 1, n, 1).getValues();
  for (let i = 0; i < n; i++) if (norm(ph[i][0]) === phone) { out.attempts++; out.last = str(st[i][0]); if (out.last === "Completed") out.done = true; }
  return out;
}
function rowObj(r) { const o = {}; COLS.forEach((k, i) => { o[k] = k === "phone" ? norm(r[i]) : str(r[i]); }); return o; }

function route(b) {
  const a = b.action;
  if (a === "status") return { ok: true, setup: !users().some(x => x.role === "admin"), needCode: !!SETUP_CODE };
  if (a === "setup") {
    const hit = throttle("setup", 8);
    return withLock(() => {
      const us = users(); if (us.some(x => x.role === "admin")) fail("Setup already completed", 403);
      if (SETUP_CODE && str(b.code) !== SETUP_CODE) { hit(); fail("Incorrect setup code.", 403); }
      const u = str(b.username).toLowerCase(); checkNew(us, u, b.password); addUserRow(u, str(b.name), "admin", String(b.password)); return { ok: true };
    });
  }
  if (a === "login") {
    const u = str(b.username).toLowerCase(), hit = throttle("f_" + u, 5), x = users().find(y => y.u === u);
    if (!x || x.h !== hashPw(String(b.password || ""), x.salt)) { hit(); fail("Invalid username or password.", 401); }
    CacheService.getScriptCache().remove("f_" + u);
    return { token: sign({ u: x.u, exp: Date.now() + 12 * 3600e3 }), user: { username: x.u, name: x.name, role: x.role } };
  }
  if (a === "lookup") {
    auth(b); const q = String(b.q || "").replace(/\D/g, ""), D = S("Directory"), n = D.getLastRow() - 1; if (n < 1 || q.length < 5) return { hits: [] };
    if (q.length === 11) {
      const i = dirFind(D, q); if (i < 0) return { hits: [] };
      const r = dirRowAt(D, i), h = history(S("Responses"), q); r.idx = i; r.done = h.done; r.attempts = h.attempts; r.last = h.last; return { hits: [r] };
    }
    const v = D.getRange(2, 1, n, 1).getValues(), hits = [];
    for (let i = 0; i < n && hits.length < 8; i++) { const p = norm(v[i][0]); if (p.indexOf(q) >= 0) hits.push({ p: p }); }
    return { hits: hits };
  }
  if (a === "submit") {
    const u = auth(b);
    return withLock(() => {
      const D = S("Directory"), R = S("Responses"), input = b.input || {}, phone = norm(input.phone);
      if (phone.length !== 11) bad("Please enter a valid 11-digit phone number.");
      const i = dirFind(D, phone); if (i < 0) bad("This number is not in the register.");
      if (history(R, phone).done) bad("This respondent has already been interviewed.");
      const rec = buildRec(input, dirRowAt(D, i), i, { u: u.u, name: u.name }, { callId: Utilities.getUuid(), savedAt: new Date().toISOString() });
      writeBlock(R, R.getLastRow() + 1, [COLS.map(k => rec[k])]);
      return { rec: { phone: rec.phone, status: rec.status } };
    });
  }
  if (a === "progress") {
    auth(b, true); const D = S("Directory"), R = S("Responses"), nd = D.getLastRow() - 1, nr = R.getLastRow() - 1;
    const dl = nd > 0 ? D.getRange(2, 5, nd, 1).getValues().map(r => str(r[0])) : [], resp = [];
    if (nr > 0) {
      const g = c => R.getRange(2, COLS.indexOf(c) + 1, nr, 1).getValues(), x1 = g("regLga"), x2 = g("status"), x3 = g("enumerator"), x4 = g("durationMin");
      for (let i = 0; i < nr; i++) resp.push({ regLga: str(x1[i][0]), status: str(x2[i][0]), enumerator: str(x3[i][0]), durationMin: str(x4[i][0]) });
    }
    return progressOf(dl, resp);
  }
  if (a === "subsAll") { auth(b, true); return { rows: readRows(S("Responses"), COLS.length).map(rowObj) }; }
  if (a === "saveDir") {
    auth(b, true);
    return withLock(() => {
      const D = S("Directory"), r = mergeDir(b.replace ? [] : dirAll(), Array.isArray(b.rows) ? b.rows : [], !!b.replace);
      if (!r.added && !r.updated) bad("No valid phone numbers found. Check the Phone column.");
      clearData(D); writeBlock(D, 2, r.list.map(x => [x.p, x.n, x.g, x.a, x.l, x.w, x.u]));
      return { added: r.added, updated: r.updated };
    });
  }
  if (a === "clearDir") { auth(b, true); return withLock(() => { clearData(S("Directory")); return { ok: true }; }); }
  if (a === "wipe") { auth(b, true); return withLock(() => { clearData(S("Responses")); return { ok: true }; }); }
  if (a === "listUsers") { auth(b, true); return { users: users().map(x => ({ u: x.u, name: x.name, role: x.role })) }; }
  if (a === "addUser") { auth(b, true); return withLock(() => { const u = str(b.username).toLowerCase(); checkNew(users(), u, b.password); addUserRow(u, str(b.name), b.role, String(b.password)); return { ok: true }; }); }
  if (a === "resetPw") {
    auth(b, true);
    return withLock(() => {
      const x = users().find(y => y.u === str(b.username).toLowerCase()); if (!x) fail("User not found.", 404);
      if (String(b.password || "").length < 6) bad("Password must be at least 6 characters.");
      const salt = Utilities.getUuid(); writeBlock(S("Users"), x.row, [[x.u, x.name, x.role, salt, hashPw(String(b.password), salt)]]); return { ok: true };
    });
  }
  if (a === "delUser") {
    const me = auth(b, true);
    return withLock(() => {
      const us = users(), x = us.find(y => y.u === str(b.username).toLowerCase()); if (!x) fail("User not found.", 404);
      if (x.role === "admin" && us.filter(y => y.role === "admin").length < 2) bad("Cannot delete the last admin.");
      if (x.u === me.u) bad("You cannot delete your own account while signed in.");
      S("Users").deleteRow(x.row); return { ok: true };
    });
  }
  fail("Unknown action", 404);
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doPost(e) { try { return out(route(JSON.parse(e.postData.contents))); } catch (err) { return out({ error: err.message, code: err.code || 400 }); } }
function doGet(e) { try { return out(route({ action: (e && e.parameter && e.parameter.action) || "status" })); } catch (err) { return out({ error: err.message, code: err.code || 400 }); } }
