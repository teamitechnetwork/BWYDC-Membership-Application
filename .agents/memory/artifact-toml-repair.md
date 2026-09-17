---
name: Malformed artifact TOML recovery
description: How to recover an existing artifact metadata file when conflict markers make the validator reject the current TOML.
---

When an existing `.replit-artifact/artifact.toml` contains unresolved conflict markers, the artifact replacement validator may reject the current file before it can apply a clean sibling temp file. Repair the malformed file to valid TOML first, then run the validated replacement flow and remove any temporary edit file.

**Why:** The validator expects the current artifact metadata to parse before replacement, so it cannot bootstrap a replacement from an invalid source document.

**How to apply:** Prefer the validated sibling-temp flow for normal metadata changes; use this recovery path only when the existing artifact TOML is already syntactically invalid.