const express = require('express')
const router  = express.Router({ mergeParams: true })
const { query, queryOne } = require('../db/database')
const { authenticate, authorise } = require('../middleware/auth')