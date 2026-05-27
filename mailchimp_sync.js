#!/usr/bin/env node
/**
 * mailchimp_sync.js
 * Syncs ELC CRM contact group memberships → Mailchimp audience interest groups.
 *
 * ── Setup (one-time) ────────────────────────────────────────────────────────
 * 1. Create a Mailchimp account at mailchimp.com
 * 2. In Mailchimp: Audience → Create Audience (or use existing)
 * 3. Note your Audience ID: Audience → Manage Audience → Settings → Audience ID
 * 4. Generate an API key: Account → Extras → API Keys → Create A Key
 * 5. In the ELC dashboard: Automations → Mailchimp Audience Sync → save config
 * 6. Create ~/.elc_mc_config.json:
 *    {
 *      "mailchimpApiKey":       "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1",
 *      "mailchimpListId":       "a1b2c3d4e5",
 *      "mailchimpCategoryName": "CRM Groups",
 *      "firebaseApiKey":        "AIzaSyC1cKWQnk4TeH3EMeX-sF4RejGPYL9xyYw",
 *      "firebaseProjectId":     "eshenbaugh-dashboard",
 *      "firebaseEmail":         "ryan@thedirtdog.com",
 *      "firebasePassword":      "your-firebase-password"
 *    }
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 * node mailchimp_sync.js            # sync only contacts with mailchimpPendingSync=true
 * node mailchimp_sync.js full       # sync ALL contacts that have an email address
 *
 * ── How it works ────────────────────────────────────────────────────────────
 * 1. Signs into Firebase → gets auth token
 * 2. Reads contacts + groups from Firestore
 * 3. Gets/creates a Mailchimp interest category named "CRM Groups"
 * 4. Gets/creates one Mailchimp interest per CRM group
 * 5. For each pending contact: subscribes (or updates) them in Mailchimp
 *    and sets their interest memberships to match their CRM group list
 * 6. Clears mailchimpPendingSync flag and writes mailchimpLastSync timestamp
 */

'use strict';
const https  = require('https');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

// ── Load config ──────────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(process.env.HOME, '.elc_mc_config.json');
let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (e) {
  console.error('\n❌ Config file not found at', CONFIG_PATH);
  console.error('   Create it — see the header of this script for the format.\n');
  process.exit(1);
}

const REQUIRED = ['mailchimpApiKey','mailchimpListId','firebaseApiKey','firebaseProjectId','firebaseEmail','firebasePassword'];
const missing  = REQUIRED.filter(k => !cfg[k]);
if (missing.length) { console.error('\n❌ Missing config keys:', missing.join(', '), '\n'); process.exit(1); }

const MC_SERVER   = cfg.mailchimpApiKey.split('-').pop() || 'us1';
const MC_BASE     = `https://${MC_SERVER}.api.mailchimp.com/3.0`;
const MC_AUTH     = Buffer.from(`anystring:${cfg.mailchimpApiKey}`).toString('base64');
const FB_PROJECT  = cfg.firebaseProjectId;
const FB_FS_BASE  = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;
const FB_AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.firebaseApiKey}`;
const CATEGORY    = cfg.mailchimpCategoryName || 'CRM Groups';

let _fbToken = null;
let _mcCategoryId = null;
const _mcInterests = {};  // groupName → interestId

// ── HTTP helper ──────────────────────────────────────────────────────────────
function request(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url  = new URL(urlStr);
    const opts = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   options.method || 'GET',
      headers:  options.headers || {},
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

function mc(method, path, body) {
  return request(MC_BASE + path, {
    method,
    headers: { Authorization: `Basic ${MC_AUTH}`, 'Content-Type': 'application/json' },
    body,
  });
}

function fb(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (_fbToken) headers.Authorization = `Bearer ${_fbToken}`;
  return request(FB_FS_BASE + path, { method, headers, body });
}

// ── Firebase auth ────────────────────────────────────────────────────────────
async function fbSignIn() {
  const r = await request(FB_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: cfg.firebaseEmail, password: cfg.firebasePassword, returnSecureToken: true },
  });
  if (!r.body.idToken) throw new Error('Firebase sign-in failed: ' + JSON.stringify(r.body).slice(0, 200));
  _fbToken = r.body.idToken;
  console.log('✅ Signed into Firebase as', cfg.firebaseEmail);
}

// ── Firestore value parser ───────────────────────────────────────────────────
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

function parseDoc(d) {
  const out = { id: d.name.split('/').pop() };
  for (const [k, v] of Object.entries(d.fields || {})) out[k] = parseValue(v);
  return out;
}

async function getCollection(col) {
  const docs = [];
  let pageToken = null;
  do {
    const qs = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : '';
    const r  = await fb('GET', `/${col}${qs}`);
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
  return fb('PATCH', `/${col}/${id}?${mask}`, { fields: fsFields });
}

// ── Mailchimp helpers ────────────────────────────────────────────────────────
const md5 = s => crypto.createHash('md5').update(s).digest('hex');

async function getOrCreateCategory() {
  if (_mcCategoryId) return _mcCategoryId;
  const r = await mc('GET', `/lists/${cfg.mailchimpListId}/interest-categories?count=100`);
  if (r.status !== 200) throw new Error(`Mailchimp error ${r.status}: ${JSON.stringify(r.body).slice(0,200)}`);
  const found = (r.body.categories || []).find(c => c.title === CATEGORY);
  if (found) { _mcCategoryId = found.id; console.log(`  📂 Using existing category "${CATEGORY}" (${found.id})`); return found.id; }
  const c = await mc('POST', `/lists/${cfg.mailchimpListId}/interest-categories`, { title: CATEGORY, type: 'checkboxes' });
  if (!c.body.id) throw new Error(`Failed to create category: ${JSON.stringify(c.body).slice(0,200)}`);
  _mcCategoryId = c.body.id;
  console.log(`  📂 Created category "${CATEGORY}" (${_mcCategoryId})`);
  return _mcCategoryId;
}

async function loadInterests(categoryId) {
  const r = await mc('GET', `/lists/${cfg.mailchimpListId}/interest-categories/${categoryId}/interests?count=1000`);
  for (const i of (r.body.interests || [])) _mcInterests[i.name] = i.id;
  console.log(`  📌 ${Object.keys(_mcInterests).length} existing Mailchimp interests loaded`);
}

async function getOrCreateInterest(categoryId, groupName) {
  if (_mcInterests[groupName]) return _mcInterests[groupName];
  const c = await mc('POST', `/lists/${cfg.mailchimpListId}/interest-categories/${categoryId}/interests`, { name: groupName });
  if (!c.body.id) throw new Error(`Failed to create interest "${groupName}": ${JSON.stringify(c.body).slice(0,200)}`);
  _mcInterests[groupName] = c.body.id;
  console.log(`    ➕ Created interest "${groupName}" (${c.body.id})`);
  return c.body.id;
}

async function upsertMember(contact, interestMap) {
  const hash = md5(contact.email.toLowerCase());
  const r = await mc('PUT', `/lists/${cfg.mailchimpListId}/members/${hash}`, {
    email_address: contact.email,
    status_if_new: 'subscribed',
    merge_fields:  { FNAME: contact.firstName || '', LNAME: contact.lastName || '' },
    interests:     interestMap,
  });
  if (r.status >= 400) throw new Error(`Mailchimp PUT ${r.status}: ${JSON.stringify(r.body).slice(0,200)}`);
  return r.body;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const mode = (process.argv[2] || 'pending').toLowerCase();
  console.log(`\n🐵  ELC → Mailchimp CRM Sync   [mode: ${mode}]`);
  console.log('─'.repeat(52));

  await fbSignIn();

  const [contacts, groups] = await Promise.all([getCollection('contacts'), getCollection('groups')]);
  console.log(`📋 ${contacts.length} contacts, ${groups.length} groups loaded from Firestore`);

  const groupName = {};
  for (const g of groups) groupName[g.id] = g.name;

  const toSync = mode === 'full'
    ? contacts.filter(c => c.email)
    : contacts.filter(c => c.email && c.mailchimpPendingSync);

  if (!toSync.length) { console.log('\n✅ Nothing to sync.\n'); return; }
  console.log(`📤 Contacts to sync: ${toSync.length}\n`);

  const categoryId = await getOrCreateCategory();
  await loadInterests(categoryId);

  // Ensure every CRM group referenced by toSync has a Mailchimp interest
  const usedGroupIds = [...new Set(toSync.flatMap(c => c.groups || []))];
  for (const gid of usedGroupIds) {
    const name = groupName[gid];
    if (name) await getOrCreateInterest(categoryId, name);
  }

  console.log('\n' + '─'.repeat(52));
  let synced = 0, failed = 0;
  for (const contact of toSync) {
    try {
      const contactGroupNames = (contact.groups || []).map(gid => groupName[gid]).filter(Boolean);
      // Build interest map: true for groups contact is in, false for all others
      const interestMap = {};
      for (const [name, id] of Object.entries(_mcInterests)) {
        interestMap[id] = contactGroupNames.includes(name);
      }
      await upsertMember(contact, interestMap);
      await patchDoc('contacts', contact.id, { mailchimpPendingSync: false, mailchimpLastSync: Date.now() });
      synced++;
      const label = contactGroupNames.join(', ') || 'no groups';
      console.log(`  ✅ ${contact.email.padEnd(42)} [${label}]`);
    } catch (e) {
      failed++;
      console.error(`  ❌ ${contact.email}: ${e.message}`);
    }
  }

  await patchDoc('eos', 'settings', { mailchimpLastSync: Date.now() });

  console.log('─'.repeat(52));
  console.log(`📊 Done: ${synced} synced, ${failed} failed`);
  console.log('✅ mailchimpLastSync updated in Firestore\n');
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
