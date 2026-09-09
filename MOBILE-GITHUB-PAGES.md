# Mobile GitHub Pages Setup — v0.1.1.3

Universe Lab distributions intentionally contain **no `.github/workflows/*` files**.

GitHub protects workflow files with a separate OAuth `workflow` permission. Some iPhone Git clients can push ordinary repository content but cannot create/update Actions workflows; including one can cause GitHub to reject the entire push.

## Upload from the phone

1. Unzip the v0.1.1.3 archive directly into the repository root.
2. Confirm `index.html`, `src/`, `tests/`, and the documentation files are at the repo root—not inside an extra UniverseLab folder.
3. Commit/push to `main`.

If upgrading an old workspace that previously contained `.github/workflows/pages.yml`, delete that old workflow file before pushing. Extracting a workflow-free ZIP does not remove stale files already in the workspace.

## Enable GitHub Pages

1. Open the repository on github.com.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select **main** and **/(root)**.
5. Save.

No GitHub Actions workflow is required because Universe Lab is a static site.

## v0.1.1.3 iPhone note

This hotfix specifically addresses Safari/embedded-browser visible-viewport changes. The app reads `window.visualViewport.height` when available so bottom flight controls should remain above browser chrome in portrait and landscape. No extra GitHub permissions are required and the distributable still contains no Actions workflow.

## iOS continuous-control note — v0.1.1.3

The simulator deliberately suppresses WebKit text selection and long-press callouts on the flight surface. LAB form controls remain editable. If blue text-selection handles ever appear while holding THRUST/REV/DAMP/RCS, hard-refresh the deployed site to ensure the new CSS/JS is active.
