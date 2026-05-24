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

        // Fetch full user details from DB to ensure they still exist and are active
        const user = await queryOne(
            'SELECT id, email, role, researcher_id, is_active FROM users WHERE id = $1',
            [decoded.id]
        )

        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'User no longer exists or is inactive.' })
        }

        req.user = user
        next()
    }   catch (err) {
        console.error('JWT Verification Error:', err.message)
        return res.status(401).json({ error: 'Invalid or expired token.' })
    }
}