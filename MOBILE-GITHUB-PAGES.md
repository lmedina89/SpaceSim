# Mobile GitHub Pages Setup

## Why this package differs from v0.1.0

GitHub protects files inside `.github/workflows/`. Some iPhone Git clients use an OAuth token that can push normal repository files but does not have GitHub's separate `workflow` scope. GitHub then rejects the entire push when a workflow file is present.

This hotfix removes the workflow file only. The simulator itself is unchanged.

## Upload from the phone

1. If your Git client shows the workflow-scope error, choose **Cancel**, not Fork.
2. Use this v0.1.0.1 ZIP instead of the original v0.1.0 ZIP.
3. Unzip it directly into the repository root.
4. Commit/push to `main`.

## Enable GitHub Pages

1. Open the repository on github.com.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, set Source to **Deploy from a branch**.
4. Select branch **main** and folder **/(root)**.
5. Save.

No GitHub Actions workflow is required because Universe Lab is a static site.
