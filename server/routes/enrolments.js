const express = require('express')
const router  = express.Router()
const { query, queryOne } = require('../db/database')
const { authenticate, authorise } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

const VALID_STATUSES = ['enrolled', 'completed', 'withdrawn', 'adverse_event']