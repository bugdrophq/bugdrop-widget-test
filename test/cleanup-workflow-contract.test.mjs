import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = ".github/workflows/cleanup-homepage-demo-issues.yml";

test("workflow is a gated nightly and manual least-privilege entrypoint", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /cron: "23 4 \* \* \*"/);
  assert.match(workflow, /workflow_dispatch:\n\s+inputs:\n\s+dry_run:/);
  assert.match(workflow, /default: true/);
  assert.match(workflow, /type: boolean/);
  assert.match(workflow, /expected_issues:/);
  assert.match(workflow, /permissions:\n\s+contents: read\n\s+issues: write/);
  assert.match(workflow, /group: homepage-demo-issue-cleanup/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(
    workflow,
    /github\.event_name == 'workflow_dispatch' \|\| vars\.HOMEPAGE_DEMO_CLEANUP_ENABLED == 'true'/,
  );
});

test("workflow pins the exact cleanup boundary", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /node-version: 24/);
  assert.match(workflow, /--repository="\$GITHUB_REPOSITORY"/);
  assert.match(workflow, /--expected-repository-id=1120085442/);
  assert.match(workflow, /--cutoff-hours=24/);
  assert.match(workflow, /--max-eligible=100/);
  assert.match(
    workflow,
    /DRY_RUN: \$\{\{ github\.event_name == 'schedule' && 'false' \|\| inputs\.dry_run \}\}/,
  );
  assert.match(
    workflow,
    /EXECUTION: \$\{\{ github\.event_name == 'schedule' && 'scheduled' \|\| 'manual' \}\}/,
  );
  assert.match(workflow, /EXPECTED_ISSUES: \$\{\{ inputs\.expected_issues \|\| '' \}\}/);
  assert.match(workflow, /"--execution=\$\{EXECUTION\}"/);
  assert.match(workflow, /"--dry-run=\$\{DRY_RUN\}"/);
  assert.match(workflow, /"--expected-issues=\$\{EXPECTED_ISSUES\}"/);
});

test("workflow has no unrelated event or destructive command", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const triggerBlock = workflow.match(/^on:\n([\s\S]*?)\npermissions:/m)?.[1];
  assert.ok(triggerBlock, "workflow must define a trigger block");

  for (const event of ["push", "pull_request", "merge_group", "issues"]) {
    assert.doesNotMatch(triggerBlock, new RegExp(`^  ${event}:`, "m"));
  }
  assert.doesNotMatch(workflow, /\b(?:rm|delete|DELETE)\b/);
});
