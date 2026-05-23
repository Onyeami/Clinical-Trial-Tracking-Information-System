require('dotenv').config()
const bcrypt = require('bcryptjs')
const { pool } = require('./database')
const { createSchema } = require('./schema')

async function seed(existingClient = null) {
    await createSchema()
    const client = existingClient || await pool.connect()

    try {
        await client.query('BEGIN')

        // Clear existing data (order respects FK constraints)
        await client.query('DELETE FROM checkins')
        await client.query('DELETE FROM enrolments')
        await client.query('DELETE FROM trial_phases')
        await client.query('DELETE FROM participants')
        await client.query('DELETE FROM trials')
        await client.query('DELETE FROM users')
        await client.query('DELETE FROM researchers')

        // Reset sequences
        await client.query(`SELECT setval('researchers_id_seq', 1, false)`)
        await client.query(`SELECT setval('trials_id_seq', 1, false)`)
        await client.query(`SELECT setval('trial_phases_id_seq', 1, false)`)
        await client.query(`SELECT setval('participants_id_seq', 1, false)`)
        await client.query(`SELECT setval('users_id_seq', 1, false)`)
        await client.query(`SELECT setval('enrolments_id_seq', 1, false)`)
        await client.query(`SELECT setval('checkins_id_seq', 1, false)`)

        // ── Researchers ──────────────────────────────────────────────────────────
        const { rows: researchers } = await client.query(`
            INSERT INTO researchers (first_name, last_name, email, department) VALUES
                ('Siobhán',  'O''Brien',   's.obrien@svuh.ie',    'Oncology'),
                ('Ciarán',   'Murphy',     'c.murphy@svuh.ie',    'Cardiology'),
                ('Aoife',    'Walsh',      'a.walsh@svuh.ie',     'Neurology'),
                ('Declan',   'Flanagan',   'd.flanagan@svuh.ie',  'Respiratory Medicine')
            RETURNING id, email
        `)
        const [res1, res2, res3, res4] = researchers

        // ── Users ────────────────────────────────────────────────────────────────
        const salt = await bcrypt.genSalt(10)
        const adminPasswordHtml = await bcrypt.hash('admin123', salt)
        const resPasswordHash = await bcrypt.hash('password123', salt)

        // Create Admin
        await client.query(`
            INSERT INTO users (email, password_hash, role)
            VALUES ('admin@svuh.ie', $1, 'admin')
        `, [adminPasswordHtml])

        // Create Researcher Users (linked to researchers)
        for (const r of researchers) {
            await client.query(`
                INSERT INTO users (researcher_id, email, password_hash, role)
                VALUES ($1, $2, $3, 'researcher')
            `, [r.id, r.email, resPasswordHash])
        }

        // Create a Coordinator
        await client.query(`
            INSERT INTO users (email, password_hash, role)
            VALUES ('coord@svuh.ie', $1, 'coordinator')
        `, [resPasswordHash])
