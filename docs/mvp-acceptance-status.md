# MVP Acceptance Status

## Covered end-to-end

- Supabase auth session routes for sign-in, sign-up, and logout
- Candidate profile CRUD for profile, skills, certifications, experiences, bullets, projects, and project bullets
- Vacancy creation, parsing, and structured requirement storage
- Deterministic + semantic + rerank-based matching pipeline
- Resume draft generation from stored facts only
- Manual draft editing for summary, skill order, section visibility, and bullet inclusion
- ATS-safe HTML preview
- PDF export with job history and signed download links
- Resume history views on dashboard and `/resumes`
- Background embedding queue with worker route and optional Compose worker loop

## Covered by automated checks

- `bun run lint`
- `bun run format:check`
- `bun run typecheck`
- `bun run test:run`
- `bun run build`

## Known MVP compromises

- Embeddings currently use a deterministic local vectorizer instead of a dedicated external embedding provider.
- The rerank layer is advisory and falls back to deterministic+semantic ranking when Novita is unavailable.
- Docker and Compose changes were validated statically in the cloud environment because Docker CLI was unavailable there.

## Remaining polish opportunities

- Add explicit onboarding/registration UI polish beyond the current auth form
- Expand acceptance-focused route coverage to lower-risk list/detail routes if desired
- Add richer monitoring/metrics surfaces for embedding worker batches and export jobs
