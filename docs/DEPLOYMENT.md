# Deployment

This file no longer holds its own procedure, so that there is one source of truth.

- **Environments, protection, branching, required tests, the Production release procedure, rollback and release history:** [AGENTS.md](../AGENTS.md) §1–§7.
- **Approval policy** (what can be approved in advance and what always needs a separate approval): [shared standards §5](https://github.com/themandarinroom/vocabularylibrary/blob/main/docs/PROJECT_STANDARDS.md).
- **Build and hosting architecture:** [ARCHITECTURE.md](ARCHITECTURE.md).

**Superseded:** the October 2026 text described GitHub Pages staging from `codex/unified-website-v1` as the main path, and a not-yet-chosen Production host. It is kept in git history (`bf22df7`).
- Production has been Firebase Hosting (`the-mandarin-room`) from the `production` branch since November 2026.
- The GitHub Pages staging site still exists, auto-deploys from `codex/unified-website-v1`, and lags Production.

Policies from that plan that still apply:
- contact-form delivery stays disabled until a reviewed backend exists;
- analytics stays deferred pending a privacy review;
- DNS changes need separate approval.
