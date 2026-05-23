require('dotenv').config()
const bcrypt = require('bcryptjs')
const { pool } = require('./database')
const { createSchema } = require('./schema')

async function seed(existingClient = null) {
    await createSchema()
    const client = existingClient || await pool.connect()

    try {
        await client.query('BEGIN')