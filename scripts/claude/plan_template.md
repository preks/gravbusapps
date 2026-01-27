---
# REQUIRED: repo-relative, lowercase, hyphen-separated slug.
# Must match: ^[a-z0-9]+(-[a-z0-9]+)*$
branch_base_slug: <replace-me>

# REQUIRED: where PRs target (e.g. main, master, develop)
destination_branch: develop

# REQUIRED: one PR per batch. Each batch must have <= 30 required_files.
# Batch titles must be lowercase (used for commit message).
batches:
  - id: 1
    title: <lowercase title for this batch>
    required_files:
      # REQUIRED: repo-relative paths, must exist, must be changed in this batch.
      - src/path/to/file.tsx
    optional_files:
      # OPTIONAL: may be empty; files allowed to change but not required.
      - package.json

  # - id: 2
  #   title: <lowercase title>
  #   required_files: [...]
  #   optional_files: []
---

# Plan

## Goal
<what we are building / changing>

## Scope rules
- One PR per batch.
- Each batch must have at most 30 required_files.
- A file must appear in at most one batch.
- required_files must be the minimal set of files that truly must change for that batch to be done.
- optional_files are allowed to change, but not required.

## Batch summaries
### Batch 1: <title>
- Intent: <1-2 sentences>
- Expected changes: <bullets>
- Verification: <commands / checks, if any>

### Batch 2: <title>
...

## Notes / risks
<short bullets>
