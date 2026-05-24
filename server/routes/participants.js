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

// POST /api/participants
router.post('/', async (req, res, next) => {
    try {
        const {
            first_name, last_name, date_of_birth,
            pps_number, phone, email, address,
            consent_status = 'pending', is_active = true
        } = req.body

        if (!first_name || !last_name || !date_of_birth) {
            return res.status(400).json({ error: 'first_name, last_name and date_of_birth are required.' })
        }
        if (!CONSENT_OPTS.includes(consent_status)) {
            return res.status(400).json({ error: `consent_status must be one of: ${CONSENT_OPTS.join(', ')}` })
        }

        const row = await queryOne(
            `INSERT INTO participants
                (first_name, last_name, date_of_birth, pps_number, phone, email, address, consent_status, is_active)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *`,
            [
                first_name.trim(), last_name.trim(), date_of_birth,
                pps_number?.trim().toUpperCase() ?? null,
                phone?.trim() ?? null,
                email?.trim().toLowerCase() ?? null,
                address?.trim() ?? null,
                consent_status,
                is_active
            ]
        )
        res.status(201).json(row)
    }   catch (err) { next(err) }
})

// PUT /api/participants/:id
router.put('/:id', async (req, res, next) => {
    try {
        const {
            first_name, last_name, date_of_birth,
            pps_number, phone, email, address,
            consent_status, is_active
        }   = req.body

        if (!first_name || !last_name || !date_of_birth) {
            return res.status(400).json({ error: 'first_name, last_name and date_of_birth are required.' })
        }
        if (consent_status && !CONSENT_OPTS.includes(consent_status)) {
            return res.status(400).json({ error: `consent_status must be one of: ${CONSENT_OPTS.join(', ')}` })
        }

        const row = await queryOne(
            `UPDATE participants
            SET first_name = $1, last_name = $2, date_of_birth = $3,
                pps_number = $4, phone = $5, email = $6, address = $7,
                consent_status = $8, is_active = $9
            WHERE id = $10
            RETURNING *`,
            [
                first_name.trim(), last_name.trim(), date_of_birth,
                pps_number?.trim().toUpperCase() ?? null,
                phone?.trim() ?? null,
                email?.trim().toLowerCase() ?? null,
                address?.trim() ?? null,
                consent_status ?? 'pending',
                is_active ?? true,
                req.params.id
            ]
        )
        if (!row) return res.status(404).json({ error: 'Participant not found' })
        res.json(row)
    }   catch (err) { next(err) }
})