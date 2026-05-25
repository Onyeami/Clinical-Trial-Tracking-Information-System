const express = require('express')
const router  = express.Router()
const { query, queryOne } = require('../db/database')
const { authenticate, authorise, requireOwnership } = require('../middleware/auth')

const VALID_STATUSES = ['recruiting', 'active', 'completed', 'suspended']

// All routes require authentication
router.use(authenticate)

// GET /api/trials?status=active
router.get('/', async (req, res, next) => {
    try {
        const { status } = req.query
        let sql = `
            SELECT t.id, t.title, t.description, t.researcher_id,
                    t.start_date, t.end_date, t.status, t.created_at,
                    r.first_name || ' ' || r.last_name AS researcher_name
            FROM trials t
            LEFT JOIN researchers r ON r.id = t.researcher_id
        `
        const params = []
        const conditions = []

        // ── RBAC: Researcher filter ───────────────────────────────────────────
        if (req.user.role === 'researcher') {
            params.push(req.user.researcher_id)
            conditions.push(`t.researcher_id = $${params.length}`)
        }

        if (status && VALID_STATUSES.includes(status)) {
            params.push(status)
            conditions.push(`t.status = $${params.length}`)
        }

        if (conditions.length) {
            sql += ` WHERE ${conditions.join(' AND ')}`
        }

        sql += ` ORDER BY t.created_at DESC`
        const { rows } = await query(sql, params)
        res.json(rows)
    }   catch (err) { next(err) }
})

// GET /api/trials/:id
router.get('/:id', async (req, res, next) => {
    try {
        const row = await queryOne(
            `SELECT t.*, r.first_name || ' ' || r.last_name AS researcher_name,
                    COUNT(DISTINCT e.id)::int AS enrolment_count,
                    COUNT(DISTINCT tp.id)::int AS phase_count
            FROM trials t
            LEFT JOIN researchers r ON r.id = t.researcher_id
            LEFT JOIN enrolments e  ON e.trial_id = t.id
            LEFT JOIN trial_phases tp ON tp.trial_id = t.id
            WHERE t.id = $1
            GROUP BY t.id, r.first_name, r.last_name`,
            [req.params.id]
        )
        if (!row) return res.status(404).json({ error: 'Trial not found' })
        res.json(row)
    }   catch (err) { next(err) }
})

// POST /api/trials (Admin and Researcher only)
router.post('/', authorise('admin', 'researcher'), async (req, res, next) => {
    try {
        let { title, description, researcher_id, start_date, end_date, status = 'recruiting' } = req.body

        // If researcher, override researcher_id with their own
        if (req.user.role === 'researcher') {
            researcher_id = req.user.researcher_id
        }
        if (!title || !start_date) {
            return res.status(400).json({ error: 'title and start_date are required.' })
        }
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` })
        }
        const row = await queryOne(
            `INSERT INTO trials (title, description, researcher_id, start_date, end_date, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [title.trim(), description?.trim() ?? null, researcher_id ?? null, start_date, end_date ?? null, status]
        )
        res.status(201).json(row)
    }   catch (err) { next(err) }
})