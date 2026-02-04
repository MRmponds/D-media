# D-Media Lead Generation System - Deployment Guide

## Prerequisites

- A Supabase account (free tier works)
- n8n instance (already running at your EasyPanel host)
- OpenAI API key
- Node.js 18+ (for local development)
- A hosting platform for the frontend (Vercel recommended for free tier)

---

## Step 1: Set Up Supabase Database

### 1.1 Create a new Supabase project
1. Go to https://supabase.com and create a new project
2. Choose a region close to you
3. Save the database password

### 1.2 Run the schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Open `database/schema.sql` from this project
3. Paste the entire contents and click **Run**
4. Verify tables were created: go to **Table Editor** and confirm you see:
   - `leads`, `keywords`, `platforms`, `settings`, `scan_logs`, `lead_status_history`, `outreach_templates`

### 1.3 Collect your credentials
From **Settings > API** in Supabase, note down:
- `Project URL` (e.g., `https://xxxxx.supabase.co`)
- `anon public` key
- `service_role` key (keep secret)

From **Settings > Database**, note:
- `Connection string` (for n8n Postgres nodes)

---

## Step 2: Configure n8n Workflows

### 2.1 Set up Postgres credentials in n8n
1. In n8n, go to **Credentials > Add Credential > Postgres**
2. Enter your Supabase connection details:
   - **Host**: `db.xxxxx.supabase.co`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: your database password
   - **Port**: `5432`
   - **SSL**: Enable (required for Supabase)
3. Name it `Supabase Postgres`

### 2.2 Set up OpenAI credentials in n8n
1. Go to **Credentials > Add Credential > OpenAI API**
2. Enter your OpenAI API key
3. Name it `OpenAI API`

### 2.3 Update workflow credentials
For each of these workflows, open it in n8n and update the credential references:

| Workflow | Nodes to Update |
|----------|----------------|
| D-Media: Reddit Lead Scanner | `Store Lead in DB` (Postgres), `AI Lead Qualification` (OpenAI) |
| D-Media: Job Board & Web Scanner | `Store Lead in DB` (Postgres), `AI Qualify Lead` (OpenAI) |
| D-Media: Lead Re-Qualifier | `Get Unscored Leads` (Postgres), `Update Lead Score` (Postgres), `AI Requalify` (OpenAI) |
| D-Media: Error Handler | `Log Error to DB` (Postgres) |

### 2.4 Configure error workflow
1. Open each scanner workflow's **Settings**
2. Under **Error Workflow**, select `D-Media: Error Handler`

### 2.5 Activate workflows
After credentials are set:
1. Test each workflow manually first (click **Execute Workflow**)
2. Check the execution results for errors
3. Once verified, toggle each workflow to **Active**

---

## Step 3: Deploy the Frontend

### Option A: Vercel (Recommended - Free)

1. Push the `frontend/` directory to a GitHub repository

2. Go to https://vercel.com and import the repository

3. Set the **Root Directory** to `frontend`

4. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   N8N_WEBHOOK_SECRET=generate-a-random-string
   ```

5. Deploy

### Option B: Self-hosted with Docker

1. Copy `frontend/.env.local.example` to `frontend/.env.local`
2. Fill in all values
3. From the project root:
   ```bash
   cd deploy
   docker-compose up -d
   ```

### Option C: Local Development

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your credentials
npm run dev
```

Open http://localhost:3000

---

## Step 4: Create Your User Account

1. Go to your deployed frontend URL
2. Click **Sign up**
3. Enter your email and password
4. You'll be redirected to the dashboard

Alternatively, create a user in Supabase:
1. Go to **Authentication > Users** in Supabase dashboard
2. Click **Add User**
3. Enter email and password

---

## Step 5: Configure the System

### 5.1 Review keywords
1. Go to **Settings > Keywords** in the dashboard
2. The system comes pre-loaded with 30+ keywords
3. Add/remove/toggle keywords based on your needs
4. Adjust weights (0.10 - 3.00) to prioritize certain signals

### 5.2 Configure platforms
1. Go to **Settings > Platforms**
2. Enable/disable platforms as needed
3. LinkedIn and Twitter are disabled by default (require API access)

### 5.3 Adjust general settings
1. Go to **Settings > General**
2. Key settings to review:
   - **Lead Score Threshold**: Minimum score to show leads (default: 40)
   - **Daily Scan Time**: When scans run (default: 06:00 UTC)
   - **AI Model**: Model for qualification (default: gpt-4o-mini)
   - **Outreach Score Threshold**: Auto-generate outreach above this (default: 60)

---

## Step 6: Verify Everything Works

### Test the Reddit scanner
1. Open `D-Media: Reddit Lead Scanner` in n8n
2. Click **Execute Workflow**
3. Watch the execution - you should see posts being fetched and scored
4. Check your dashboard for new leads

### Test the job board scanner
1. Open `D-Media: Job Board & Web Scanner` in n8n
2. Click **Execute Workflow**
3. Verify leads appear in the database

### Check the dashboard
1. Open the frontend
2. You should see stat cards, charts, and recent leads
3. Try filtering, searching, and changing lead statuses

---

## Maintenance

### Daily
- Check the dashboard for new high-score leads
- Contact promising leads using the suggested outreach messages
- Update lead statuses (New -> Contacted -> Responded -> etc.)

### Weekly
- Review keyword performance in Settings (check match counts)
- Add new keywords based on patterns you notice
- Archive old/irrelevant leads

### Monthly
- Review platform effectiveness (which platforms generate best leads?)
- Adjust AI model settings if scoring seems off
- Check scan logs for recurring errors
- Update scan sources if job board URLs change

---

## Troubleshooting

### No leads appearing
1. Check n8n workflow executions for errors
2. Verify Postgres credentials are correct
3. Check if the lead score threshold is too high
4. Run a workflow manually and inspect each node's output

### AI scoring not working
1. Verify OpenAI API key is valid and has credits
2. Check the AI node's output in workflow execution
3. Ensure the prompt is getting the correct input data

### Frontend not connecting to database
1. Verify Supabase URL and keys in environment variables
2. Check that RLS policies are created (run the schema SQL)
3. Test the connection in Supabase dashboard

### Reddit API returning 429 (rate limited)
1. Reduce the number of subreddits or queries in the Code node
2. Add longer delays between requests
3. Consider using Reddit API credentials for higher limits

---

## Cost Optimization

| Action | Savings |
|--------|---------|
| Use `gpt-4o-mini` instead of `gpt-4o` | ~10x cheaper |
| Set max_leads_per_scan to 50 | Reduces API calls |
| Increase score threshold to 50 | Fewer AI calls for low-quality leads |
| Run scans every 2 days instead of daily | 50% reduction |
| Disable low-performing platforms | Fewer HTTP requests |

---

## Extending the System

### Add a new platform
1. Add a new entry to the `platforms` table
2. Create a new n8n workflow following the pattern:
   `Schedule -> Fetch -> Parse -> Keyword Match -> AI Score -> Store`
3. Configure the error workflow

### Add email notifications
1. Add an SMTP credential in n8n
2. Add a Send Email node after the Store node in each scanner
3. Filter to only send for high-score leads (score >= 80)

### Add Slack notifications
1. Add a Slack credential in n8n
2. Add a Slack node after the Store node
3. Post new high-score leads to a dedicated channel
