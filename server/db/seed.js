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
