const express = require('express')
const router  = express.Router()
const { query, queryOne } = require('../db/database')
const { authenticate, authorise } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// GET /api/researchers
router.get('/', async (req, res, next) => {
    try {
        const { rows } = await query(
            `SELECT id, first_name, last_name, email, department, created_at
            FROM researchers
            ORDER BY last_name, first_name`
        )
        res.json(rows)
    } catch (err) { next(err) }
})

// GET /api/researchers/:id
router.get('/:id', async (req, res, next) => {
    try {
        const row = await queryOne(
            `SELECT r.id, r.first_name, r.last_name, r.email, r.department, r.created_at,
                    COUNT(t.id)::int AS trial_count
            FROM researchers r
            LEFT JOIN trials t ON t.researcher_id = r.id
            WHERE r.id = $1
            GROUP BY r.id`,
            [req.params.id]
        )
        if (!row) return res.status(404).json({ error: 'Researcher not found' })
        res.json(row)
    } catch (err) { next(err) }
})

// POST /api/researchers (Admin only)
router.post('/', authorise('admin'), async (req, res, next) => {
    try {
        const { first_name, last_name, email, department } = req.body
        if (!first_name || !last_name || !email) {
            return res.status(400).json({ error: 'first_name, last_name and email are required.' })
        }
        const row = await queryOne(
            `INSERT INTO researchers (first_name, last_name, email, department)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [first_name.trim(), last_name.trim(), email.trim().toLowerCase(), department?.trim() ?? null]
        )
        res.status(201).json(row)
    }   catch (err) { next(err) }
})