# Zoo Bumpers (Zoo Paloola Remake)

A modern web remake of the classic game Zoo Paloola, built with React, TypeScript, and Vite.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend/Multiplayer**: Supabase (Realtime, Database, Auth)
- **Physics**: Custom 2D physics engine

## Local Development

1.  **Install dependencies**:

    ```bash
    npm install
    ```

2.  **Environment Setup**:
    Create a `.env` file in the root directory with your Supabase credentials:

    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

3.  **Run locally**:
    ```bash
    npm run dev
    ```

## Deployment to Vercel

This project is optimized for deployment on [Vercel](https://vercel.com).

1.  **Push to GitHub**: Ensure your project is pushed to a GitHub repository.
2.  **Import Project**: Go to Vercel dashboard, click "Add New...", select "Project", and import your GitHub repository.
3.  **Configure Project**:
    - **Framework Preset**: Vite
    - **Root Directory**: `./` (default)
    - **Build Command**: `npm run build` (default)
    - **Output Directory**: `dist` (default)
4.  **Environment Variables**:
    - Go to the **Environment Variables** section.
    - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with your production Supabase values.
5.  **Deploy**: Click "Deploy".

## Supabase Data Management

The game uses a `games` table in Supabase to store multiplayer sessions.

### Does data get purged automatically?

**No.** By default, rows in the `games` table persist indefinitely. Supabase does not automatically delete old game sessions.

### How to handle cleanup?

If you want to remove old or finished games to save space, you have a few options:

1.  **Manual Cleanup (SQL Editor)**:
    Run this SQL command periodically in your Supabase SQL Editor:

    ```sql
    -- Delete finished games older than 1 day
    DELETE FROM games
    WHERE status = 'finished'
    AND created_at < NOW() - INTERVAL '1 day';

    -- Delete abandoned waiting games older than 1 hour
    DELETE FROM games
    WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '1 hour';
    ```

2.  **Automated Cleanup (pg_cron)**:
    If you are on a Supabase Pro plan, you can enable the `pg_cron` extension to run the above SQL automatically on a schedule.

3.  **Edge Functions**:
    You can write a Supabase Edge Function that runs on a schedule (using cron triggers) to perform the cleanup.
