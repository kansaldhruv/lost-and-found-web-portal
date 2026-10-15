/**
 * CLAIMS ROUTES  —  /api/claims
 *
 * GET  /api/claims             — Get claims by query (claimId / roll / email)  [PUBLIC]
 * GET  /api/claims/all         — Get ALL claims                               [TEACHER ONLY]
 * POST /api/claims             — Submit a new ownership claim                 [PUBLIC]
 * PUT  /api/claims/:id/approve — Approve claim for pickup                     [TEACHER ONLY]
 * PUT  /api/claims/:id/reject  — Reject claim with reason                     [TEACHER ONLY]
 */

const express         = require('express');
const { Claims, Items } = require('../lib/db');
const { requireAuth, requireFaculty } = require('../middleware/auth');

const router = express.Router();

function generateClaimId() {
  return 'CLM-' + Math.floor(1000 + Math.random() * 9000);
}

// ── GET /api/claims/all  (teacher dashboard) ──────────────────────────────
router.get('/all', requireAuth, requireFaculty, (_req, res) => {
  try {
    const claims = Claims.getAll();
    res.json({ success: true, count: claims.length, claims });
  } catch (err) {
    console.error('[CLAIMS GET /all]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch claims.' });
  }
});

// ── GET /api/claims  (student claim tracker by ID / roll / email) ─────────
router.get('/', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a query parameter q (Claim ID, Roll, or Email).' });
    }

    const query = q.trim().toLowerCase();
    const results = Claims.getAll().filter(c =>
      c.claimId.toLowerCase() === query         ||
      c.studentRoll.toLowerCase().includes(query) ||
      c.studentEmail.toLowerCase().includes(query)
    );

    // Strip student sensitive info if no teacher context — just status visible
    const publicClaims = results.map(c => ({
      claimId:      c.claimId,
      itemId:       c.itemId,
      itemTitle:    c.itemTitle,
      studentName:  c.studentName,
      studentRoll:  c.studentRoll,
      studentProof: c.studentProof,
      status:       c.status,
      statusNote:   c.statusNote || null,
      timestamp:    c.timestamp
    }));

    res.json({ success: true, count: publicClaims.length, claims: publicClaims });
  } catch (err) {
    console.error('[CLAIMS GET /]', err);
    res.status(500).json({ success: false, error: 'Failed to search claims.' });
  }
});

// ── POST /api/claims  (student submits ownership claim) ───────────────────
router.post('/', (req, res) => {
  try {
    const { itemId, studentName, studentRoll, studentEmail, studentPhone, studentProof } = req.body;

    const missing = [];
    if (!itemId)        missing.push('itemId');
    if (!studentName)   missing.push('studentName');
    if (!studentRoll)   missing.push('studentRoll');
    if (!studentEmail)  missing.push('studentEmail');
    if (!studentProof)  missing.push('studentProof');

    if (missing.length > 0) {
      return res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(', ')}` });
    }

    const item = Items.findById(itemId);
    if (!item) return res.status(404).json({ success: false, error: 'Item not found.' });

    if (item.status === 'Returned') {
      return res.status(409).json({ success: false, error: 'This item has already been returned to its owner.' });
    }

    // Prevent duplicate claims from same student for same item
    const existing = Claims.getAll().find(
      c => c.itemId === itemId && c.studentRoll === studentRoll && c.status !== 'Returned / Completed' && c.status !== 'Rejected'
    );
    if (existing) {
      return res.status(409).json({
        success: false,
        error:   `You already have an active claim (${existing.claimId}) for this item.`,
        claimId: existing.claimId
      });
    }

    const claimId = generateClaimId();

    const newClaim = {
      claimId,
      itemId,
      itemTitle:    item.title,
      studentName:  studentName.trim(),
      studentRoll:  studentRoll.trim(),
      studentEmail: studentEmail.trim(),
      studentPhone: (studentPhone || '').trim(),
      studentProof: studentProof.trim(),
      status:       'Pending Review',
      statusNote:   null,
      timestamp:    new Date().toISOString()
    };

    Claims.create(newClaim);

    // Update item status & claim count
    Items.update(itemId, {
      claimsCount: (item.claimsCount || 0) + 1,
      status:      'Under Verification'
    });

    res.status(201).json({
      success: true,
      message: `Claim submitted! Your Claim ID is ${claimId}. Faculty will review your proof shortly.`,
      claimId,
      claim: newClaim
    });
  } catch (err) {
    console.error('[CLAIMS POST /]', err);
    res.status(500).json({ success: false, error: 'Failed to submit claim.' });
  }
});

// ── PUT /api/claims/:id/approve ───────────────────────────────────────────
router.put('/:id/approve', requireAuth, requireFaculty, (req, res) => {
  try {
    const claim = Claims.findById(req.params.id);
    if (!claim) return res.status(404).json({ success: false, error: 'Claim not found.' });

    if (claim.status === 'Approved for Pickup') {
      return res.status(409).json({ success: false, error: 'Claim is already approved.' });
    }

    const { note } = req.body;
    const statusNote = note ||
      `Proof verified by ${req.teacher.name}. Please bring your College ID card to ${req.teacher.custodyRoom} to collect the item.`;

    const updated = Claims.update(req.params.id, {
      status:       'Approved for Pickup',
      statusNote,
      reviewedBy:   req.teacher.name,
      reviewedAt:   new Date().toISOString()
    });

    // Update item status
    Items.update(claim.itemId, { status: 'Ready for Pickup' });

    res.json({ success: true, message: `Claim ${req.params.id} approved. Student can now collect the item.`, claim: updated });
  } catch (err) {
    console.error('[CLAIMS PUT /:id/approve]', err);
    res.status(500).json({ success: false, error: 'Failed to approve claim.' });
  }
});

// ── PUT /api/claims/:id/reject ────────────────────────────────────────────
router.put('/:id/reject', requireAuth, requireFaculty, (req, res) => {
  try {
    const claim = Claims.findById(req.params.id);
    if (!claim) return res.status(404).json({ success: false, error: 'Claim not found.' });

    const { reason } = req.body;
    const statusNote = reason || 'Claim rejected by faculty. The submitted proof did not match custody records.';

    const updated = Claims.update(req.params.id, {
      status:     'Rejected',
      statusNote,
      reviewedBy: req.teacher.name,
      reviewedAt: new Date().toISOString()
    });

    // Revert item to Available if no other pending claims remain
    const otherPending = Claims.getAll().filter(
      c => c.itemId === claim.itemId && c.claimId !== claim.claimId && c.status === 'Pending Review'
    );
    if (otherPending.length === 0) {
      Items.update(claim.itemId, { status: 'Available' });
    }

    res.json({ success: true, message: `Claim ${req.params.id} rejected.`, claim: updated });
  } catch (err) {
    console.error('[CLAIMS PUT /:id/reject]', err);
    res.status(500).json({ success: false, error: 'Failed to reject claim.' });
  }
});

module.exports = router;
