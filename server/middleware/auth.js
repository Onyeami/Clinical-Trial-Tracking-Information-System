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

/**
 * Middleware to restrict access based on user role
 */
const authorise = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required for authorization check.' })
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: `Forbidden. Requires one of these roles: ${allowedRoles.join(', ')}` })
        }

        next()
    }
}

/**
 * Middleware for Researchers to ensure ownership of the trial/resource
 * Note: Only applies if req.user.role === 'researcher'
 * Admin bypasses this check.
 */
const requireOwnership = (resourceType) => {
    return async (req, res, next) => {
        const user = req.user
        if (!user) return res.status(401).json({ error: 'Auth required' })
        
        // Admins have full access
        if (user.role === 'admin') return next()

        // Coordinators don't own trials, they just work on them. 
        // Usually combined with authorize('admin', 'researcher')
        if (user.role === 'coordinator') {
            return res.status(403).json({ error: 'Coordinators do not have ownership privileges.' })
        }

        const resourceId = req.params.id || req.params.trialId

        try {
            if (resourceType === 'trial') {
                const trial = await queryOne('SELECT researcher_id FROM trials WHERE id = $1', [resourceId])
                if (!trial) return res.status(404).json({ error: 'Trial not found' })

                if (trial.researcher_id !== user.researcher_id) {
                    return res.status(403).json({ error: 'Access denied. This trial belongs to another researcher.' })
                }
            }

            // If we reach here, ownership is confirmed or user is admin
            next()
        }   catch (err) {
            next(err)
        }
    }
}

module.exports = { authenticate, authorise, requireOwnership }
