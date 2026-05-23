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

        // ── Trials ───────────────────────────────────────────────────────────────
        const { rows: trialsData } = await client.query(`
            INSERT INTO trials (researcher_id, title, description, start_date, end_date, status) VALUES
                ($1, 'SVUH-ONCO-2024-01',
                    'Phase II trial evaluating efficacy of adjuvant immunotherapy in early-stage colorectal cancer patients post-resection.',
                    '2024-03-01', '2026-02-28', 'active'),
                ($2, 'SVUH-CARD-2024-02',
                    'Randomised controlled trial assessing novel anticoagulation therapy in non-valvular atrial fibrillation.',
                    '2024-06-15', '2026-06-14', 'recruiting'),
                ($3, 'SVUH-NEUR-2023-01',
                    'Longitudinal observational study of early biomarkers in Parkinson''s disease progression.',
                    '2023-09-01', '2027-08-31', 'active'),
                ($4, 'SVUH-RESP-2025-01',
                    'Pilot study of home-based pulmonary rehabilitation using digital monitoring in COPD patients.',
                    '2025-01-10', '2025-12-31', 'recruiting')
            RETURNING id
        `, [res1.id, res2.id, res3.id, res4.id])
        const [t1, t2, t3, t4] = trialsData

        // ── Trial Phases ─────────────────────────────────────────────────────────
        const { rows: phasesData } = await client.query(`
            INSERT INTO trial_phases (trial_id, phase_name, description, duration_weeks, order_number) VALUES
                ($1, 'Screening',      'Eligibility assessment and baseline bloods', 4,  1),
                ($1, 'Treatment',      'Immunotherapy administration cycle',          24, 2),
                ($1, 'Follow-up',      'Post-treatment monitoring and response eval', 24, 3),
                ($2, 'Screening',      'Eligibility and cardiac baseline workup',     6,  1),
                ($2, 'Dose Titration', 'Anticoagulant dose optimisation',            12, 2),
                ($2, 'Maintenance',    'Stable dose monitoring',                     30, 3),
                ($3, 'Baseline',       'Initial biomarker panel and MRI',            8,  1),
                ($3, 'Year 1 Follow',  '12-month reassessment',                      8,  2),
                ($4, 'Onboarding',     'Device setup and training',                  2,  1),
                ($4, 'Active Rehab',   '12-week home rehab programme',              12,  2)
            RETURNING id
        `, [t1.id, t2.id, t3.id, t4.id])
        const phases = phasesData

        // ── Participants ─────────────────────────────────────────────────────────
        const { rows: parts } = await client.query(`
            INSERT INTO participants
                (first_name, last_name, date_of_birth, pps_number, phone, email, address, consent_status, is_active)
            VALUES
                ('Patrick',   'Kelly',      '1968-04-12', '1234567T', '+353 87 111 2233', 'p.kelly@email.ie',    '14 Elm Park, Dublin 4', 'given',   true),
                ('Mary',      'Doyle',      '1975-11-03', '2345678A', '+353 86 222 3344', 'm.doyle@email.ie',    '7 Sandymount Ave, D4',  'given',   true),
                ('Seamus',    'Brennan',    '1960-07-22', '3456789B', '+353 83 333 4455', 's.brennan@email.ie',  '3 Merrion Rd, Dublin 4','given',   true),
                ('Niamh',     'O''Connor',  '1982-01-30', '4567890C', '+353 85 444 5566', 'n.oconnor@email.ie',  '21 Ailesbury Rd, D4',   'given',   true),
                ('Brendan',   'Farrell',    '1955-09-15', '5678901D', '+353 87 555 6677', 'b.farrell@email.ie',  '9 Shrewsbury Rd, D4',   'given',   true),
                ('Caoimhe',   'Nolan',      '1990-03-07', '6789012E', '+353 86 666 7788', 'c.nolan@email.ie',    '5 Ballsbridge Tce, D4', 'pending', true),
                ('Liam',      'McCarthy',   '1948-12-25', '7890123F', '+353 83 777 8899', 'l.mccarthy@email.ie', '18 Pembroke Rd, D4',    'given',   true),
                ('Sorcha',    'Gallagher',  '1971-06-18', '8901234G', '+353 85 888 9900', 's.gallagher@email.ie','33 Morehampton Rd, D4', 'given',   false)
            RETURNING id
        `)

        // ── Enrolments ───────────────────────────────────────────────────────────
        // Parameters:
        // $1: parts[0], $2: parts[1], $3: parts[2], $4: parts[3], $5: parts[4], $6: parts[6], $7: parts[7]
        // $8: t1, $9: t2, $10: t3, $11: t4
        // $12: phase0, $13: phase1, $14: phase3, $15: phase6, $16: phase8
        const { rows: enrolData } = await client.query(`
            INSERT INTO enrolments (participant_id, trial_id, phase_id, enrolment_date, status) VALUES
                ($1::int,  $8::int,  $12::int, '2024-03-15', 'enrolled'),
                ($2::int,  $8::int,  $12::int, '2024-03-22', 'enrolled'),
                ($3::int,  $8::int,  $13::int, '2024-04-01', 'completed'),
                ($4::int,  $9::int,  $14::int, '2024-07-01', 'enrolled'),
                ($5::int,  $9::int,  $14::int, '2024-07-10', 'enrolled'),
                ($6::int,  $10::int, $15::int, '2023-09-15', 'enrolled'),
                ($7::int,  $10::int, $15::int, '2023-09-20', 'withdrawn'),
                ($1::int,  $11::int, $16::int, '2025-01-20', 'enrolled')
            RETURNING id
        `, [
            parts[0].id, parts[1].id, parts[2].id, parts[3].id, parts[4].id, parts[6].id, parts[7].id,
            t1.id, t2.id, t3.id, t4.id,
            phases[0].id, phases[1].id, phases[3].id, phases[6].id, phases[8].id
        ])

        // ── Check-ins ────────────────────────────────────────────────────────────
        const today = new Date().toISOString().slice(0, 10)
        const future1 = new Date(Date.now() + 7  * 86400000).toISOString().slice(0, 10)
        const future2 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
        const past1   = new Date(Date.now() - 7  * 86400000).toISOString().slice(0, 10)
        const past2   = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)

