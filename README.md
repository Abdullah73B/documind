# DocuMind

Evidence-first document intelligence workspace.

## Current status
This repository contains the first responsive application shell. The dashboard currently uses sample data and local browser state; authentication, secure uploads, document parsing, indexing, evidence-grounded chat, and comparison are not yet connected.

## Stack
- Next.js 15 / React 19 / TypeScript
- Supabase Auth, PostgreSQL and private Storage (configured separately)
- Free/open-source processing components planned for later stages

## Run locally
1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and publishable key.
3. Run `npm install` then `npm run dev`.

Never commit secrets or private documents.