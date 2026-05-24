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

// POST /api/enrolments/:enrolmentId/checkins
router.post('/', async (req, res, next) => {
    try {
        const {
            scheduled_date, actual_date,
            checkin_type = 'in-person', outcome = 'scheduled', notes
        } = req.body

        if (!scheduled_date) {
            return res.status(400).json({ error: 'scheduled_date is required.' })
        }
        if (!VALID_TYPES.includes(checkin_type)) {
            return res.status(400).json({ error: `checkin_type must be one of: ${VALID_TYPES.join(', ')}` })
        }
        if (!VALID_OUTCOMES.includes(outcome)) {
            return res.status(400).json({ error: `outcome must be one of: ${VALID_OUTCOMES.join(', ')}` })
        }

        // Verify enrolment exists
        const enrolment = await queryOne(`SELECT id FROM enrolments WHERE id = $1`, [req.params.enrolmentId])
        if (!enrolment) return res.status(404).json({ error: 'Enrolment not found' })

        const row = await queryOne(
            `INSERT INTO checkins (enrolment_id, scheduled_date, actual_date, checkin_type, outcome, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                req.params.enrolmentId,
                scheduled_date,
                actual_date ?? null,
                checkin_type,
                outcome,
                notes?.trim() ?? null
            ]
        )
        res.status(201).json(row)
    }   catch (err) { next(err) }
})

// Standalone handlers for /api/checkins/:id (mounted in app.js)
const getById = async (req, res, next) => {
    try {
        const row = await queryOne(
            `SELECT c.*,
                    p.first_name || ' ' || p.last_name AS participant_name,
                    t.title AS trial_title, t.researcher_id
                FROM checkins c
                JOIN enrolments e ON e.id = c.enrolment_id
                JOIN participants p ON p.id = e.participant_id
                JOIN trials t ON t.id = e.trial_id
                WHERE c.id = $1`,
            [req.params.id]
        )
        if (!row) return res.status(404).json({ error: 'Check-in not found' })
        
        // RBAC: Researcher ownership check
        if (req.user.role === 'researcher' && row.researcher_id !== req.user.researcher_id) {
            return res.status(403).json({ error: 'Access denied. This check-in belongs to another researcher.' })
        }

        res.json(row)
    }   catch (err) { next(err) }
}

const updateCheckin = async (req, res, next) => {
    try {
        const { scheduled_date, actual_date, checkin_type, outcome, notes } = req.body
        if (!scheduled_date) {
            return res.status(400).json({ error: 'scheduled_date is required.' })
        }
        if (checkin_type && !VALID_TYPES.includes(checkin_type)) {
            return res.status(400).json({ error: `checkin_type must be one of: ${VALID_TYPES.join(', ')}` })
        }
        if (outcome && !VALID_OUTCOMES.includes(outcome)) {
            return res.status(400).json({ error: `outcome must be one of: ${VALID_OUTCOMES.join(', ')}` })
        }
        const row = await queryOne(
            `UPDATE checkins
            SET scheduled_date = $1, actual_date = $2,
                checkin_type = $3, outcome = $4, notes = $5
            WHERE id = $6
            RETURNING *`,
            [scheduled_date, actual_date ?? null, checkin_type ?? 'in-person', outcome ?? 'scheduled', notes?.trim() ?? null, req.params.id]
        )
        if (!row) return res.status(404).json({ error: 'Check-in not found' })
        res.json(row)
    }   catch (err) { next(err) }
}
