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

afterAll(async () => {
    await pool.end()
})

describe('Full clinical trial lifecycle (integration)', () => {
    let researcher, trial, phase, participant, enrolment, checkin

    // Step 1: Create a researcher
    test('1. Create researcher', async () => {
        const res = await request(app).post('/api/researchers').send({
            first_name: 'Siobhán',
            last_name:  'O\'Brien',
            email:      'integration.test@svuh.ie',
            department: 'Oncology',
        })
        expect(res.status).toBe(201)
        researcher = res.body
        expect(researcher.id).toBeDefined()
    })

    // Step 2: Create a trial assigned to that researcher
    test('2. Create trial linked to researcher', async () => {
        const res = await request(app).post('/api/trials').send({
            title:         'INTEG-TEST-2025',
            description:   'Integration test trial',
            researcher_id: researcher.id,
            start_date:    '2025-01-01',
            status:        'recruiting',
        })
        expect(res.status).toBe(201)
        trial = res.body
        expect(trial.researcher_id).toBe(researcher.id)
    })

    // Step 3: Add a phase to the trial
    test('3. Add a phase to the trial', async () => {
        const res = await request(app)
            .post(`/api/trials/${trial.id}/phases`)
            .send({ phase_name: 'Screening', duration_weeks: 4, order_number: 1 })
        expect(res.status).toBe(201)
        phase = res.body
        expect(phase.trial_id).toBe(trial.id)
    })

    // Step 4: Retrieve phases for the trial
    test('4. GET phases for trial returns the phase', async () => {
        const res = await request(app).get(`/api/trials/${trial.id}/phases`)
        expect(res.status).toBe(200)
        expect(res.body.length).toBe(1)
        expect(res.body[0].phase_name).toBe('Screening')
    })

    // Step 5: Register a participant with consent
    test('5. Register participant with consent given', async () => {
        const res = await request(app).post('/api/participants').send({
            first_name:     'Integration',
            last_name:      'Patient',
            date_of_birth:  '1975-03-20',
            pps_number:     'INT123456',
            email:          'integ.patient@email.ie',
            consent_status: 'given',
        })
        expect(res.status).toBe(201)
        participant = res.body
        expect(participant.consent_status).toBe('given')
        expect(participant.is_active).toBe(true)
    })

    // Step 6: Enrol participant into the trial phase
    test('6. Enrol participant into trial phase', async () => {
        const res = await request(app).post('/api/enrolments').send({
            participant_id: participant.id,
            trial_id:       trial.id,
            phase_id:       phase.id,
            enrolment_date: '2025-02-01',
            status:         'enrolled',
        })
        expect(res.status).toBe(201)
        enrolment = res.body
        expect(enrolment.participant_id).toBe(participant.id)
        expect(enrolment.trial_id).toBe(trial.id)
    })

    // Step 7: Duplicate enrolment is rejected
    test('7. Duplicate enrolment in same trial is rejected', async () => {
        const res = await request(app).post('/api/enrolments').send({
            participant_id: participant.id,
            trial_id:       trial.id,
            enrolment_date: '2025-02-01',
        })
        expect(res.status).toBe(409)
    })

    // Step 8: Schedule a check-in
    test('8. Schedule a check-in for the enrolment', async () => {
        const res = await request(app)
            .post(`/api/enrolments/${enrolment.id}/checkins`)
            .send({
                scheduled_date: '2025-02-15',
                checkin_type:   'in-person',
                outcome:        'scheduled',
            })
        expect(res.status).toBe(201)
        checkin = res.body
        expect(checkin.enrolment_id).toBe(enrolment.id)
        expect(checkin.outcome).toBe('scheduled')
    })

    // Step 9: Update check-in as attended
    test('9. Update check-in outcome to attended', async () => {
        const res = await request(app).put(`/api/checkins/${checkin.id}`).send({
            scheduled_date: '2025-02-15',
            actual_date:    '2025-02-15',
            checkin_type:   'in-person',
            outcome:        'attended',
            notes:          'Patient in good health. Bloods normal.',
        })
        expect(res.status).toBe(200)
        expect(res.body.outcome).toBe('attended')
        expect(res.body.actual_date).toContain('2025-02-15')
    })

    // Step 10: Retrieve all check-ins for the enrolment
    test('10. GET check-ins for enrolment returns the attended check-in', async () => {
        const res = await request(app).get(`/api/enrolments/${enrolment.id}/checkins`)
        expect(res.status).toBe(200)
        expect(res.body.length).toBe(1)
        expect(res.body[0].outcome).toBe('attended')
    })

    // Step 11: Mark enrolment as completed
    test('11. Update enrolment status to completed', async () => {
        const res = await request(app).put(`/api/enrolments/${enrolment.id}`).send({
            participant_id: participant.id,
            trial_id:       trial.id,
            phase_id:       phase.id,
            enrolment_date: '2025-02-01',
            status:         'completed',
        })
        expect(res.status).toBe(200)
        expect(res.body.status).toBe('completed')
    })

    // Step 12: Verify trial cannot be deleted with completed enrolment
    // (delete is blocked only for 'enrolled' status — completed ones allow delete)
    test('12. Trial can be deleted after no active enrolments', async () => {
        const res = await request(app).delete(`/api/trials/${trial.id}`)
        expect(res.status).toBe(204)
    })

    // Step 13: Health check endpoint responds
    test('13. Health check endpoint is reachable', async () => {
        const res = await request(app).get('/api/health')
        expect(res.status).toBe(200)
        expect(res.body.status).toBe('ok')
    })
})
