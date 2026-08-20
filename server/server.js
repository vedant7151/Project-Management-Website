import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js"
import workspaceRouter from './routes/workspaceRoutes.js';
import { protect } from './middlewares/authMiddleware.js';
import projectRouter from './routes/projectRoutes.js';
import tastRouter from './routes/taskRoutes.js';
import commentRouter from './routes/commentRoutes.js';

const app = express();

app.use(express.json())

// Inngest first. Never run Clerk on this path — Inngest signs with
// Authorization, which Clerk treats as a session and 401s.
app.use(
    "/api/inngest",
    (req, res, next) => {
        if (!["GET", "POST", "PUT"].includes(req.method)) {
            return res.status(405).json({ message: "Method not allowed" })
        }
        console.log(
            `[inngest] ${req.method} ${req.originalUrl} authorization=${Boolean(req.headers.authorization)}`
        )
        res.on("finish", () => {
            console.log(`[inngest] -> ${res.statusCode}`)
        })
        next()
    },
    serve({
        client: inngest,
        functions,
        signingKey: process.env.INNGEST_SIGNING_KEY,
    }),
    (req, res) => {
        if (!res.headersSent) {
            res.status(500).json({ message: "Inngest handler did not respond" })
        }
    }
)

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

app.get('/' , (req , res) => res.send('Server is live'))

const clerk = clerkMiddleware()
app.use("/api/workspaces", clerk, protect, workspaceRouter)
app.use("/api/projects", clerk, protect, projectRouter)
app.use("/api/tasks", clerk, protect, tastRouter)
app.use("/api/comments", clerk, protect, commentRouter)

const PORT = process.env.PORT || 5000

app.listen(PORT , ()=> {
    console.log(`Server Started on port ${PORT}`)
})
