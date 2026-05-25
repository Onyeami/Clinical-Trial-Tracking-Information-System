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

// ── Participants ──────────────────────────────────────────────────────────────
describe('Participants CRUD', () => {
    let participantId

    test('POST /api/participants creates a participant', async () => {
        const res = await request(app).post('/api/participants').send({
            first_name:     'Test',
            last_name:      'Patient',
            date_of_birth:  '1980-06-15',
            pps_number:     '9999999T',
            email:          'test.patient@email.ie',
            consent_status: 'given',
        })
        expect(res.status).toBe(201)
        expect(res.body.first_name).toBe('Test')
        expect(res.body.is_active).toBe(true)
        participantId = res.body.id
    })

    test('POST /api/participants rejects missing required fields', async () => {
        const res = await request(app).post('/api/participants').send({ first_name: 'Only' })
        expect(res.status).toBe(400)
    })

    test('POST /api/participants rejects duplicate PPS number', async () => {
        const res = await request(app).post('/api/participants').send({
            first_name: 'Dupe', last_name: 'Patient', date_of_birth: '1990-01-01', pps_number: '9999999T'
        })
        expect(res.status).toBe(409)
    })

    test('GET /api/participants?search=test returns matching results', async () => {
        const res = await request(app).get('/api/participants?search=test')
        expect(res.status).toBe(200)
        expect(res.body.length).toBeGreaterThan(0)
        // PPS number should not be in list response
        expect(res.body[0]).not.toHaveProperty('pps_number')
    })

    test('GET /api/participants/:id includes pps_number', async () => {
        const res = await request(app).get(`/api/participants/${participantId}`)
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('pps_number')
    })

    test('PUT /api/participants/:id updates consent status', async () => {
        const res = await request(app).put(`/api/participants/${participantId}`).send({
            first_name: 'Test', last_name: 'Patient', date_of_birth: '1980-06-15',
            consent_status: 'withdrawn_consent', is_active: true
        })
        expect(res.status).toBe(200)
        expect(res.body.consent_status).toBe('withdrawn_consent')
    })

    test('DELETE /api/participants/:id soft-deletes (is_active = false)', async () => {
        const delRes = await request(app).delete(`/api/participants/${participantId}`)
        expect(delRes.status).toBe(204)

        const getRes = await request(app).get(`/api/participants/${participantId}`)
        expect(getRes.status).toBe(200)
        expect(getRes.body.is_active).toBe(false)
    })
})
