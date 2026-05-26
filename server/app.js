require('dotenv').config()
const express  = require('express')
const cors     = require('cors')

const researchersRouter             = require('./routes/researchers')
const trialsRouter                  = require('./routes/trials')
const { router: phasesRouter, getById: getPhase, updatePhase, deletePhase } = require('./routes/phases')
const participantsRouter            = require('./routes/participants')
const enrolmentsRouter              = require('./routes/enrolments')
const { router: checkinsRouter, getById: getCheckin, updateCheckin, deleteCheckin } = require('./routes/checkins')
const authRouter                      = require('./routes/auth')
const { authenticate }                = require('./middleware/auth')
const { errorHandler, notFound }    = require('./middleware/errorHandler')

const app = express()

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())