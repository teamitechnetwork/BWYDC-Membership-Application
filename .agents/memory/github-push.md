---
name: GitHub push authentication
description: Environment behavior when publishing this project to the connected GitHub repository
---

The GitHub App connection can appear authorized or healthy while HTTPS git fetch/push still fails with an invalid username/token error. A public repository may be readable but still requires valid write authentication.

**Why:** Repeated pushes and pulls failed at remote authentication even after reconnecting the GitHub App and correcting the repository URL; the failure was not caused by application code or branch contents.

**How to apply:** Before promising a GitHub publish, confirm that an authenticated remote operation succeeds. Do not treat a branch-exists message or a connected integration card as proof that a commit was pushed.