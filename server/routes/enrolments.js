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