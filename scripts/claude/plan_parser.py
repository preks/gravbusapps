#!/usr/bin/env python3
import json
import re
import shlex
import sys
from pathlib import Path


FRONT_MATTER_DELIM = "---"
BRANCH_BASE_SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def read_front_matter(text: str) -> str:
    lines = text.splitlines()
    if not lines or lines[0].strip() != FRONT_MATTER_DELIM:
        return ""
    for i in range(1, len(lines)):
        if lines[i].strip() == FRONT_MATTER_DELIM:
            return "\n".join(lines[1:i])
    return ""


def normalize_scalar(value: str):
    value = value.strip()
    if not value:
        return ""
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        value = value[1:-1].strip()
    if value.isdigit():
        return int(value)
    return value


def normalize_path(value: str) -> str:
    value = value.strip()
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        value = value[1:-1].strip()
    return value


def split_key_value(line: str):
    if ":" not in line:
        raise ValueError(f"Expected key:value but got: {line!r}")
    key, value = line.split(":", 1)
    return key.strip(), value.strip()


def parse_front_matter(front_matter: str) -> dict:
    data: dict = {"batches": []}
    in_batches = False
    current_batch = None
    current_list_key = None

    for raw_line in front_matter.splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue

        indent = len(raw_line) - len(raw_line.lstrip(" "))
        line = raw_line.strip()

        if indent == 0:
            current_list_key = None
            if line == "batches:":
                in_batches = True
                current_batch = None
                continue
            in_batches = False
            key, value = split_key_value(line)
            data[key] = normalize_scalar(value)
            continue

        if indent == 2 and line.startswith("-"):
            if not in_batches:
                raise ValueError("Found batch item outside 'batches'")
            current_list_key = None
            current_batch = {}
            data["batches"].append(current_batch)
            remainder = line[1:].strip()
            if remainder:
                key, value = split_key_value(remainder)
                current_batch[key] = normalize_scalar(value)
            continue

        if indent == 4:
            if current_batch is None:
                raise ValueError("Found batch field without a batch item")
            key, value = split_key_value(line)
            if key in ("required_files", "optional_files"):
                current_batch[key] = []
                current_list_key = key
            else:
                current_batch[key] = normalize_scalar(value)
                current_list_key = None
            continue

        if indent == 6 and line.startswith("- "):
            if current_batch is None or not current_list_key:
                raise ValueError("Found list item without an active list")
            current_batch[current_list_key].append(normalize_path(line[2:]))
            continue

        raise ValueError(f"Unsupported YAML indentation or format: {raw_line!r}")

    return data


def load_plan(plan_path: Path) -> dict:
    text = plan_path.read_text(encoding="utf-8", errors="replace")
    front_matter = read_front_matter(text)
    if not front_matter:
        raise ValueError("plan.md missing YAML front matter (--- ... ---)")
    return parse_front_matter(front_matter)


def validate_plan(plan: dict) -> list[str]:
    errors: list[str] = []

    branch_base_slug = plan.get("branch_base_slug", "")
    if not branch_base_slug or not isinstance(branch_base_slug, str):
        errors.append("branch_base_slug is required and must be a string.")
    elif not BRANCH_BASE_SLUG_RE.match(branch_base_slug):
        errors.append(
            "branch_base_slug must match ^[a-z0-9]+(-[a-z0-9]+)*$."
        )

    destination_branch = plan.get("destination_branch", "")
    if not destination_branch or not isinstance(destination_branch, str):
        errors.append("destination_branch is required and must be a string.")

    batches = plan.get("batches", [])
    if not isinstance(batches, list) or not batches:
        errors.append("batches must be a non-empty list.")
        return errors

    seen_ids = set()
    for batch in batches:
        batch_id = batch.get("id")
        if batch_id is None:
            errors.append("Each batch must have an id.")
            continue
        batch_id_str = str(batch_id)
        if batch_id_str in seen_ids:
            errors.append(f"Duplicate batch id: {batch_id_str}")
        seen_ids.add(batch_id_str)

        title = batch.get("title")
        if not title or not isinstance(title, str):
            errors.append(f"Batch {batch_id_str} must have a title.")

        required_files = batch.get("required_files")
        if not isinstance(required_files, list) or not required_files:
            errors.append(f"Batch {batch_id_str} must have required_files.")
        elif len(required_files) > 30:
            errors.append(
                f"Batch {batch_id_str} has {len(required_files)} required_files (max 30)."
            )

    return errors


def get_batch(plan: dict, batch_id: str) -> dict:
    batch_id_str = str(batch_id)
    for batch in plan.get("batches", []):
        if str(batch.get("id")) == batch_id_str:
            batch.setdefault("optional_files", [])
            return batch
    raise ValueError(f"Batch id {batch_id_str} not found in plan.md")


def export_batch(plan: dict, batch_id: str) -> str:
    batch = get_batch(plan, batch_id)
    lines = [
        f"BRANCH_BASE_SLUG={shlex.quote(str(plan.get('branch_base_slug', '')))}",
        f"DESTINATION_BRANCH={shlex.quote(str(plan.get('destination_branch', '')))}",
        f"BATCH_ID={shlex.quote(str(batch.get('id')))}",
        f"BATCH_TITLE={shlex.quote(str(batch.get('title', '')))}",
        f"REQUIRED_FILES_COUNT={shlex.quote(str(len(batch.get('required_files', []))))}",
    ]
    return "\n".join(lines)


def resolve_plan_path(path_value: str, repo_root: Path) -> Path:
    candidate = Path(path_value)
    if candidate.name != path_value:
        raise ValueError("plan path must be a repo-root file name (no directories)")
    if path_value != "plan.md":
        raise ValueError("plan path must be 'plan.md'")
    return (repo_root / "plan.md").resolve()


def main() -> int:
    if len(sys.argv) < 3:
        print(
            "Usage: plan_parser.py <validate|export-batch|dump> <plan.md> [batch_id]",
            file=sys.stderr,
        )
        return 2

    command = sys.argv[1]
    repo_root = Path.cwd().resolve()
    try:
        plan_path = resolve_plan_path(sys.argv[2], repo_root)
    except ValueError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 3
    if not plan_path.exists():
        print(f"FAIL: {plan_path} not found", file=sys.stderr)
        return 3

    try:
        plan = load_plan(plan_path)
    except ValueError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 4

    if command == "validate":
        errors = validate_plan(plan)
        if errors:
            for error in errors:
                print(f"FAIL: {error}", file=sys.stderr)
            return 5
        return 0

    if command == "export-batch":
        if len(sys.argv) != 4:
            print("Usage: plan_parser.py export-batch <plan.md> <batch_id>", file=sys.stderr)
            return 2
        try:
            print(export_batch(plan, sys.argv[3]))
        except ValueError as exc:
            print(f"FAIL: {exc}", file=sys.stderr)
            return 6
        return 0

    if command == "dump":
        print(json.dumps(plan, indent=2, sort_keys=True))
        return 0

    print(f"Unknown command: {command}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
