# Code Review Agent Demo

This is a TypeScript, React, and Next.js showcase for
[infiniumtek/code-review-agent](https://github.com/infiniumtek/code-review-agent).
It includes a demo website, a root `review.toml`, and a ready-to-adapt GitHub
Actions workflow.

## Run the demo website

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Useful checks:

```bash
npm run typecheck
npm run build
```

## Set up code-review-agent as a GitHub workflow

1. Fork or clone the agent repository.

   ```bash
   git clone https://github.com/infiniumtek/code-review-agent.git
   cd code-review-agent
   ```

2. Build and publish the worker image.

   ```bash
   docker login ghcr.io -u YOUR_GITHUB_USERNAME
   docker build -t ghcr.io/YOUR_GITHUB_ORG/code-review-agent:latest .
   docker push ghcr.io/YOUR_GITHUB_ORG/code-review-agent:latest
   ```

   Make the GHCR package readable by the repositories that will use it. If you
   publish it privately, the workflow may also need package read access.

3. Add an LLM API key to the repository being reviewed.

   In GitHub, go to `Settings` -> `Secrets and variables` -> `Actions` -> `New
   repository secret`.

   Use one of these names:

   - `OPENAI_API_KEY` with `provider: openai`
   - `ANTHROPIC_API_KEY` with `provider: anthropic`
   - `GOOGLE_API_KEY` with `provider: google`

4. Add `review.toml` to the repository root.

   This demo already includes one. The important defaults are:

   - CI and infra skills are enabled for Docker, GitHub Actions, GitLab CI, and Jenkins.
   - generated files, lockfiles, `node_modules`, `dist`, `build`, and `.next` are ignored.
   - `fail_on = "high"` fails the job on high or critical findings.

5. Add the workflow file.

   This demo includes `.github/workflows/code-review-agent.yml`. Replace
   `ghcr.io/YOUR_GITHUB_ORG/code-review-agent:latest` with the image you
   published in step 2.

   The core workflow is:

   ```yaml
   name: Code Review Agent

   on:
     pull_request:
       types: [opened, synchronize, reopened, ready_for_review]

   permissions:
     contents: read
     pull-requests: write

   jobs:
     review:
       if: github.event.pull_request.draft == false
       runs-on: ubuntu-latest
       timeout-minutes: 20
       steps:
         - uses: actions/checkout@v4
           with:
             fetch-depth: 0

         - uses: infiniumtek/code-review-agent/examples/github-action@main
           with:
             image: ghcr.io/YOUR_GITHUB_ORG/code-review-agent:latest
             provider: openai
             llm-api-key: ${{ secrets.OPENAI_API_KEY }}
             reporter: auto
             fail-on: high
   ```

   For production, pin the action to a release tag or commit SHA instead of
   `@main`.

6. Open a pull request.

   Push a branch that changes TypeScript, JavaScript, Dockerfile, or workflow
   files. The workflow checks out full history, runs the worker container against
   `BASE...HEAD`, and passes the GitHub token to the reporter.

## Create PR comments from the agent

The agent creates PR comments through its `github` reporter. In GitHub Actions,
`reporter: auto` resolves to `github` plus `terminal`, so the workflow above is
enough.

To make PR comments work, keep these pieces in place:

- `permissions: pull-requests: write`
- `actions/checkout` with `fetch-depth: 0`
- `llm-api-key` wired to the selected provider secret
- a reachable worker image in the `image` input
- `reporter: auto` or `reporter: github,terminal`

The GitHub reporter does not create a fresh comment on every run. It looks for
its hidden marker, `<!-- code-review-agent -->`, and updates that same PR comment
in place. Re-running the workflow after new commits refreshes the existing
comment.

If no PR comment appears, check the Actions log first:

- external fork PRs may not receive repository secrets
- external fork PRs may receive a read-only `GITHUB_TOKEN`
- the GHCR image may be private or inaccessible
- missing `fetch-depth: 0` can prevent the base SHA from being available
- `fail-on` can fail the job when high or critical findings are found

Set `fail-on: off` for advisory-only reviews that should comment without
blocking merges.
