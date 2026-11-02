# Habit Circle – PRD
## Original problem
Simple community habit tracker for friends/colleagues: sign up/in (email+password, no confirmation), My habits (private/shared), habit page with Last 7 days ticks, Days done + Current streak, Community page of shared habits, comments. Keep simple, no extra functions.
## Architecture
FastAPI + MongoDB (users, habits with completions[] date strings, comments), JWT (Bearer in localStorage + httpOnly cookie, 30 days). React + shadcn, routes /signup /signin /habits /habits/:id /community.
## Implemented (2026-06)
- Auth, top nav + sidebar, add habit, Shared/Private tags, 7-day ticks (owner only), stats, community feed, comments with author names, private habits hidden from others. All tested (iteration_1: 100%).
## Backlog
- P2: none requested (no delete / share toggle per user instruction)
