const express = require('express')
const router  = express.Router()
const { query, queryOne } = require('../db/database')
const { authenticate } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

const CONSENT_OPTS = ['pending', 'given', 'withdrawn_consent']

// GET /api/participants?search=kelly
router.get('/', async (req, res, next) => {
    try {
        const { search } = req.query
        let sql = `
            SELECT id, first_name, last_name, date_of_birth,
                    phone, email, address, consent_status, is_active, created_at
                    -- pps_number intentionally excluded from list view
            FROM participants
        `
        const params = []
        if (search) {
            sql += `
                WHERE (
                    LOWER(first_name || ' ' || last_name) LIKE $1
                    OR LOWER(pps_number) LIKE $1
                    OR LOWER(email) LIKE $1
                )
            `
            params.push(`%${search.toLowerCase()}%`)
        }
        sql += ` ORDER BY last_name, first_name`
        const { rows } = await query(sql, params)
        res.json(rows)
    }   catch (err) { next(err) }
})

// GET /api/participants/:id  — includes pps_number for single record
router.get('/:id', async (req, res, next) => {
    try {
        const row = await queryOne(
            `SELECT p.*,
                    COUNT(e.id)::int AS enrolment_count
            FROM participants p
            LEFT JOIN enrolments e ON e.participant_id = p.id
            WHERE p.id = $1
            GROUP BY p.id`,
            [req.params.id]
        )
        if (!row) return res.status(404).json({ error: 'Participant not found' })
        res.json(row)
    }   catch (err) { next(err) }
})