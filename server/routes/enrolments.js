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

// GET /api/enrolments/:id
router.get('/:id', async (req, res, next) => {
    try {
        const row = await queryOne(
            `SELECT e.*,
                    p.first_name || ' ' || p.last_name AS participant_name,
                    t.title AS trial_title, t.researcher_id,
                    tp.phase_name,
                    COUNT(c.id)::int AS checkin_count
                FROM enrolments e
                JOIN participants p  ON p.id = e.participant_id
                JOIN trials t        ON t.id = e.trial_id
                LEFT JOIN trial_phases tp ON tp.id = e.phase_id
                LEFT JOIN checkins c ON c.enrolment_id = e.id
                WHERE e.id = $1
                GROUP BY e.id, p.first_name, p.last_name, t.title, t.researcher_id, tp.phase_name`,
            [req.params.id]
        )
        if (!row) return res.status(404).json({ error: 'Enrolment not found' })

        // RBAC: Researcher can only see their own trial data
        if (req.user.role === 'researcher' && row.researcher_id !== req.user.researcher_id) {
            return res.status(403).json({ error: 'Access denied. This enrolment belongs to another researcher.' })
        }

        res.json(row)
    } catch (err) { next(err) }
})

// POST /api/enrolments
router.post('/', async (req, res, next) => {
    try {
        const { participant_id, trial_id, phase_id, enrolment_date, status = 'enrolled' } = req.body

        if (!participant_id || !trial_id || !enrolment_date) {
            return res.status(400).json({ error: 'participant_id, trial_id and enrolment_date are required.' })
        }
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` })
        }