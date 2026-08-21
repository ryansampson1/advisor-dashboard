#!/usr/bin/env node
/**
 * ELC → Mailchimp CRM sync  (TAGS edition — rebuilt 2026-08-20)
 *
 * MASTER COPY lives in "Eshenbaugh Automation Plan/mailchimp_sync.js".
 * deploy_dashboard.command copies it into the advisor-dashboard repo on every
 * deploy, so the repo copy can no longer regress to the old interests version.
 * Edit THIS file, not the repo copy.
 *
 * History: the original (elc-v145) synced CRM groups as Mailchimp *interests*
 * (60-cap, read the wrong 'groups' collection). Replaced 2026-08-19 with TAGS
 * (no cap, reads crmGroups). That version was never committed and
 * deploy_dashboard.command's `git reset --hard origin/main` kept restoring the
 * old copy — root cause of every "regression". Hence the master-copy scheme.
 *
 * Modes (arg 1):
 *   delta  (default) — contacts whose email is set and whose group signature
 *                      changed since last sync (or never synced / pending flag)
 *   full             — every contact with an email
 *   retag            — one-time migration helper: contacts without
 *                      mailchimpTagged stamp (resumable)
 *
 * Env:
 *   MC_MAX_SECONDS=<n>  stop cleanly after ~n seconds (resumable — delta/retag
 *                       stamp progress per-contact)
 *
 * Config: $HOME/.elc_mc_config.json, falling back to a .elc_mc_config.json
 * next to this script:
 *   { "mailchimpApiKey":"…-usX", "mailchimpListId":"…", "firebaseApiKey":"…",
 *     "firebaseProjectId":"…", "firebaseEmail":"…", "firebasePassword":"…" }
 *
 * INVARIANTS — do not loosen:
 *   • getCollection THROWS on any non-200 (a permissions regression must fail
 *     loudly, never silently strip tags).
 *   • Group data is in 'crmGroups' (the 'groups' collection 403s for the sync
 *     account).
 *   • Firebase sign-in sends a Referer header (sign-in 403s without it).
 *   • Never touch Mailchimp *interests* — the CRM Groups interest category was
 *     deleted 2026-08-19; audience is purely tag-based.
 */

const https  = require('https');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

// ── Config ───────────────────────────────────────────────────────────────────
const CANDIDATES = [
  path.join(process.env.HOME || '', '.elc_mc_config.json'),
  path.join(__dirname, '.elc_mc_config.json'),
];
const CONFIG_PATH = CANDIDATES.find(p => { try { return fs.existsSync(p); } catch { return false; } });
if (!CONFIG_PATH) {
  console.error('\n❌ Config file not found at', CANDIDATES.join(' or '), '\n');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const REQUIRED = ['mailchimpApiKey','mailchimpListId','firebaseApiKey','firebaseProjectId','firebaseEmail','firebasePassword'];
const missing  = REQUIRED.filter(k => !cfg[k]);
if (missing.length) { console.error('\n❌ Missing config keys:', missing.join(', '), '\n'); process.exit(1); }

const MC_SERVER   = cfg.mailchimpApiKey.split('-').pop() || 'us1';
const MC_BASE     = `https://${MC_SERVER}.api.mailchimp.com/3.0`;
const MC_AUTH     = Buffer.from(`anystring:${cfg.mailchimpApiKey}`).toString('base64');
const LIST        = cfg.mailchimpListId;
const FB_FS_BASE  = `https://firestore.googleapis.com/v1/projects/${cfg.firebaseProjectId}/databases/(default)/documents`;
const FB_AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.firebaseApiKey}`;
const CONCURRENCY = 6;
const MAX_MS      = process.env.MC_MAX_SECONDS ? +process.env.MC_MAX_SECONDS * 1000 : Infinity;
const T0          = Date.now();

let _fbToken = null;

// ── HTTP ─────────────────────────────────────────────────────────────────────
function request(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url  = new URL(urlStr);
    const opts = { hostname: url.hostname, path: url.pathname + url.search,
                   method: options.method || 'GET', headers: options.headers || {} };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}
const mc = (m, p, body) => request(MC_BASE + p, { method: m, body,
  headers: { Authorization: `Basic ${MC_AUTH}`, 'Content-Type': 'application/json' } });
const fb = (m, p, body) => request(FB_FS_BASE + p, { method: m, body,
  headers: { 'Content-Type': 'application/json', ...( _fbToken ? { Authorization: `Bearer ${_fbToken}` } : {}) } });

// ── Firebase ─────────────────────────────────────────────────────────────────
async function fbSignIn() {
  const r = await request(FB_AUTH_URL, {
    method: 'POST',
    // Referer REQUIRED — the API key is HTTP-referrer-restricted; sign-in 403s without it.
    headers: { 'Content-Type': 'application/json', Referer: 'https://ryansampson1.github.io/' },
    body: { email: cfg.firebaseEmail, password: cfg.firebasePassword, returnSecureToken: true },
  });
  if (!r.body.idToken) throw new Error('Firebase sign-in failed: ' + JSON.stringify(r.body).slice(0, 200));
  _fbToken = r.body.idToken;
  console.log('✅ Signed into Firebase as', cfg.firebaseEmail);
}

function parseValue(v) {
  if (!v) return null;
  if ('stringValue'  in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue'  in v) return parseFloat(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue'    in v) return null;
  if ('arrayValue'   in v) return (v.arrayValue.values || []).map(parseValue);
  if ('mapValue'     in v) {
    const o = {};
    for (const [k, fv] of Object.entries(v.mapValue.fields || {})) o[k] = parseValue(fv);
    return o;
  }
  return null;
}
const parseDoc = d => {
  const out = { id: d.name.split('/').pop() };
  for (const [k, v] of Object.entries(d.fields || {})) out[k] = parseValue(v);
  return out;
};

// THROWS on any non-200. NEVER loosen this — a silent empty crmGroups read
// once nearly stripped every contact's groups.
async function getCollection(col) {
  const docs = [];
  let pageToken = null;
  do {
    const qs = `?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const r  = await fb('GET', `/${col}${qs}`);
    if (r.status !== 200) throw new Error(`Firestore GET /${col} → ${r.status}: ${JSON.stringify(r.body).slice(0,200)}`);
    if (!r.body.documents) break;
    docs.push(...r.body.documents.map(parseDoc));
    pageToken = r.body.nextPageToken || null;
  } while (pageToken);
  return docs;
}

function toFsField(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean')        return { booleanValue: v };
  if (typeof v === 'number')         return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  return { stringValue: String(v) };
}
async function patchDoc(col, id, fields) {
  const fsFields = {};
  for (const [k, v] of Object.entries(fields)) fsFields[k] = toFsField(v);
  const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const r = await fb('PATCH', `/${col}/${id}?${mask}`, { fields: fsFields });
  if (r.status !== 200) throw new Error(`Firestore PATCH /${col}/${id} → ${r.status}`);
}

// ── Mailchimp ────────────────────────────────────────────────────────────────
const md5      = s => crypto.createHash('md5').update(s).digest('hex');
const mailHash = email => md5(email.trim().toLowerCase());
const groupSig = c => (c.groups || []).slice().sort().join('|');

async function upsertMember(contact) {
  const r = await mc('PUT', `/lists/${LIST}/members/${mailHash(contact.email)}`, {
    email_address: contact.email.trim(),
    status_if_new: 'subscribed',
    merge_fields:  { FNAME: contact.firstName || '', LNAME: contact.lastName || '' },
  });
  if (r.status >= 400) throw new Error(`Mailchimp PUT ${r.status}: ${JSON.stringify(r.body).slice(0,200)}`);
}

// Tag delta: activate current group names, deactivate names the contact was
// previously stamped with but no longer has. POST returns 204.
async function setMemberTags(contact, activate, deactivate) {
  const tags = [
    ...activate.map(name   => ({ name, status: 'active'   })),
    ...deactivate.map(name => ({ name, status: 'inactive' })),
  ];
  if (!tags.length) return;
  const r = await mc('POST', `/lists/${LIST}/members/${mailHash(contact.email)}/tags`, { tags });
  if (r.status >= 400) throw new Error(`Mailchimp tags ${r.status}: ${JSON.stringify(r.body).slice(0,200)}`);
}

// Permanent delete (email cleared/changed, contact deleted, or departed).
async function removeMember(email) {
  const r = await mc('POST', `/lists/${LIST}/members/${mailHash(email)}/actions/delete-permanent`);
  if (r.status === 204 || r.status === 404) return;              // gone either way
  if (r.status === 405 || (r.body && /not found|does not exist/i.test(JSON.stringify(r.body)))) return;
  if (r.status >= 400) throw new Error(`Mailchimp delete ${r.status}: ${JSON.stringify(r.body).slice(0,200)}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const mode = (process.argv[2] || 'delta').toLowerCase();
  console.log(`\n🐵  ELC → Mailchimp CRM Sync   [mode: ${mode}]`);
  console.log('─'.repeat(52));

  await fbSignIn();

  const [contacts, groups] = await Promise.all([getCollection('contacts'), getCollection('crmGroups')]);
  console.log(`📋 ${contacts.length} contacts, ${groups.length} groups loaded from Firestore`);
  if (!groups.length) throw new Error('0 groups loaded from crmGroups — refusing to run (would strip tags).');

  const gname = {};
  for (const g of groups) gname[g.id] = g.name || g.groupName || g.title || '';

  // 1) Removals first — mailchimpRemoveEmail queue (set by CRM on email
  //    change/clear and on contact deletion; also used for departures).
  const removals = contacts.filter(c => c.mailchimpRemoveEmail);
  let removed = 0, removeFailed = 0;
  for (const c of removals) {
    try {
      await removeMember(c.mailchimpRemoveEmail);
      await patchDoc('contacts', c.id, { mailchimpRemoveEmail: null });
      removed++;
      console.log(`  🗑  removed ${c.mailchimpRemoveEmail}`);
    } catch (e) { removeFailed++; console.error(`  ❌ remove ${c.mailchimpRemoveEmail}: ${e.message}`); }
  }
  if (removals.length) console.log(`🗑  Removals: ${removed} deleted, ${removeFailed} failed\n`);

  // 2) Selection
  const live = contacts.filter(c => c.email && !c._deleted);
  let toSync;
  if      (mode === 'full')  toSync = live;
  else if (mode === 'retag') toSync = live.filter(c => !c.mailchimpTagged);
  else /* delta */           toSync = live.filter(c =>
    c.mailchimpPendingSync || c.mailchimpSyncedGroups === undefined || c.mailchimpSyncedGroups !== groupSig(c));

  console.log(`📤 Contacts to sync: ${toSync.length}  (CRM groups → Mailchimp tags)\n`);
  console.log('─'.repeat(52));

  let synced = 0, failed = 0, stopped = false;
  let idx = 0;

  async function worker() {
    while (idx < toSync.length) {
      if (Date.now() - T0 > MAX_MS) { stopped = true; return; }
      const contact = toSync[idx++];
      try {
        const currentNames = (contact.groups || []).map(g => gname[g]).filter(Boolean);
        const prevIds      = contact.mailchimpSyncedGroups ? contact.mailchimpSyncedGroups.split('|').filter(Boolean) : [];
        const prevNames    = prevIds.map(g => gname[g]).filter(Boolean);
        const deactivate   = prevNames.filter(n => !currentNames.includes(n));

        await upsertMember(contact);
        await setMemberTags(contact, currentNames, deactivate);
        await patchDoc('contacts', contact.id, {
          mailchimpPendingSync: false,
          mailchimpSyncedGroups: groupSig(contact),
          mailchimpTagged: true,
          mailchimpLastSync: Date.now(),
        });
        synced++;
      } catch (e) {
        failed++;
        console.error(`  ❌ ${contact.email}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Non-fatal: the sync account may lack write access to eos/settings (403).
  try { await patchDoc('eos', 'settings', { mailchimpLastSync: Date.now() }); }
  catch (e) { console.warn('⚠️  eos/settings timestamp not updated:', e.message); }

  console.log('─'.repeat(52));
  if (stopped) console.log(`⏱  MC_MAX_SECONDS budget hit — stopped early, re-run to resume (${toSync.length - synced - failed} left)`);
  console.log(`📊 Done: ${synced} synced, ${failed} failed`);
  console.log('✅ mailchimpLastSync updated in Firestore\n');
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
