# Deploying the Walletrix Frontend on Vercel

This guide covers deploying the Next.js frontend (`frontend/`) to Vercel. The backend (`backend/`) is deployed separately (see `railway.json`).

## Prerequisites

- A Vercel account connected to the GitHub repository
- A deployed backend API URL
- Clerk publishable and secret keys

## Steps

1. In Vercel, choose **Add New → Project** and import the repository.
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Next.js** (auto-detected).
4. Add the environment variables below.
5. Click **Deploy**.

## Environment Variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of the deployed backend API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |

Refer to `.env.example` at the repo root for the full list.

## Branches

- `main` — production deployments
- `dev` — preview deployments

## Notes

- This document is informational only and does not affect the build.