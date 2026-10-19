#!/usr/bin/env python3
"""Check the exact CI-only PCRE2 repair without installing host packages."""

import argparse
import copy
from pathlib import Path
import subprocess
import unittest

import yaml


ROOT = Path(__file__).resolve().parent.parent
WORKFLOW = ".github/workflows/sep-tests.yml"
BASE = "9dc68a1b14cf3adca9bca00afd0195b2325fb444"
STEP_NAME = "Install runner PCRE2 development library"

parser = argparse.ArgumentParser()
parser.add_argument("--revision")
parser.add_argument("--repo", type=Path, default=ROOT / "repos/ragflow-21109")
args = parser.parse_args()
REPO = args.repo.resolve()


def at_revision(revision):
    return subprocess.check_output(
        ["git", "show", f"{revision}:{WORKFLOW}"], cwd=REPO, text=True
    )


original = yaml.safe_load(at_revision(BASE))
text = at_revision(args.revision) if args.revision else (REPO / WORKFLOW).read_text()
workflow = yaml.safe_load(text)
steps = workflow["jobs"]["ragflow_go_integration"]["steps"]
provisioning = next((step for step in steps if step.get("name") == STEP_NAME), None)


class RunnerPCRE2(unittest.TestCase):
    def step(self):
        self.assertIsNotNone(
            provisioning,
            "Go integration must install the runner's PCRE2 linker dependency",
        )
        return provisioning

    def simulate(self, update_status=0, install_status=0):
        # sudo is a shell function and never executes a real command. The
        # fixture checks the exact workflow run block, not a reimplementation.
        prelude = f"""
sudo() {{
  printf 'MOCK_SUDO:%s\\n' "$*"
  case "$*" in
    'apt-get update') return {update_status} ;;
    'apt-get install -y --no-install-recommends libpcre2-dev')
      return {install_status} ;;
    *) return 99 ;;
  esac
}}
"""
        return subprocess.run(
            ["/bin/bash", "-c", prelude + "\n" + self.step()["run"]],
            text=True,
            capture_output=True,
            timeout=10,
        )

    def test_runner_dependency_is_installed_before_native_build_and_tests(self):
        index = steps.index(self.step())
        self.assertLess(index, next(i for i, s in enumerate(steps)
                                    if s.get("name") == "Build C++ static library"))
        self.assertLess(index, next(i for i, s in enumerate(steps)
                                    if s.get("name") == "Run Go integration tests"))

    def test_no_existing_job_permissions_gates_or_test_commands_change(self):
        amended = copy.deepcopy(workflow)
        amended["jobs"]["ragflow_go_integration"]["steps"].remove(self.step())
        self.assertEqual(original, amended)

    def test_provisioning_is_unconditional_and_does_not_suppress_failures(self):
        step = self.step()
        self.assertEqual({"name", "run"}, set(step))
        self.assertEqual(
            [
                "set -euo pipefail",
                "sudo apt-get update",
                "sudo apt-get install -y --no-install-recommends libpcre2-dev",
            ],
            step["run"].strip().splitlines(),
        )

    def test_bash_syntax(self):
        result = subprocess.run(
            ["/bin/bash", "-n"], input=self.step()["run"],
            text=True, capture_output=True, timeout=10,
        )
        self.assertEqual(0, result.returncode, result.stderr)

    def test_success_runs_update_then_installs_only_the_required_library(self):
        result = self.simulate()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(
            [
                "MOCK_SUDO:apt-get update",
                "MOCK_SUDO:apt-get install -y --no-install-recommends libpcre2-dev",
            ],
            result.stdout.splitlines(),
        )

    def test_update_failure_prevents_install_and_fails_the_step(self):
        result = self.simulate(update_status=31)
        self.assertEqual(31, result.returncode)
        self.assertEqual(["MOCK_SUDO:apt-get update"], result.stdout.splitlines())

    def test_install_failure_is_not_ignored(self):
        result = self.simulate(install_status=32)
        self.assertEqual(32, result.returncode)
        self.assertEqual(2, len(result.stdout.splitlines()))


unittest.main(argv=["test-ragflow-ci-pcre2-2122.py"], verbosity=2)
