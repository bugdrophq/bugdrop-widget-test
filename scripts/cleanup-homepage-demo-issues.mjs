#!/usr/bin/env node

import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const HOMEPAGE_MARKER = "| **Page** | https://bugdrop.dev/ |";
export const BUGDROP_AUTHORS = new Set([
  "neonwatty-bugdrop[bot]",
  "app/neonwatty-bugdrop",
]);
export const EXCLUDED_TITLE_PREFIXES = [
  "[BugDrop production heartbeat]",
  "[BugDrop CI canary]",
];

export const EXPECTED_REPOSITORY_ID = 1120085442;
export const APPROVED_REPOSITORIES = new Set([
  "mean-weasel/bugdrop-widget-test",
  "bugdrophq/bugdrop-widget-test",
]);
const API_ORIGIN = "https://api.github.com";
const ABSOLUTE_MAX_ELIGIBLE = 100;

function labelNames(issue) {
  if (!Array.isArray(issue?.labels)) return [];
  return issue.labels.flatMap((label) => {
    if (typeof label === "string") return [label];
    return typeof label?.name === "string" ? [label.name] : [];
  });
}

export function isEligibleHomepageDemoIssue(issue, nowMs, cutoffHours) {
  if (!issue || typeof issue !== "object" || issue.pull_request) return false;
  if (!Number.isInteger(issue.number) || issue.number < 1) return false;
  if (issue.state !== "open") return false;
  if (!Number.isFinite(nowMs) || !Number.isFinite(cutoffHours) || cutoffHours <= 0) {
    return false;
  }

  const createdAt = Date.parse(issue.created_at);
  if (!Number.isFinite(createdAt)) return false;
  if (createdAt > nowMs - cutoffHours * 60 * 60 * 1000) return false;

  if (!BUGDROP_AUTHORS.has(issue.user?.login) || issue.user?.type !== "Bot") {
    return false;
  }
  if (!labelNames(issue).includes("bugdrop")) return false;
  if (typeof issue.body !== "string" || !issue.body.includes(HOMEPAGE_MARKER)) {
    return false;
  }
  if (
    typeof issue.title !== "string" ||
    EXCLUDED_TITLE_PREFIXES.some((prefix) => issue.title.startsWith(prefix))
  ) {
    return false;
  }
  return true;
}

export function selectEligibleHomepageDemoIssues(
  issues,
  nowMs,
  cutoffHours,
) {
  if (!Array.isArray(issues)) throw new TypeError("GitHub Issues response must be an array");
  const byNumber = new Map();
  for (const issue of issues) {
    if (isEligibleHomepageDemoIssue(issue, nowMs, cutoffHours)) {
      byNumber.set(issue.number, issue);
    }
  }
  return [...byNumber.values()].sort((left, right) => left.number - right.number);
}

function assertRepository(repository, expectedRepositoryId) {
  if (!APPROVED_REPOSITORIES.has(repository)) {
    throw new Error(
      `Cleanup repository must be an approved BugDrop test repository: ${repository}`,
    );
  }
  if (!Number.isInteger(expectedRepositoryId) || expectedRepositoryId < 1) {
    throw new Error("expectedRepositoryId must be a positive integer");
  }
}

async function verifyRepositoryIdentity({
  repository,
  expectedRepositoryId,
  token,
  fetchImpl,
}) {
  const response = await fetchImpl(`${API_ORIGIN}/repos/${repository}`, {
    method: "GET",
    headers: requestHeaders(token),
  });
  const body = await responseJson(response, "GitHub repository identity read");
  if (body?.id !== expectedRepositoryId || body?.full_name !== repository) {
    throw new Error(
      `Repository identity mismatch: expected ${repository} (${expectedRepositoryId})`,
    );
  }
}

function assertBounds(cutoffHours, maxEligible) {
  if (!Number.isFinite(cutoffHours) || cutoffHours <= 0) {
    throw new Error("cutoffHours must be a positive number");
  }
  if (
    !Number.isInteger(maxEligible) ||
    maxEligible < 1 ||
    maxEligible > ABSOLUTE_MAX_ELIGIBLE
  ) {
    throw new Error(`maxEligible must be an integer from 1-${ABSOLUTE_MAX_ELIGIBLE}`);
  }
}

function requestHeaders(token) {
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("GITHUB_TOKEN is required");
  }
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function responseJson(response, description) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${description} failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${description} returned malformed JSON`);
  }
}

function nextPageUrl(linkHeader, repository) {
  if (!linkHeader) return null;
  const nextPart = linkHeader
    .split(",")
    .find((part) => /;\s*rel="next"\s*$/.test(part.trim()));
  if (!nextPart) return null;
  const match = nextPart.match(/^\s*<([^>]+)>/);
  if (!match) throw new Error("GitHub pagination supplied a malformed next link");

  const next = new URL(match[1]);
  const expectedPath = `/repos/${repository}/issues`;
  const isCanonicalRepositoryPath = /^\/repositories\/\d+\/issues$/.test(
    next.pathname,
  );
  if (
    next.origin !== API_ORIGIN ||
    next.username ||
    next.password ||
    (next.pathname !== expectedPath && !isCanonicalRepositoryPath) ||
    next.searchParams.get("state") !== "open" ||
    next.searchParams.get("labels") !== "bugdrop" ||
    next.searchParams.get("per_page") !== "100"
  ) {
    throw new Error("GitHub pagination next link escaped the authenticated Issues query");
  }
  return next.href;
}

async function readOpenBugDropIssues({ repository, token, fetchImpl }) {
  const issues = [];
  let pageUrl = new URL(`/repos/${repository}/issues`, API_ORIGIN);
  pageUrl.search = new URLSearchParams({
    state: "open",
    labels: "bugdrop",
    per_page: "100",
    page: "1",
  }).toString();

  for (let page = 0; page < 100 && pageUrl; page += 1) {
    const response = await fetchImpl(pageUrl, {
      method: "GET",
      headers: requestHeaders(token),
    });
    const body = await responseJson(response, "GitHub Issues read");
    if (!Array.isArray(body)) throw new Error("GitHub Issues response must be an array");
    const expectedRepositoryUrl = `${API_ORIGIN}/repos/${repository}`;
    if (body.some((issue) => issue?.repository_url !== expectedRepositoryUrl)) {
      throw new Error("GitHub Issues response escaped the exact repository");
    }
    issues.push(...body);
    pageUrl = nextPageUrl(response.headers.get("link"), repository);
  }

  if (pageUrl) throw new Error("GitHub Issues pagination exceeded 100 pages");
  return issues;
}

async function mutateIssue({ repository, number, token, fetchImpl, summary }) {
  const issueUrl = `${API_ORIGIN}/repos/${repository}/issues/${number}`;
  const closeResponse = await fetchImpl(issueUrl, {
    method: "PATCH",
    headers: {
      ...requestHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state: "closed", state_reason: "not_planned" }),
  });
  if (!closeResponse.ok) {
    summary.failed.push({
      number,
      stage: "close",
      status: closeResponse.status,
    });
    return false;
  }
  summary.closed.push(number);

  const labelResponse = await fetchImpl(`${issueUrl}/labels`, {
    method: "POST",
    headers: {
      ...requestHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ labels: ["expired-demo"] }),
  });
  if (!labelResponse.ok) {
    summary.failed.push({
      number,
      stage: "label-after-close",
      status: labelResponse.status,
    });
    return false;
  }
  summary.labeled.push(number);
  return true;
}

export async function runCleanup({
  repository,
  expectedRepositoryId = EXPECTED_REPOSITORY_ID,
  token,
  dryRun,
  cutoffHours = 24,
  nowMs = Date.now(),
  fetchImpl = fetch,
  maxEligible = 100,
  expectedEligibleNumbers = [],
  execution = "manual",
}) {
  assertRepository(repository, expectedRepositoryId);
  assertBounds(cutoffHours, maxEligible);
  requestHeaders(token);
  if (typeof dryRun !== "boolean") throw new Error("dryRun must be a boolean");
  if (!new Set(["manual", "scheduled"]).has(execution)) {
    throw new Error("execution must be manual or scheduled");
  }

  await verifyRepositoryIdentity({
    repository,
    expectedRepositoryId,
    token,
    fetchImpl,
  });
  const issues = await readOpenBugDropIssues({ repository, token, fetchImpl });
  const eligibleIssues = selectEligibleHomepageDemoIssues(
    issues,
    nowMs,
    cutoffHours,
  );
  const summary = {
    mode: dryRun ? "dry-run" : "live",
    repository,
    cutoff: new Date(nowMs - cutoffHours * 60 * 60 * 1000).toISOString(),
    scanned: issues.length,
    eligible: eligibleIssues.map((issue) => issue.number),
    authorized: [],
    closed: [],
    labeled: [],
    failed: [],
  };

  if (dryRun) return summary;

  let mutationIssues;
  if (execution === "scheduled") {
    if (eligibleIssues.length > maxEligible) {
      const error = new Error(
        `Eligible Issue count ${eligibleIssues.length} exceeds safety cap ${maxEligible}`,
      );
      error.summary = {
        ...summary,
        failed: [{ stage: "safety-cap", count: eligibleIssues.length }],
      };
      throw error;
    }
    mutationIssues = eligibleIssues;
    summary.authorized = summary.eligible;
  } else {
    if (
      !Array.isArray(expectedEligibleNumbers) ||
      expectedEligibleNumbers.some(
        (number) => !Number.isInteger(number) || number < 1,
      )
    ) {
      throw new Error("expectedEligibleNumbers must contain positive Issue numbers");
    }
    const expected = [...new Set(expectedEligibleNumbers)].sort(
      (left, right) => left - right,
    );
    if (expected.length === 0) {
      throw new Error("Manual live cleanup requires at least one expected Issue");
    }
    if (expected.length > maxEligible) {
      const error = new Error(
        `Authorized Issue count ${expected.length} exceeds safety cap ${maxEligible}`,
      );
      error.summary = {
        ...summary,
        failed: [{ stage: "safety-cap", count: expected.length }],
      };
      throw error;
    }
    const issuesByNumber = new Map(
      eligibleIssues.map((issue) => [issue.number, issue]),
    );
    const noLongerEligible = expected.filter(
      (number) => !issuesByNumber.has(number),
    );
    if (noLongerEligible.length > 0) {
      const error = new Error(
        `Authorized Issues are no longer eligible: [${noLongerEligible.join(",")}]`,
      );
      error.summary = {
        ...summary,
        failed: [{ stage: "candidate-drift", noLongerEligible }],
      };
      throw error;
    }
    mutationIssues = expected.map((number) => issuesByNumber.get(number));
    summary.authorized = expected;
  }

  for (const issue of mutationIssues) {
    let succeeded;
    try {
      succeeded = await mutateIssue({
        repository,
        number: issue.number,
        token,
        fetchImpl,
        summary,
      });
    } catch (cause) {
      const error =
        cause instanceof Error ? cause : new Error(String(cause));
      summary.failed.push({
        number: issue.number,
        stage: summary.closed.includes(issue.number)
          ? "label-after-close"
          : "close",
        message: error.message,
      });
      error.summary = summary;
      throw error;
    }
    if (!succeeded) break;
  }
  return summary;
}

function parseCliArguments(argv) {
  const allowed = new Set([
    "repository",
    "expected-repository-id",
    "dry-run",
    "cutoff-hours",
    "max-eligible",
    "expected-issues",
    "execution",
  ]);
  const values = new Map();
  for (const argument of argv) {
    const match = argument.match(/^--([^=]+)=(.*)$/);
    if (!match || !allowed.has(match[1]) || values.has(match[1])) {
      throw new Error(`Unsupported or duplicate argument: ${argument}`);
    }
    values.set(match[1], match[2]);
  }
  for (const required of allowed) {
    if (!values.has(required)) throw new Error(`Missing required argument: --${required}`);
  }
  if (!new Set(["true", "false"]).has(values.get("dry-run"))) {
    throw new Error("--dry-run must be true or false");
  }
  return {
    repository: values.get("repository"),
    expectedRepositoryId: Number(values.get("expected-repository-id")),
    dryRun: values.get("dry-run") === "true",
    cutoffHours: Number(values.get("cutoff-hours")),
    maxEligible: Number(values.get("max-eligible")),
    expectedEligibleNumbers: values
      .get("expected-issues")
      .split(",")
      .filter(Boolean)
      .map((value) => Number(value)),
    execution: values.get("execution"),
  };
}

async function writeSummary(summary) {
  const json = JSON.stringify(summary, null, 2);
  console.log(json);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `## Homepage demo Issue cleanup\n\n\`\`\`json\n${json}\n\`\`\`\n`,
    );
  }
}

async function main() {
  let summary;
  try {
    const options = parseCliArguments(process.argv.slice(2));
    summary = await runCleanup({
      ...options,
      token: process.env.GITHUB_TOKEN,
    });
  } catch (error) {
    summary = error.summary ?? {
      mode: "failed",
      repository: null,
      cutoff: null,
      scanned: 0,
      eligible: [],
      closed: [],
      labeled: [],
      failed: [{ stage: "setup-or-read", message: error.message }],
    };
    await writeSummary(summary);
    process.exitCode = 1;
    return;
  }
  await writeSummary(summary);
  if (summary.failed.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
