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
// 1. Updated CORS Configuration (Step 4)
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
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
app.use(clerkMiddleware())

app.get('/' , (req , res) => res.send('Server is live'))
app.use("/api/inngest", serve({ client: inngest, functions }));

//Routes
app.use("/api/workspaces" ,protect, workspaceRouter)
app.use("/api/projects" , protect , projectRouter)
app.use("/api/tasks" , protect , tastRouter)
app.use("/api/comments" , protect , commentRouter)

const PORT = process.env.PORT || 5000

app.listen(PORT , ()=> {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173"
    console.log(`Server Started on port ${PORT}`)
    
})
