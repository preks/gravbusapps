#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from plan_parser import load_plan  # noqa: E402


SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def die(msg: str, code: int = 1) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    raise SystemExit(code)


def is_repo_relative_path(p: str) -> bool:
    if p.startswith("/") or p.startswith("\\"):
        return False
    if ".." in Path(p).parts:
        return False
    return True


def validate_plan(plan_path: Path, repo_root: Path, max_files_per_batch: int) -> None:
    plan = load_plan(plan_path)

    branch_base_slug = plan.get("branch_base_slug")
    if not isinstance(branch_base_slug, str) or not branch_base_slug.strip():
        die("branch_base_slug is required and must be a string.")
    branch_base_slug = branch_base_slug.strip()
    if not SLUG_RE.match(branch_base_slug):
        die(
            f"branch_base_slug '{branch_base_slug}' is invalid. Must match {SLUG_RE.pattern}."
        )

    destination_branch = plan.get("destination_branch")
    if not isinstance(destination_branch, str) or not destination_branch.strip():
        die("destination_branch is required and must be a string.")

    batches = plan.get("batches")
    if not isinstance(batches, list) or not batches:
        die("batches must be a non-empty list.")

    seen_batch_ids: set[int] = set()
    seen_files_global: set[str] = set()

    for idx, batch in enumerate(batches):
        if not isinstance(batch, dict):
            die(f"batches[{idx}] must be an object/dict.")

        batch_id = batch.get("id")
        if isinstance(batch_id, int):
            batch_id_int = batch_id
        elif isinstance(batch_id, str) and batch_id.isdigit():
            batch_id_int = int(batch_id)
        else:
            die(f"batches[{idx}].id must be an integer.")

        if batch_id_int <= 0:
            die(f"batches[{idx}].id must be >= 1.")
        if batch_id_int in seen_batch_ids:
            die(f"Duplicate batch id: {batch_id_int}")
        seen_batch_ids.add(batch_id_int)

        title = batch.get("title")
        if not isinstance(title, str) or not title.strip():
            die(f"batches[{idx}].title must be a non-empty string.")
        title = title.strip()
        if title != title.lower():
            die(f"batches[{idx}].title must be all lowercase (got: '{title}').")

        required_files = batch.get("required_files")
        optional_files = batch.get("optional_files", [])

        if not isinstance(required_files, list) or not required_files:
            die(f"batches[{idx}].required_files must be a non-empty list.")
        if not isinstance(optional_files, list):
            die(f"batches[{idx}].optional_files must be a list.")

        required_files = [str(p).strip() for p in required_files if str(p).strip()]
        optional_files = [str(p).strip() for p in optional_files if str(p).strip()]

        if len(required_files) > max_files_per_batch:
            die(
                f"Batch {batch_id_int} has {len(required_files)} required_files "
                f"(max {max_files_per_batch}). Split into more batches."
            )

        if len(set(required_files)) != len(required_files):
            die(f"Batch {batch_id_int} has duplicate entries in required_files.")
        if len(set(optional_files)) != len(optional_files):
            die(f"Batch {batch_id_int} has duplicate entries in optional_files.")

        overlap = set(required_files) & set(optional_files)
        if overlap:
            die(
                f"Batch {batch_id_int} has files listed in both required_files and optional_files: "
                f"{sorted(overlap)}"
            )

        for path_value in required_files + optional_files:
            if not is_repo_relative_path(path_value):
                die(f"Batch {batch_id_int} contains non-repo-relative path: {path_value}")
            fs_path = repo_root / path_value
            if not fs_path.exists():
                die(f"Batch {batch_id_int} references file that does not exist: {path_value}")
            if path_value in seen_files_global:
                die(
                    f"File '{path_value}' appears in more than one batch (or in multiple lists). "
                    "Each file must belong to exactly one batch."
                )
            seen_files_global.add(path_value)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate repo-root plan.md front matter schema for Claude batch execution."
    )
    parser.add_argument(
        "--repo-root",
        type=str,
        default=".",
        help="Repo root to resolve file paths (default: .)",
    )
    parser.add_argument(
        "--max-files-per-batch",
        type=int,
        default=30,
        help="Max required_files per batch (default: 30)",
    )
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    if not repo_root.exists():
        die(f"repo-root does not exist: {repo_root}", 2)

    plan_path = repo_root / "plan.md"
    if not plan_path.exists():
        die(f"{plan_path} not found", 2)

    validate_plan(plan_path, repo_root, args.max_files_per_batch)
    print("OK: plan.md is valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
