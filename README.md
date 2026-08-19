# Project Management

A full-stack workspace app for teams to organize projects, assign tasks, comment on work, and track progress. Authentication and organizations come from **Clerk**. Workspaces, projects, tasks, and comments live in **PostgreSQL** (Neon) via **Prisma**. Background jobs (user/org sync and task emails) run through **Inngest**.

The repo is split into two apps:

| Folder   | Stack                                      | Role                                      |
|----------|--------------------------------------------|-------------------------------------------|
| `client` | React 19, Vite, Tailwind CSS, Redux Toolkit, Clerk, Axios, Recharts | Dashboard UI                              |
| `server` | Express, Prisma, Neon, Clerk, Inngest, Nodemailer (Brevo)          | REST API, auth, jobs, email               |

---

## What it does

- **Sign in** with Clerk. If the user has no organization, they are prompted to create one (that org becomes a workspace).
- **Workspaces** map to Clerk organizations (admin / member). Members can be invited.
- **Projects** belong to a workspace: name, description, priority, status, dates, team lead, and members.
- **Tasks** belong to a project: type (task / bug / feature / …), status, priority, assignee, due date.
- **Comments** on tasks.
- **Dashboard** with stats, project overview, task summary, and recent activity.
- **Emails** when a task is assigned, plus a due-date reminder if it is still not done.
- Light / dark theme stored in Redux.

---

## Rough architecture

```
Browser (Vite / React)
  │  ClerkProvider  →  session JWT
  │  Redux (workspace + theme)
  │  Axios  →  VITE_BASE_URL
  ▼
Express API  (:5000)
  │  CORS  ←  CLIENT_URL
  │  clerkMiddleware + protect()  (Bearer token)
  │  /api/workspaces  /api/projects  /api/tasks  /api/comments
  │  /api/inngest     (Inngest serve handler)
  ├──────────────►  Neon PostgreSQL  (Prisma)
  │
  └──────────────►  Inngest
                      │  clerk/user.*  /  clerk/organization.*
                      │  clerk/organizationMembership.created
                      │  app/task.assigned
                      └──────────────►  Brevo SMTP (assignment + reminder mail)
```

**How data stays in sync**

1. User signs up or creates an org in Clerk.
2. Clerk webhooks (wired through Inngest) fire `user.created`, `organization.created`, membership events, etc.
3. Inngest functions upsert `User`, `Workspace`, and `WorkspaceMember` in Postgres.
4. The React app loads workspaces from `GET /api/workspaces` using the Clerk token.
5. Creating a task writes to the DB and emits `app/task.assigned`, which sends email and optionally sleeps until the due date.

**Main data model**

`User` → owns / joins `Workspace` → contains `Project` → contains `Task` → has `Comment`.  
Roles: workspace `ADMIN` / `MEMBER`. Task status: `TODO` / `IN_PROGRESS` / `DONE`.

---

## Environment variables

Copy the example files, then fill in secrets. Do not commit `.env`.

### Frontend (`client/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | **Yes** | Clerk publishable key (`pk_…`). App throws on startup if missing. |
| `VITE_BASE_URL` | Yes | Backend API origin including `/api`, e.g. `http://localhost:5000/api`. Falls back to that default if unset. |

Example (`client/.env.example`):

```env
VITE_BASE_URL=http://localhost:5000/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxx
```

### Backend (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | HTTP port. Default `5000`. |
| `CLIENT_URL` | **Yes** (CORS) | Frontend origin allowed by CORS, e.g. `http://localhost:5173`. |
| `DATABASE_URL` | **Yes** | Neon pooled connection string (Prisma runtime). |
| `DIRECT_URL` | Recommended | Neon **direct** (unpooled) URL for Prisma migrations. Falls back to `DATABASE_URL`. |
| `CLERK_SECRET_KEY` | **Yes** | Clerk secret (`sk_…`). Used by `@clerk/express` to verify sessions. |
| `CLERK_PUBLISHABLE_KEY` | Recommended | Same Clerk app as the client; some Clerk Express setups expect it. |
| `SMTP_USER` | For email | Brevo SMTP username. |
| `SMTP_PASS` | For email | Brevo SMTP password / SMTP key. |
| `SENDER_EMAIL` | For email | Verified sender address in Brevo. |
| `INNGEST_EVENT_KEY` | Production | Lets the API send events to Inngest Cloud. |
| `INNGEST_SIGNING_KEY` | Production | Verifies Inngest webhook requests to `/api/inngest`. |
| `NODE_ENV` | No | Set to `development` to reuse a global Prisma client. |

Example (`server/.env.example` plus secrets you need locally):

```env
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
CLERK_SECRET_KEY=sk_test_xxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxx
SMTP_USER=
SMTP_PASS=
SENDER_EMAIL=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

**Clerk dashboard:** enable Organizations, and send webhooks (user, organization, organization membership) to Inngest so local DB users/workspaces stay in sync.

**Inngest locally:** run the Inngest Dev Server and point it at `http://localhost:5000/api/inngest`.

---

## Run locally

Needs Node.js and a Neon (or other Postgres) database.

```bash
# backend
cd server
cp .env.example .env   # then add the variables above
npm install
npx prisma generate
npx prisma migrate dev
npm run server         # nodemon on PORT (default 5000)

# frontend (another terminal)
cd client
cp .env.example .env   # add VITE_CLERK_PUBLISHABLE_KEY
npm install
npm run dev            # Vite, usually http://localhost:5173
```

Deploy: both folders include `vercel.json` (SPA rewrite on the client, Node serverless on the server). Set the same env vars in the Vercel project(s). Point `VITE_BASE_URL` at the deployed API `/api` path and `CLIENT_URL` at the deployed frontend origin.

---

## API (all except `/` and `/api/inngest` require a Clerk Bearer token)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Health check |
| POST | `/api/inngest` | Inngest handler |
| GET | `/api/workspaces` | Workspaces for the signed-in user |
| POST | `/api/workspaces/add-member` | Add a workspace member |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects` | Update project |
| POST | `/api/projects/:projectId/addMember` | Add project member |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| POST | `/api/tasks/delete` | Delete task |
| POST | `/api/comments` | Add comment |
| GET | `/api/comments/:taskId` | List comments for a task |
