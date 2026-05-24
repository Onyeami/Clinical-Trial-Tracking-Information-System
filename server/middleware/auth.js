const jwt = require('jsonwebtoken')
const { queryOne } = require('../db/database')

/**
 * Middleware to verify JWT and attach user to request object
 */
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: 'Authentication required. Token missing.' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)