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

