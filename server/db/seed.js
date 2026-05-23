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

