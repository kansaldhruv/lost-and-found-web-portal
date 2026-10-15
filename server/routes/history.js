/**
 * HISTORY ROUTES  —  /api/history
 *
 * GET  /api/history        — Get all return history records  [PUBLIC]
 * POST /api/history/return — Mark item returned + log to history  [TEACHER ONLY]
 */

const express                   = require('express');
const { History, Items, Claims } = require('../lib/db');
const { requireAuth, requireFaculty } = require('../middleware/auth');

const router = express.Router();

function generateReturnId() {
  return 'RET-' + Math.floor(200 + Math.random() * 800);
}

// ── GET /api/history ────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    let history = History.getAll();

    // Optional filters
    const { q, category } = req.query;

    if (category && category !== 'all') {
      history = history.filter(h => h.category === category);
    }

    if (q && q.trim()) {
      const query = q.toLowerCase().trim();
      history = history.filter(h =>
        h.title.toLowerCase().includes(query)              ||
        (h.facultyCustodian || '').toLowerCase().includes(query) ||
        (h.studentName || '').toLowerCase().includes(query)      ||
        (h.locationFound || '').toLowerCase().includes(query)
      );
    }

    res.json({ success: true, count: history.length, history });
  } catch (err) {
    console.error('[HISTORY GET /]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch history.' });
  }
});

// ── POST /api/history/return ─────────────────────────────────────────────
// Records the physical handover: moves item from active → history
router.post('/return', requireAuth, requireFaculty, (req, res) => {
  try {
    const { itemId, claimId, studentName, studentRoll, handoffNotes } = req.body;

    const missing = [];
    if (!itemId)       missing.push('itemId');
    if (!studentName)  missing.push('studentName');
    if (!studentRoll)  missing.push('studentRoll');

    if (missing.length > 0) {
      return res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(', ')}` });
    }

    const item = Items.findById(itemId);
    if (!item) return res.status(404).json({ success: false, error: 'Item not found.' });

    // Mask student roll number for privacy  e.g. "PRN ***842 (CS)"
    const rollParts = studentRoll.split('-');
    const lastPart  = rollParts[rollParts.length - 1];
    const maskedRoll = 'PRN ***' + (lastPart.length > 3 ? lastPart.slice(-3) : lastPart);

    const historyEntry = {
      id:              generateReturnId(),
      title:           item.title,
      category:        item.category,
      imageUrl:        item.imageUrl,
      locationFound:   item.locationZone,
      dateFound:       item.dateFound.split('T')[0],
      dateReturned:    new Date().toISOString().split('T')[0],
      studentName:     studentName.trim(),
      studentRollMasked: maskedRoll,
      facultyCustodian: req.teacher ? req.teacher.name : item.facultyCustodian,
      handoffNotes:    (handoffNotes || 'Ownership verified. Item collected by student.').trim(),
      createdAt:       new Date().toISOString()
    };

    // Save to history
    History.create(historyEntry);

    // Remove from active items
    Items.delete(itemId);

    // Mark linked claim as completed
    if (claimId) {
      const claim = Claims.findById(claimId);
      if (claim) Claims.update(claimId, { status: 'Returned / Completed' });
    } else {
      // Auto-close all open claims for this item
      Claims.getAll()
        .filter(c => c.itemId === itemId && !c.status.includes('Returned'))
        .forEach(c => Claims.update(c.claimId, { status: 'Returned / Completed' }));
    }

    res.status(201).json({
      success: true,
      message: `Item "${item.title}" successfully handed over to ${studentName} and archived in Return History.`,
      historyEntry
    });
  } catch (err) {
    console.error('[HISTORY POST /return]', err);
    res.status(500).json({ success: false, error: 'Failed to record return.' });
  }
});

module.exports = router;
