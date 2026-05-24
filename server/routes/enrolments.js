const express = require('express')
const router  = express.Router()
const { query, queryOne } = require('../db/database')
const { authenticate, authorise } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

const VALID_STATUSES = ['enrolled', 'completed', 'withdrawn', 'adverse_event']

// GET /api/enrolments?trial_id=1&status=enrolled&participant_id=2
router.get('/', async (req, res, next) => {
    try {
        const { trial_id, participant_id, status } = req.query
        const conditions = []
        const params = []

        // ── RBAC: Researcher filter ───────────────────────────────────────────
        if (req.user.role === 'researcher') {
            params.push(req.user.researcher_id)
            conditions.push(`t.researcher_id = $${params.length}`)
        }
        // ──────────────────────────────────────────────────────────────────────

        if (trial_id) {
            params.push(trial_id)
            conditions.push(`e.trial_id = $${params.length}`)
        }
        if (participant_id) {
            params.push(participant_id)
            conditions.push(`e.participant_id = $${params.length}`)
        }
        if (status && VALID_STATUSES.includes(status)) {
            params.push(status)
            conditions.push(`e.status = $${params.length}`)
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

        const { rows } = await query(
            `SELECT e.*,
                    p.first_name || ' ' || p.last_name AS participant_name,
                    t.title AS trial_title,
                    tp.phase_name
                FROM enrolments e
                JOIN participants p  ON p.id = e.participant_id
                JOIN trials t        ON t.id = e.trial_id
                LEFT JOIN trial_phases tp ON tp.id = e.phase_id
                ${where}
                ORDER BY e.enrolment_date DESC`,
            params
        )
        res.json(rows)
    }   catch (err) { next(err) }
})