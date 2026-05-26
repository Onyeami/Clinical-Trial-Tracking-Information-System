const request = require('supertest')
const app     = require('../app')
const { pool } = require('../db/database')
const { createSchema } = require('../db/schema')

beforeAll(async () => {
    await createSchema()
    // Clean slate for tests
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

// ── Researchers ──────────────────────────────────────────────────────────────
describe('Researchers CRUD', () => {
    let createdId

    test('GET /api/researchers returns empty array initially', async () => {
        const res = await request(app).get('/api/researchers')
        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
    })

    test('POST /api/researchers creates a researcher', async () => {
        const res = await request(app).post('/api/researchers').send({
            first_name: 'Test',
            last_name:  'Doctor',
            email:      'test.doctor@svuh.ie',
            department: 'Oncology',
        })
        expect(res.status).toBe(201)
        expect(res.body.email).toBe('test.doctor@svuh.ie')
        expect(res.body.first_name).toBe('Test')
        createdId = res.body.id
    })

    test('POST /api/researchers rejects missing fields', async () => {
        const res = await request(app).post('/api/researchers').send({ first_name: 'No' })
        expect(res.status).toBe(400)
        expect(res.body.error).toMatch(/required/)
    })

    test('POST /api/researchers rejects duplicate email', async () => {
        const res = await request(app).post('/api/researchers').send({
            first_name: 'Dupe', last_name: 'Doc', email: 'test.doctor@svuh.ie'
        })
        expect(res.status).toBe(409)
    })

    test('GET /api/researchers/:id returns the researcher', async () => {
        const res = await request(app).get(`/api/researchers/${createdId}`)
        expect(res.status).toBe(200)
        expect(res.body.id).toBe(createdId)
    })

    test('GET /api/researchers/:id returns 404 for unknown id', async () => {
        const res = await request(app).get('/api/researchers/99999')
        expect(res.status).toBe(404)
    })

    test('PUT /api/researchers/:id updates the researcher', async () => {
        const res = await request(app).put(`/api/researchers/${createdId}`).send({
            first_name: 'Updated', last_name: 'Doctor', email: 'test.doctor@svuh.ie', department: 'Cardiology'
        })
        expect(res.status).toBe(200)
        expect(res.body.first_name).toBe('Updated')
        expect(res.body.department).toBe('Cardiology')
    })

    test('DELETE /api/researchers/:id removes the researcher', async () => {
        const res = await request(app).delete(`/api/researchers/${createdId}`)
        expect(res.status).toBe(204)
    })

    test('GET after delete returns 404', async () => {
        const res = await request(app).get(`/api/researchers/${createdId}`)
        expect(res.status).toBe(404)
    })
})

// ── Trials ───────────────────────────────────────────────────────────────────
describe('Trials CRUD', () => {
    let researcherId, trialId

    beforeAll(async () => {
        const { rows } = await pool.query(
            `INSERT INTO researchers (first_name, last_name, email, department)
            VALUES ('Trial','Researcher','trial.res@svuh.ie','Oncology') RETURNING id`
        )
        researcherId = rows[0].id
    })

    test('POST /api/trials creates a trial', async () => {
        const res = await request(app).post('/api/trials').send({
            title:         'TEST-TRIAL-001',
            description:   'A test trial',
            researcher_id: researcherId,
            start_date:    '2025-01-01',
            status:        'recruiting',
        })
        expect(res.status).toBe(201)
        expect(res.body.title).toBe('TEST-TRIAL-001')
        trialId = res.body.id
    })

    test('POST /api/trials rejects invalid status', async () => {
        const res = await request(app).post('/api/trials').send({
            title: 'Bad', start_date: '2025-01-01', status: 'invalid'
        })
        expect(res.status).toBe(400)
    })

    test('GET /api/trials returns list', async () => {
        const res = await request(app).get('/api/trials')
        expect(res.status).toBe(200)
        expect(res.body.length).toBeGreaterThan(0)
    })

    test('GET /api/trials?status=recruiting filters correctly', async () => {
        const res = await request(app).get('/api/trials?status=recruiting')
        expect(res.status).toBe(200)
        expect(res.body.every(t => t.status === 'recruiting')).toBe(true)
    })

    test('PUT /api/trials/:id updates status', async () => {
        const res = await request(app).put(`/api/trials/${trialId}`).send({
            title: 'TEST-TRIAL-001', start_date: '2025-01-01', status: 'active'
        })
        expect(res.status).toBe(200)
        expect(res.body.status).toBe('active')
    })

    test('DELETE /api/trials/:id with no active enrolments succeeds', async () => {
        const res = await request(app).delete(`/api/trials/${trialId}`)
        expect(res.status).toBe(204)
    })
})
