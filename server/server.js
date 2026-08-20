import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js"
import workspaceRouter from './routes/workspaceRoutes.js';
import { protect } from './middlewares/authMiddleware.js';
import projectRouter from './routes/projectRoutes.js';
import tastRouter from './routes/taskRoutes.js';
import commentRouter from './routes/commentRoutes.js';
import { clerkMiddleware } from '@clerk/express'

const app = express();

const allowedOrigins = [
    process.env.CLIENT_URL,
    'https://project-management-website-chi.vercel.app',
    ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173']),
].filter(Boolean)

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true)
        }
        return callback(new Error(`CORS blocked origin: ${origin}`))
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}))

// Raw bytes for /api/inngest (signature check). JSON for every other route.
app.use((req, res, next) => {
    if (req.path === '/api/inngest' || req.path.startsWith('/api/inngest/')) {
        return express.raw({ type: 'application/json' })(req, res, (err) => {
            if (err) return next(err)
            if (Buffer.isBuffer(req.body)) {
                req.rawBody = req.body
                const asString = req.body.toString('utf8')
                req.body = asString ? JSON.parse(asString) : {}
            }
            next()
        })
    }
    return express.json()(req, res, next)
})

app.use((req, res, next) => {
    if (req.path === '/api/inngest' || req.path.startsWith('/api/inngest/')) {
        const sig =
            req.headers['inngest-signature'] ||
            req.headers['x-inngest-signature'] ||
            req.headers.authorization
        console.log('Incoming Inngest webhook. signature header present?', Boolean(sig))
    }
    next()
})

const inngestHandler = serve({
    client: inngest,
    functions,
    signingKey: process.env.INNGEST_SIGNING_KEY,
})

app.use("/api/inngest", (req, res, next) => {
    if (!["GET", "POST", "PUT"].includes(req.method)) {
        return res.status(405).json({ message: "Method not allowed" })
    }
    return inngestHandler(req, res, next)
})

app.use(clerkMiddleware())

app.get('/' , (req , res) => res.send('Server is live'))

app.use("/api/workspaces" , protect, workspaceRouter)
app.use("/api/projects" , protect , projectRouter)
app.use("/api/tasks" , protect , tastRouter)
app.use("/api/comments" , protect , commentRouter)

const PORT = process.env.PORT || 5000

app.listen(PORT , ()=> {
    console.log(`Server Started on port ${PORT}`)
})
