# Family Legacy Tree

A beautiful, reactive family tree application built with Next.js 14, Tailwind CSS, React Flow, and Supabase.

## Features

- **Interactive Tree View**: Visualize your family connections with an auto-layout graph.
- **Timeline View**: See your family history chronologically.
- **Profile Pictures**: Upload and display photos for every family member.
- **Rich Details**: Add biographies, dates, and gender information.
- **Easy Editing**: Drag-and-drop to connect people, or use the intuitive forms.

## Deployment Guide

### 1. Prerequisites

- A [GitHub](https://github.com) account.
- A [Vercel](https://vercel.com) account.
- A [Supabase](https://supabase.com) account.

### 2. Supabase Setup

1.  Create a new project on Supabase.
2.  Go to the **SQL Editor** in your Supabase dashboard.
3.  Copy the contents of `supabase_setup.sql` from this repository and run it. This creates the necessary tables and storage buckets.
4.  Go to **Project Settings > API** and copy your:
    -   `Project URL`
    -   `anon` public key

### 3. Vercel Deployment

1.  Push this code to a GitHub repository.
2.  Log in to Vercel and click **"Add New..." > "Project"**.
3.  Import your GitHub repository.
4.  In the **Configure Project** screen:
    -   **Framework Preset**: Next.js
    -   **Root Directory**: `web` (if you uploaded the entire folder structure) or leave as is if you uploaded just the contents of the web folder.
    -   **Environment Variables**: Add the following:
        -   `NEXT_PUBLIC_SUPABASE_URL`: (Paste your Supabase Project URL)
        -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Paste your Supabase Anon Key)
5.  Click **Deploy**.

### 4. Done!

Your family tree is now live! You can share the URL with your family.
