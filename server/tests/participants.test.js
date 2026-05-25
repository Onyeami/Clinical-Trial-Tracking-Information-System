const request  = require('supertest')
const app      = require('../app')
const { pool } = require('../db/database')
const { createSchema } = require('../db/schema')

beforeAll(async () => {
    await createSchema()
    await pool.query('DELETE FROM checkins')
    await pool.query('DELETE FROM enrolments')
    await pool.query('DELETE FROM trial_phases')
    await pool.query('DELETE FROM participants')
    await pool.query('DELETE FROM trials')
    await pool.query('DELETE FROM researchers')
})

afterAll(async () => {
    await pool.end()
})