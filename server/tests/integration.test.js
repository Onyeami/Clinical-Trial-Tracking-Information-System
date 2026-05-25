/**
 * Integration test — simulates a complete clinical trial workflow:
 * Researcher created → Trial created → Phase added → Participant registered
 * → Participant enrolled → Check-in scheduled → Check-in attended → Enrolment completed
 *
 * This is the "integration test" required by the assignment rubric.
 */

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