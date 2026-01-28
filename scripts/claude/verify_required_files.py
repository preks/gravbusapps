#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from plan_parser import load_plan, get_batch  # noqa: E402


def git_changed_files(base_sha: str) -> set[str]:
    res = subprocess.run(
        ["git", "diff", "--name-only", base_sha, "--"],
        check=True,
        capture_output=True,
        text=True,
    )
    return {line.strip() for line in res.stdout.splitlines() if line.strip()}


def main() -> int:
    if len(sys.argv) != 4:
        print(
            "Usage: verify_required_files.py <plan.md> <base_sha> <batch_id>",
            file=sys.stderr,
        )
        return 2

    plan_path = Path(sys.argv[1])
    base_sha = sys.argv[2]
    batch_id = sys.argv[3]

    if not plan_path.exists():
        print(f"FAIL: {plan_path} not found", file=sys.stderr)
        return 3

    try:
        plan = load_plan(plan_path)
        batch = get_batch(plan, batch_id)
    except ValueError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 4

    required_files = batch.get("required_files", [])
    if not required_files:
        print("FAIL: required_files missing/empty for batch", file=sys.stderr)
        return 5

    changed = git_changed_files(base_sha)
    missing = [f for f in required_files if f not in changed]
    if missing:
        print("FAIL: Required files not changed:", file=sys.stderr)
        for f in missing:
            print(f"  - {f}", file=sys.stderr)
        print("Changed files were:", file=sys.stderr)
        for f in sorted(changed):
            print(f"  - {f}", file=sys.stderr)
        return 1

    print("OK: All required_files were changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
