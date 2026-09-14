# BugDrop Demo

Live demo of [BugDrop](https://github.com/mean-weasel/bugdrop) — a free, open-source widget: in-app feedback → GitHub Issues.

**Try it:** https://bugdrop-widget-test.vercel.app

Click the 🐛 bug button to submit feedback with screenshots & comments → creates a GitHub Issue.

## What is BugDrop?

A free, open-source **GitHub App** that adds a feedback widget to your app:
- Screenshots, annotations, comments
- Submits directly to GitHub Issues
- [Install the GitHub App](https://github.com/apps/bugdrop/installations/new)

## About This Demo

WienerMatch is a fictional landing page used to demonstrate BugDrop. Issues submitted here go to this repo's [Issues](https://github.com/mean-weasel/bugdrop-widget-test/issues).

## Widget Configuration

This demo uses the **default configuration** (title + description only). Developers can optionally collect submitter name/email by adding data attributes:

```html
<script
  src="https://bugdrop.neonwatty.workers.dev/widget.js"
  data-repo="your-org/your-repo"
  data-show-name="true"
  data-show-email="true"
></script>
```

| Attribute | Description | Default |
|-----------|-------------|---------|
| `data-repo` | Your GitHub repository | **required** |
| `data-show-name` | Display name input field | `false` |
| `data-require-name` | Make name required | `false` |
| `data-show-email` | Display email input field | `false` |
| `data-require-email` | Make email required | `false` |

See the [BugDrop documentation](https://github.com/mean-weasel/bugdrop#widget-options) for all options.

## Homepage demo Issue retention

The public BugDrop homepage may create real Issues in this repository. A
separate cleanup workflow closes eligible homepage demo Issues after 24 hours;
it never deletes Issues, so their URLs and history remain available.

An Issue is eligible only when every condition is true:

- it is open and at least 24 hours old;
- it was created by the BugDrop GitHub App;
- it has the `bugdrop` label;
- its body contains the exact homepage marker
  `| **Page** | https://bugdrop.dev/ |`;
- it is not a pull request, production heartbeat, or CI canary.

The workflow processes no more than 100 authorized Issues per run. It closes
each Issue with reason `not planned`, then adds the pre-created `expired-demo`
label. Any read, close, or label failure is explicit and stops further
mutation; there is no automatic retry.

### Setup and operation

1. Create the `expired-demo` label once, with description “Closed
   automatically after the public homepage demo retention window.”
2. Leave the repository variable `HOMEPAGE_DEMO_CLEANUP_ENABLED` absent or
   false. The scheduled job remains disabled in that state.
3. Manually dispatch **Cleanup homepage demo Issues** with `dry_run=true`
   (the default) and verify the exact candidate numbers. A dry run performs
   authenticated reads only.
4. Request separate owner authorization before the first dispatch with
   `dry_run=false`. That authorization must identify the exact commit and
   candidate Issue numbers. Enter those numbers as the comma-separated
   `expected_issues` input. The run stops before mutation if any named Issue is
   no longer eligible. Newly eligible Issues are not added to the authorized
   batch.
5. Only after the bounded live proof succeeds, separately authorize setting
   `HOMEPAGE_DEMO_CLEANUP_ENABLED=true`, then observe one scheduled run before
   treating cleanup as production-ready.

If the initial dry run reports more than 100 eligible Issues, keep the cap in
place. Request separate authority for each exact batch of at most 100 numbers;
after each batch, run a new dry run before authorizing another. Scheduled runs
remain fail-closed while more than 100 Issues are eligible.

If an Issue closes but adding `expired-demo` fails, stop. Record the Issue
number and failure, inspect its current state and labels, and request separate
repair authority. Do not blindly rerun the workflow. To disable automatic
cleanup, set `HOMEPAGE_DEMO_CLEANUP_ENABLED=false` (or remove the variable);
manual dry runs remain available for diagnosis.

## Repository migration controls

The production build defaults to the current `mean-weasel` repositories. During
the organization cutover, set these Vercel variables together and redeploy:

- `VITE_BUGDROP_CORE_REPOSITORY=bugdrophq/bugdrop`
- `VITE_BUGDROP_TEST_REPOSITORY=bugdrophq/bugdrop-widget-test`

Only the old and new BugDrop locations are accepted. The cleanup workflow uses
GitHub's runtime `GITHUB_REPOSITORY` value and independently verifies immutable
repository ID `1120085442` before it reads or mutates Issues.
