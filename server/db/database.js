require('dotenv').config()
const { Pool, types } = require('pg')

// Force DATE (OID 1082) to be returned as a string (YYYY-MM-DD)
// This avoids timezone shifting issues when converting to UTC JSON
types.setTypeParser(1082, (val) => val)

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Allow self-signed certs when connecting to hosted DBs (e.g. Render, Supabase)
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL client error:', err.message)
})

// Helper: run a query and return rows
const query = (text, params) => pool.query(text, params)

// Helper: get a single row
const queryOne = async (text, params) => {
    const { rows } = await pool.query(text, params)
    return rows[0] ?? null
}

module.exports = { pool, query, queryOne }