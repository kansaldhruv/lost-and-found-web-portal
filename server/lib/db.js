/**
 * LOST & FOUND CAMPUS PORTAL — DATABASE LAYER
 * Thin JSON-file persistence layer. Reads/writes JSON files atomically.
 * Acts as a simple in-memory + file-backed store.
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

/** Read a JSON data file synchronously (safe, returns [] / {} on error) */
function readFile(filename, defaultVal = []) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[DB] Failed to read ${filename}:`, err.message);
    return defaultVal;
  }
}

/** Write data to a JSON file synchronously */
function writeFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`[DB] Failed to write ${filename}:`, err.message);
    return false;
  }
}

// ── Items ─────────────────────────────────────────────────────────────────
const Items = {
  getAll:    ()       => readFile('items.json', []),
  save:      (items)  => writeFile('items.json', items),
  findById:  (id)     => Items.getAll().find(i => i.id === id) || null,
  create(item) {
    const items = Items.getAll();
    items.unshift(item);
    Items.save(items);
    return item;
  },
  update(id, patch) {
    const items = Items.getAll();
    const idx   = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...patch };
    Items.save(items);
    return items[idx];
  },
  delete(id) {
    const items = Items.getAll();
    const idx   = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    const [removed] = items.splice(idx, 1);
    Items.save(items);
    return removed;
  }
};

// ── Claims ────────────────────────────────────────────────────────────────
const Claims = {
  getAll:   ()       => readFile('claims.json', []),
  save:     (claims) => writeFile('claims.json', claims),
  findById: (id)     => Claims.getAll().find(c => c.claimId === id) || null,
  create(claim) {
    const claims = Claims.getAll();
    claims.unshift(claim);
    Claims.save(claims);
    return claim;
  },
  update(id, patch) {
    const claims = Claims.getAll();
    const idx    = claims.findIndex(c => c.claimId === id);
    if (idx === -1) return null;
    claims[idx] = { ...claims[idx], ...patch };
    Claims.save(claims);
    return claims[idx];
  }
};

// ── History ───────────────────────────────────────────────────────────────
const History = {
  getAll:  ()      => readFile('history.json', []),
  save:    (hist)  => writeFile('history.json', hist),
  create(entry) {
    const history = History.getAll();
    history.unshift(entry);
    History.save(history);
    return entry;
  }
};

// ── Teachers ──────────────────────────────────────────────────────────────
const Teachers = {
  getAll:      ()      => readFile('teachers.json', { teachers: [] }).teachers || [],
  findByEmail: (email) => Teachers.getAll().find(t => t.email.toLowerCase() === email.toLowerCase()) || null,
  findById:    (id)    => Teachers.getAll().find(t => t.id === id) || null
};

const Students = {
  getAll:      ()      => readFile('teachers.json', { students: [] }).students || [],
  findByEmail: (email) => Students.getAll().find(s => s.email.toLowerCase() === email.toLowerCase()) || null,
  findById:    (id)    => Students.getAll().find(s => s.id === id) || null
};

module.exports = { Items, Claims, History, Teachers, Students };
