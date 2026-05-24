const express = require('express')
const router  = express.Router({ mergeParams: true })  // mergeParams gives access to :trialId
const { query, queryOne } = require('../db/database')
const { authenticate, authorise, requireOwnership } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// GET /api/trials/:trialId/phases
router.get('/', requireOwnership('trial'), async (req, res, next) => {
    try {
        const { rows } = await query(
            `SELECT * FROM trial_phases
            WHERE trial_id = $1
            ORDER BY order_number NULLS LAST, id`,
            [req.params.trialId]
        )
        res.json(rows)
    }   catch (err) { next(err) }
})