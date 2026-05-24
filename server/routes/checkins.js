const express = require('express')
const router  = express.Router({ mergeParams: true })
const { query, queryOne } = require('../db/database')
const { authenticate, authorise } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

const VALID_TYPES    = ['in-person', 'remote']
const VALID_OUTCOMES = ['scheduled', 'attended', 'missed', 'rescheduled']