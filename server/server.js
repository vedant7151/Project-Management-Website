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

// 2. Request/Response logging (helps debug silent failures)
app.use((req, res, next) => {
    const start = Date.now();
    const hasAuthHeader = Boolean(req.headers.authorization);
    res.on("finish", () => {
        const ms = Date.now() - start;
        // console.log(
        //     `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms) authHeader=${hasAuthHeader}`
        // );
    });
    next();
});
app.get('/' , (req , res) => res.send('Server is live'))

// Inngest signs requests with Authorization. Clerk must not run on this
// path or it treats that header as a session token and returns 401.
const inngestHandler = serve({ client: inngest, functions })
app.get("/api/inngest", inngestHandler)
app.post("/api/inngest", inngestHandler)
app.put("/api/inngest", inngestHandler)

const clerk = clerkMiddleware()
app.use((req, res, next) => {
    if (req.path.startsWith('/api/inngest')) {
        return next()
    }
    return clerk(req, res, next)
})

//Routes
app.use("/api/workspaces" ,protect, workspaceRouter)
app.use("/api/projects" , protect , projectRouter)
app.use("/api/tasks" , protect , tastRouter)
app.use("/api/comments" , protect , commentRouter)

const PORT = process.env.PORT || 5000

app.listen(PORT , ()=> {
    console.log(`Server Started on port ${PORT}`)
})
