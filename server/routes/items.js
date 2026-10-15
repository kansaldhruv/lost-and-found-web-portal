/**
 * ITEMS ROUTES  —  /api/items
 *
 * GET    /api/items          — List all active items (students: no secretDetails)
 * GET    /api/items/:id      — Get single item
 * POST   /api/items          — Create item  [AUTHENTICATED USER]
 * PUT    /api/items/:id      — Update item  [TEACHER ONLY]
 * DELETE /api/items/:id      — Delete item  [TEACHER ONLY]
 * POST   /api/items/upload   — Upload image [TEACHER ONLY] → returns hosted URL
 */

const express    = require('express');
const path       = require('path');
const { Items }  = require('../lib/db');
const { requireAuth, requireFaculty, optionalAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// ── Helper: strip secret from item for public responses ───────────────────
function publicItem(item) {
  const { secretDetails, ...pub } = item; // eslint-disable-line no-unused-vars
  return pub;
}

function generateId() {
  const num = 100 + Math.floor(Math.random() * 9900);
  return `ITM-${num}-${Date.now().toString(36).toUpperCase()}`;
}

// ── GET /api/items ─────────────────────────────────────────────────────────
router.get('/', optionalAuth, (req, res) => {
  try {
    let items = Items.getAll().filter(i => i.status !== 'Returned');

    // Filters
    const { category, zone, status, q, sort, dateRange } = req.query;

    if (category && category !== 'all')  items = items.filter(i => i.category === category);
    if (zone)                            items = items.filter(i => i.locationZone === zone);
    if (status && status !== 'all')      items = items.filter(i => i.status === status);

    if (q && q.trim()) {
      const query = q.toLowerCase().trim();
      items = items.filter(i => {
        return (
          i.title.toLowerCase().includes(query)         ||
          i.publicDesc.toLowerCase().includes(query)    ||
          i.category.toLowerCase().includes(query)      ||
          i.locationZone.toLowerCase().includes(query)  ||
          i.exactLocation.toLowerCase().includes(query) ||
          (i.facultyCustodian || '').toLowerCase().includes(query)
        );
      });
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      items = items.filter(i => {
        const diff = (now - new Date(i.dateFound)) / (1000 * 60 * 60 * 24);
        if (dateRange === 'today') return diff <= 1.5;
        if (dateRange === 'week')  return diff <= 7.5;
        if (dateRange === 'month') return diff <= 31;
        return true;
      });
    }

    // Sorting
    if (sort === 'oldest') {
      items.sort((a, b) => new Date(a.dateFound) - new Date(b.dateFound));
    } else if (sort === 'az') {
      items.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // default: newest first
      items.sort((a, b) => new Date(b.dateFound) - new Date(a.dateFound));
    }

    // Strip secrets for students
    const isTeacher = req.teacher && req.teacher.role === 'teacher';
    const result = isTeacher ? items : items.map(publicItem);

    res.json({ success: true, count: result.length, items: result });
  } catch (err) {
    console.error('[ITEMS GET /]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch items.' });
  }
});

// ── GET /api/items/:id ─────────────────────────────────────────────────────
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const item = Items.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Item not found.' });

    const isTeacher = req.teacher && req.teacher.role === 'teacher';
    res.json({ success: true, item: isTeacher ? item : publicItem(item) });
  } catch (err) {
    console.error('[ITEMS GET /:id]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch item.' });
  }
});

// ── POST /api/items ─────────────────────────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  try {
    const {
      title, category, locationZone, exactLocation,
      dateFound, imageUrl, publicDesc, secretDetails, custodyRoom
    } = req.body;

    // Validate required fields
    const missing = [];
    if (!title)         missing.push('title');
    if (!category)      missing.push('category');
    if (!locationZone)  missing.push('locationZone');
    if (!exactLocation) missing.push('exactLocation');
    if (!dateFound)     missing.push('dateFound');
    if (!publicDesc)    missing.push('publicDesc');
    if (!secretDetails) missing.push('secretDetails');

    if (missing.length > 0) {
      return res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(', ')}` });
    }

    const newItem = {
      id:             generateId(),
      title:          title.trim(),
      category,
      locationZone,
      exactLocation:  exactLocation.trim(),
      dateFound,
      imageUrl:       imageUrl || 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80',
      publicDesc:     publicDesc.trim(),
      secretDetails:  secretDetails.trim(),
      facultyCustodian: req.teacher.role === 'teacher' ? req.teacher.name : 'Student Contributor',
      custodyRoom:   (custodyRoom || req.teacher.custodyRoom || 'Campus Lost & Found Desk').trim(),
      status:         'Available',
      claimsCount:    0,
      postedBy:       req.teacher.id,
      createdAt:      new Date().toISOString()
    };

    const created = Items.create(newItem);
    res.status(201).json({ success: true, message: 'Item published successfully.', item: created });
  } catch (err) {
    console.error('[ITEMS POST /]', err);
    res.status(500).json({ success: false, error: 'Failed to create item.' });
  }
});

// ── PUT /api/items/:id ─────────────────────────────────────────────────────
router.put('/:id', requireAuth, requireFaculty, (req, res) => {
  try {
    const item = Items.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Item not found.' });

    // Allowed update fields
    const allowed = [
      'title', 'category', 'locationZone', 'exactLocation',
      'dateFound', 'imageUrl', 'publicDesc', 'secretDetails',
      'custodyRoom', 'status'
    ];

    const patch = {};
    allowed.forEach(key => {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    });

    const updated = Items.update(req.params.id, patch);
    res.json({ success: true, message: 'Item updated.', item: updated });
  } catch (err) {
    console.error('[ITEMS PUT /:id]', err);
    res.status(500).json({ success: false, error: 'Failed to update item.' });
  }
});

// ── DELETE /api/items/:id ──────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireFaculty, (req, res) => {
  try {
    const removed = Items.delete(req.params.id);
    if (!removed) return res.status(404).json({ success: false, error: 'Item not found.' });
    res.json({ success: true, message: `Item "${removed.title}" deleted.` });
  } catch (err) {
    console.error('[ITEMS DELETE /:id]', err);
    res.status(500).json({ success: false, error: 'Failed to delete item.' });
  }
});

// ── POST /api/items/upload-image ──────────────────────────────────────────
router.post('/upload-image', requireAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided.' });
    }
    // Return URL relative to server root
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl, filename: req.file.filename });
  } catch (err) {
    console.error('[ITEMS /upload-image]', err);
    res.status(500).json({ success: false, error: 'Image upload failed.' });
  }
});

module.exports = router;
