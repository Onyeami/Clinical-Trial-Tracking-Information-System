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

// ── Enrolments ────────────────────────────────────────────────────────────────
describe('Enrolments CRUD', () => {
    let participantId, trialId, enrolmentId

    beforeAll(async () => {
        const { rows: [res] } = await pool.query(
            `INSERT INTO researchers (first_name, last_name, email) VALUES ('E','Res','e.res@svuh.ie') RETURNING id`
        )
        const { rows: [trial] } = await pool.query(
            `INSERT INTO trials (title, start_date, status, researcher_id)
            VALUES ('ENROL-TEST', '2025-01-01', 'recruiting', $1) RETURNING id`, [res.id]
        )
        const { rows: [part] } = await pool.query(
            `INSERT INTO participants (first_name, last_name, date_of_birth, consent_status)
            VALUES ('Enrol','Part','1975-01-01','given') RETURNING id`
        )
        trialId = trial.id
        participantId = part.id
    })

    test('POST /api/enrolments creates enrolment', async () => {
        const res = await request(app).post('/api/enrolments').send({
            participant_id: participantId,
            trial_id:       trialId,
            enrolment_date: '2025-03-01',
            status:         'enrolled',
        })
        expect(res.status).toBe(201)
        expect(res.body.status).toBe('enrolled')
        enrolmentId = res.body.id
    })

    test('POST /api/enrolments rejects duplicate enrolment', async () => {
        const res = await request(app).post('/api/enrolments').send({
            participant_id: participantId,
            trial_id:       trialId,
            enrolment_date: '2025-03-01',
        })
        expect(res.status).toBe(409)
        expect(res.body.error).toMatch(/already enrolled/)
    })

    test('GET /api/enrolments?trial_id filters by trial', async () => {
        const res = await request(app).get(`/api/enrolments?trial_id=${trialId}`)
        expect(res.status).toBe(200)
        expect(res.body.every(e => e.trial_id === trialId)).toBe(true)
    })

    test('PUT /api/enrolments/:id updates status', async () => {
        const res = await request(app).put(`/api/enrolments/${enrolmentId}`).send({
            participant_id: participantId,
            trial_id:       trialId,
            enrolment_date: '2025-03-01',
            status:         'completed',
        })
        expect(res.status).toBe(200)
        expect(res.body.status).toBe('completed')
    })

    test('DELETE /api/enrolments/:id removes enrolment', async () => {
        const res = await request(app).delete(`/api/enrolments/${enrolmentId}`)
        expect(res.status).toBe(204)
    })
})
