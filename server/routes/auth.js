const express = require('express')
const jwt     = require('jsonwebtoken')
const bcrypt  = require('bcryptjs')
const router  = express.Router()
const { queryOne } = require('../db/database')

/**
 * POST /api/auth/login
 * Public endpoint to sign in and receive a JWT
 */
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' })
        }

        // Find user
        const user = await queryOne(
            'SELECT id, email, password_hash, role, researcher_id, is_active FROM users WHERE email = $1',
            [email.toLowerCase()]
        )

        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Invalid credentials or inactive account.' })
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash)
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' })
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        )

        // Return user info and token
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                researcher_id: user.researcher_id
            }
        })
    }   catch (err) {
        next(err)
    }
})
