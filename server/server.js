require('dotenv').config()
const app = require('./app')
const { createSchema } = require('./db/schema')
const { pool } = require('./db/database')

const PORT = process.env.PORT || 3001

async function start() {
    try {
        // Verify DB connection
        await pool.query('SELECT 1')
        console.log('✓ PostgreSQL connected')

        // Ensure schema exists
        await createSchema()

        // Auto-seed if database is empty (no users)
        const { rows } = await pool.query('SELECT count(*) FROM users')
        if (parseInt(rows[0].count) === 0) {
            const { seed } = require('./db/seed')
            console.log('⚠ No users found. Initializing database with sample data...')
            await seed()
        }

        app.listen(PORT, () => {
            console.log(`✓ Server running on http://localhost:${PORT}`)
            console.log(`  Health: http://localhost:${PORT}/api/health`)
        })
    }   catch (err) {
        console.error('✗ Failed to start server:', err.message)
        process.exit(1)
    }
}

start()
