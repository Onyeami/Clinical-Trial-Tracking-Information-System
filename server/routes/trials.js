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