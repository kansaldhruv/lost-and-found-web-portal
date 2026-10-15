/**
 * STATS ROUTES  —  /api/stats
 *
 * GET /api/stats  — Public admin dashboard statistics
 */

const express                      = require('express');
const { Items, Claims, History }   = require('../lib/db');

const router = express.Router();

router.get('/', (_req, res) => {
  try {
    const items   = Items.getAll();
    const claims  = Claims.getAll();
    const history = History.getAll();

    const activeItems    = items.filter(i => i.status !== 'Returned').length;
    const pendingClaims  = claims.filter(c => c.status === 'Pending Review').length;
    const approvedClaims = claims.filter(c => c.status === 'Approved for Pickup').length;
    const totalReturned  = history.length;
    const totalClaims    = claims.length;

    // Category breakdown
    const categoryCount = {};
    items.forEach(i => {
      categoryCount[i.category] = (categoryCount[i.category] || 0) + 1;
    });

    // Zone breakdown
    const zoneCount = {};
    items.forEach(i => {
      zoneCount[i.locationZone] = (zoneCount[i.locationZone] || 0) + 1;
    });

    res.json({
      success: true,
      stats: {
        activeItems,
        pendingClaims,
        approvedClaims,
        totalReturned,
        totalClaims,
        resolutionRate: totalClaims > 0
          ? ((totalReturned / (totalReturned + totalClaims)) * 100).toFixed(1) + '%'
          : null,
        byCategory: categoryCount,
        byZone:     zoneCount
      }
    });
  } catch (err) {
    console.error('[STATS GET /]', err);
    res.status(500).json({ success: false, error: 'Failed to load statistics.' });
  }
});

module.exports = router;
