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

// GET /api/phases/:id
// (mounted separately in app.js as /api/phases/:id)
const getById = async (req, res, next) => {
    try {
        const row = await queryOne(`
            SELECT tp.*, t.researcher_id 
            FROM trial_phases tp 
            JOIN trials t ON t.id = tp.trial_id
            WHERE tp.id = $1
        `, [req.params.id])
        if (!row) return res.status(404).json({ error: 'Phase not found' })
        
        // RBAC: Researcher ownership check
        if (req.user.role === 'researcher' && row.researcher_id !== req.user.researcher_id) {
            return res.status(403).json({ error: 'Access denied. This trial phase belongs to another researcher.' })
        }

        res.json(row)
    }   catch (err) { next(err) }
}

// POST /api/trials/:trialId/phases (Admin and Researcher owner only)
router.post('/', authorise('admin', 'researcher'), requireOwnership('trial'), async (req, res, next) => {
    try {
        const { phase_name, description, duration_weeks, order_number } = req.body
        if (!phase_name) {
            return res.status(400).json({ error: 'phase_name is required.' })
        }
        // Verify trial exists
        const trial = await queryOne(`SELECT id FROM trials WHERE id = $1`, [req.params.trialId])
        if (!trial) return res.status(404).json({ error: 'Trial not found' })

        const row = await queryOne(
            `INSERT INTO trial_phases (trial_id, phase_name, description, duration_weeks, order_number)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [req.params.trialId, phase_name.trim(), description?.trim() ?? null,
            duration_weeks ? parseInt(duration_weeks) : null,
            order_number  ? parseInt(order_number)  : null]
        )
        res.status(201).json(row)
    }   catch (err) { next(err) }
})