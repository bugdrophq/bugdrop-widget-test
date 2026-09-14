import assert from "node:assert/strict";
import test from "node:test";
import {
  HOMEPAGE_MARKER,
  isEligibleHomepageDemoIssue,
  runCleanup,
  selectEligibleHomepageDemoIssues,
} from "../scripts/cleanup-homepage-demo-issues.mjs";

const repository = "mean-weasel/bugdrop-widget-test";
const repositoryId = 1120085442;
const token = "test-token";
const nowMs = Date.parse("2026-08-17T12:00:00Z");

function issue(overrides = {}) {
  return {
    number: 900,
    repository_url: `https://api.github.com/repos/${repository}`,
    state: "open",
    created_at: "2026-08-16T11:59:59.999Z",
    user: { login: "neonwatty-bugdrop[bot]", type: "Bot" },
    labels: [{ name: "bugdrop" }, { name: "bug" }],
    body: `Demo metadata\n${HOMEPAGE_MARKER}`,
    title: "Homepage demo report",
    ...overrides,
  };
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...init.headers },
    ...init,
  });
}

function withRepositoryIdentity(
  fetchImpl,
  { requestRepository = repository, id = repositoryId, fullName = requestRepository } = {},
) {
  return async (url, options) => {
    if (
      String(url) === `https://api.github.com/repos/${requestRepository}` &&
      options.method === "GET"
    ) {
      return jsonResponse({
        id,
        full_name: fullName,
      });
    }
    return fetchImpl(url, options);
  };
}

test("accepts the destination slug only for the same immutable repository", async () => {
  const destinationRepository = "bugdrophq/bugdrop-widget-test";
  const fetchImpl = async (_url, options) => {
    assert.equal(options.method, "GET");
    return jsonResponse([]);
  };

  const summary = await runCleanup({
    repository: destinationRepository,
    token,
    dryRun: true,
    nowMs,
    fetchImpl: withRepositoryIdentity(fetchImpl, {
      requestRepository: destinationRepository,
    }),
  });

  assert.equal(summary.repository, destinationRepository);
  assert.deepEqual(summary.eligible, []);
});

test("rejects a replacement repository before reading or mutating Issues", async () => {
  const forwardedMethods = [];
  const fetchImpl = async (_url, options) => {
    forwardedMethods.push(options.method);
    return jsonResponse([]);
  };

  await assert.rejects(
    runCleanup({
      repository,
      token,
      dryRun: false,
      nowMs,
      execution: "scheduled",
      fetchImpl: withRepositoryIdentity(fetchImpl, { id: 999 }),
    }),
    /Repository identity mismatch/,
  );
  assert.deepEqual(forwardedMethods, []);
});

test("rejects repositories outside the migration allowlist without network access", async () => {
  let called = false;
  await assert.rejects(
    runCleanup({
      repository: "someone-else/bugdrop-widget-test",
      token,
      dryRun: true,
      nowMs,
      fetchImpl: async () => {
        called = true;
        return jsonResponse([]);
      },
    }),
    /approved BugDrop test repository/,
  );
  assert.equal(called, false);
});

test("accepts an exact homepage demo at the 24-hour boundary", () => {
  assert.equal(
    isEligibleHomepageDemoIssue(
      issue({ created_at: "2026-08-16T12:00:00.000Z" }),
      nowMs,
      24,
    ),
    true,
  );
});

for (const [name, overrides] of [
  ["closed", { state: "closed" }],
  ["one millisecond too new", { created_at: "2026-08-16T12:00:00.001Z" }],
  ["wrong author", { user: { login: "someone-else[bot]", type: "Bot" } }],
  ["non-Bot author", { user: { login: "neonwatty-bugdrop[bot]", type: "User" } }],
  ["missing bugdrop label", { labels: [{ name: "bug" }] }],
  ["wrong page", { body: "| **Page** | https://example.com/ |" }],
  ["pull request", { pull_request: { url: "https://api.github.com/pulls/1" } }],
  ["invalid timestamp", { created_at: "not-a-date" }],
  ["heartbeat", { title: "[BugDrop production heartbeat] expected probe" }],
  ["CI canary", { title: "[BugDrop CI canary] expected probe" }],
]) {
  test(`rejects ${name}`, () => {
    assert.equal(isEligibleHomepageDemoIssue(issue(overrides), nowMs, 24), false);
  });
}

test("sorts and deduplicates eligible Issues by number", () => {
  const selected = selectEligibleHomepageDemoIssues(
    [issue({ number: 12 }), issue({ number: 2 }), issue({ number: 12 })],
    nowMs,
    24,
  );
  assert.deepEqual(selected.map(({ number }) => number), [2, 12]);
});

test("dry run follows authenticated GitHub pagination and performs GET only", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), ...options });
    if (calls.length === 1) {
      return jsonResponse([issue({ number: 8 })], {
        headers: {
          link: `<https://api.github.com/repositories/1120085442/issues?labels=bugdrop&page=2&per_page=100&state=open&after=opaque>; rel="next"`,
        },
      });
    }
    return jsonResponse([issue({ number: 3 })]);
  };

  const summary = await runCleanup({
    repository,
    token,
    dryRun: true,
    cutoffHours: 24,
    nowMs,
    fetchImpl: withRepositoryIdentity(fetchImpl),
    maxEligible: 100,
  });

  assert.deepEqual(summary.eligible, [3, 8]);
  assert.deepEqual(summary.closed, []);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.method === "GET"));
  assert.ok(calls.every((call) => call.headers.Authorization === `Bearer ${token}`));
});

test("rejects pagination that escapes the authenticated Issues query", async () => {
  const methods = [];
  const fetchImpl = async (_url, options) => {
    methods.push(options.method);
    return jsonResponse([issue()], {
      headers: {
        link: '<https://example.com/repos/mean-weasel/bugdrop-widget-test/issues?state=open&labels=bugdrop&per_page=100&page=2>; rel="next"',
      },
    });
  };
  await assert.rejects(
    runCleanup({
      repository,
      token,
      dryRun: true,
      nowMs,
      fetchImpl: withRepositoryIdentity(fetchImpl),
    }),
    /escaped the authenticated Issues query/,
  );
  assert.deepEqual(methods, ["GET"]);
});

test("rejects Issues returned from any other repository", async () => {
  const methods = [];
  const fetchImpl = async (_url, options) => {
    methods.push(options.method);
    return jsonResponse([
      issue({ repository_url: "https://api.github.com/repos/mean-weasel/other" }),
    ]);
  };
  await assert.rejects(
    runCleanup({
      repository,
      token,
      dryRun: true,
      nowMs,
      fetchImpl: withRepositoryIdentity(fetchImpl),
    }),
    /escaped the exact repository/,
  );
  assert.deepEqual(methods, ["GET"]);
});

test("live mode closes then labels eligible Issues sequentially", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), ...options });
    if (options.method === "GET") return jsonResponse([issue({ number: 44 })]);
    return jsonResponse({ ok: true });
  };
  const summary = await runCleanup({
    repository,
    token,
    dryRun: false,
    nowMs,
    fetchImpl: withRepositoryIdentity(fetchImpl),
    expectedEligibleNumbers: [44],
  });

  assert.deepEqual(summary.closed, [44]);
  assert.deepEqual(summary.labeled, [44]);
  assert.deepEqual(summary.failed, []);
  assert.deepEqual(calls.map(({ method }) => method), ["GET", "PATCH", "POST"]);
  assert.deepEqual(JSON.parse(calls[1].body), {
    state: "closed",
    state_reason: "not_planned",
  });
  assert.deepEqual(JSON.parse(calls[2].body), { labels: ["expired-demo"] });
});

test("reports close-without-label partial failure and stops", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), ...options });
    if (options.method === "GET") {
      return jsonResponse([issue({ number: 4 }), issue({ number: 5 })]);
    }
    if (options.method === "POST") return new Response("no", { status: 500 });
    return jsonResponse({ ok: true });
  };
  const summary = await runCleanup({
    repository,
    token,
    dryRun: false,
    nowMs,
    fetchImpl: withRepositoryIdentity(fetchImpl),
    expectedEligibleNumbers: [4, 5],
  });

  assert.deepEqual(summary.closed, [4]);
  assert.deepEqual(summary.labeled, []);
  assert.deepEqual(summary.failed, [
    { number: 4, stage: "label-after-close", status: 500 },
  ]);
  assert.deepEqual(calls.map(({ method }) => method), ["GET", "PATCH", "POST"]);
});

test("preserves partial mutation evidence when the label request throws", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), ...options });
    if (options.method === "GET") return jsonResponse([issue({ number: 6 })]);
    if (options.method === "POST") throw new Error("network timeout");
    return jsonResponse({ ok: true });
  };
  await assert.rejects(
    runCleanup({
      repository,
      token,
      dryRun: false,
      nowMs,
      fetchImpl: withRepositoryIdentity(fetchImpl),
      expectedEligibleNumbers: [6],
    }),
    (error) => {
      assert.deepEqual(error.summary.closed, [6]);
      assert.deepEqual(error.summary.labeled, []);
      assert.deepEqual(error.summary.failed, [
        {
          number: 6,
          stage: "label-after-close",
          message: "network timeout",
        },
      ]);
      return true;
    },
  );
  assert.deepEqual(calls.map(({ method }) => method), ["GET", "PATCH", "POST"]);
});

test("stops over-cap batches before any mutation", async () => {
  const methods = [];
  const fetchImpl = async (_url, options) => {
    methods.push(options.method);
    return jsonResponse([
      issue({ number: 1 }),
      issue({ number: 2 }),
      issue({ number: 3 }),
    ]);
  };
  await assert.rejects(
    runCleanup({
      repository,
      token,
      dryRun: false,
      nowMs,
      fetchImpl: withRepositoryIdentity(fetchImpl),
      maxEligible: 2,
      execution: "scheduled",
    }),
    (error) => {
      assert.match(error.message, /exceeds safety cap 2/);
      assert.deepEqual(error.summary.closed, []);
      assert.deepEqual(error.summary.failed, [
        { stage: "safety-cap", count: 3 },
      ]);
      return true;
    },
  );
  assert.deepEqual(methods, ["GET"]);
});

test("manual live mode stops before mutation when an authorized candidate drifts", async () => {
  const methods = [];
  const fetchImpl = async (_url, options) => {
    methods.push(options.method);
    return jsonResponse([issue({ number: 71 }), issue({ number: 72 })]);
  };
  await assert.rejects(
    runCleanup({
      repository,
      token,
      dryRun: false,
      nowMs,
      fetchImpl: withRepositoryIdentity(fetchImpl),
      expectedEligibleNumbers: [71, 73],
    }),
    (error) => {
      assert.match(error.message, /no longer eligible/);
      assert.deepEqual(error.summary.failed, [
        {
          stage: "candidate-drift",
          noLongerEligible: [73],
        },
      ]);
      return true;
    },
  );
  assert.deepEqual(methods, ["GET"]);
});

test("manual live mode rejects an empty authorization before mutation", async () => {
  const methods = [];
  const fetchImpl = async (_url, options) => {
    methods.push(options.method);
    return jsonResponse([issue({ number: 74 })]);
  };
  await assert.rejects(
    runCleanup({
      repository,
      token,
      dryRun: false,
      nowMs,
      fetchImpl: withRepositoryIdentity(fetchImpl),
      expectedEligibleNumbers: [],
    }),
    /requires at least one expected Issue/,
  );
  assert.deepEqual(methods, ["GET"]);
});

test("manual live mode cannot select scheduled behavior through its Issue input", async () => {
  const methods = [];
  const fetchImpl = async (_url, options) => {
    methods.push(options.method);
    return jsonResponse([issue({ number: 75 })]);
  };
  await assert.rejects(
    runCleanup({
      repository,
      token,
      dryRun: false,
      nowMs,
      fetchImpl: withRepositoryIdentity(fetchImpl),
      execution: "manual",
      expectedEligibleNumbers: [Number("scheduled")],
    }),
    /positive Issue numbers/,
  );
  assert.deepEqual(methods, ["GET"]);
});

test("manual live mode mutates only the exact authorized subset", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), ...options });
    if (options.method === "GET") {
      return jsonResponse([issue({ number: 81 }), issue({ number: 82 })]);
    }
    return jsonResponse({ ok: true });
  };
  const summary = await runCleanup({
    repository,
    token,
    dryRun: false,
    nowMs,
    fetchImpl: withRepositoryIdentity(fetchImpl),
    maxEligible: 1,
    expectedEligibleNumbers: [82],
  });
  assert.deepEqual(summary.eligible, [81, 82]);
  assert.deepEqual(summary.authorized, [82]);
  assert.deepEqual(summary.closed, [82]);
  assert.deepEqual(summary.labeled, [82]);
  assert.deepEqual(calls.map(({ method }) => method), ["GET", "PATCH", "POST"]);
  assert.match(calls[1].url, /\/issues\/82$/);
});

test("malformed API JSON produces no mutation", async () => {
  const methods = [];
  const fetchImpl = async (_url, options) => {
    methods.push(options.method);
    return new Response("not-json", { status: 200 });
  };
  await assert.rejects(
    runCleanup({
      repository,
      token,
      dryRun: false,
      nowMs,
      fetchImpl: withRepositoryIdentity(fetchImpl),
    }),
    /malformed JSON/,
  );
  assert.deepEqual(methods, ["GET"]);
});

test("scheduled rerun after closure is idempotent", async () => {
  const methods = [];
  const fetchImpl = async (_url, options) => {
    methods.push(options.method);
    return jsonResponse([issue({ state: "closed" })]);
  };
  const summary = await runCleanup({
    repository,
    token,
    dryRun: false,
    nowMs,
    fetchImpl: withRepositoryIdentity(fetchImpl),
    execution: "scheduled",
  });
  assert.deepEqual(summary.eligible, []);
  assert.deepEqual(methods, ["GET"]);
});

test("25-hour heartbeat is excluded while a normal demo remains dry-run only", async () => {
  const methods = [];
  const fetchImpl = async (_url, options) => {
    methods.push(options.method);
    return jsonResponse([
      issue({
        number: 31,
        created_at: "2026-08-16T11:00:00Z",
        title: "[BugDrop production heartbeat] protected",
      }),
      issue({ number: 32, created_at: "2026-08-16T11:00:00Z" }),
    ]);
  };
  const summary = await runCleanup({
    repository,
    token,
    dryRun: true,
    nowMs,
    fetchImpl: withRepositoryIdentity(fetchImpl),
  });
  assert.deepEqual(summary.eligible, [32]);
  assert.deepEqual(methods, ["GET"]);
});
