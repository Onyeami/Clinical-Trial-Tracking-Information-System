const express = require('express')
const router  = express.Router({ mergeParams: true })
const { query, queryOne } = require('../db/database')
const { authenticate, authorise } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

const VALID_TYPES    = ['in-person', 'remote']
const VALID_OUTCOMES = ['scheduled', 'attended', 'missed', 'rescheduled']

// GET /api/enrolments/:enrolmentId/checkins
router.get('/', async (req, res, next) => {
    try {
        // RBAC: Researcher ownership check
        if (req.user.role === 'researcher') {
            const enrolment = await queryOne(`SELECT trial_id FROM enrolments WHERE id = $1`, [req.params.enrolmentId])
            if (enrolment) {
                const trial = await queryOne(`SELECT researcher_id FROM trials WHERE id = $1`, [enrolment.trial_id])
                if (trial && trial.researcher_id !== req.user.researcher_id) {
                    return res.status(403).json({ error: 'Access denied. This enrolment belongs to another researcher.' })
                }
            }
        }

        const { rows } = await query(
            `SELECT * FROM checkins
            WHERE enrolment_id = $1
            ORDER BY scheduled_date DESC`,
            [req.params.enrolmentId]
        )
        res.json(rows)
    }   catch (err) { next(err) }
})