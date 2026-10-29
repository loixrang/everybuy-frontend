# Frontend CI and Deployment

## Pipeline

`.github/workflows/ci-cd.yml` runs on pull requests and pushes to `main` or
`master`. It installs the exact Bun version, uses the lockfile, and runs:

1. `bun run typecheck`
2. `bun run lint`
3. `bun test`
4. `bun run build`

The default branch also uploads the built `dist/` directory as a one-day GitHub
Actions artifact. The Pages job is gated until production configuration exists;
it downloads the verified artifact and deploys that exact build.

## Enable GitHub Pages deployment

1. In repository settings, enable GitHub Pages and choose **GitHub Actions** as
   the publishing source.
2. Add repository variables (not secrets):
   - `VITE_API_BASE_URL`: the production API origin, for example
     `https://api.example.com`.
   - `VITE_BASE_PATH`: `/<repository-name>/` for the default project Pages URL,
     or `/` when using a custom domain.
3. Configure the backend's trusted frontend origin (`FRONTEND_URL`) and CORS
   credentials for the deployed origin.
4. Check that Better Auth's production cookie settings allow the browser to
   send the session cookie to the configured API from the chosen frontend
   hostname. Prefer a same-site custom domain for the app and API.
5. Push to the default branch or dispatch the workflow from that branch.

The Pages job is skipped if either required variable is missing. This prevents
publishing a production build that still targets the local API or has incorrect
asset paths. The workflow creates `404.html` from `index.html` so direct SPA
route loads continue to work on Pages.

## Search indexing

Everybuy is an internal authenticated application. `index.html` sets `noindex`
and `public/robots.txt` lets crawlers read that directive. There is no sitemap;
private inventory routes should not be submitted to search engines. If the
product needs public search visibility later, add a public landing page with
its own indexing policy and canonical URL.

## Deployment limitations

- GitHub Actions workflows cannot be executed inside the local build; the first
  run on GitHub is required to validate runner permissions and the Pages
  environment.
- No production API URL or frontend domain is configured in this repository,
  so the Pages deployment job remains skipped until repository variables and
  backend origin settings are supplied.
