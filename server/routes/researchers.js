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