# Free Playwright worker hosting options

Checked 2026-10-26. Provider quotas and prices can change; verify the linked
official pages before deploying.

## Recommendation

For a low-operations prototype that keeps a BullMQ consumer online, try
Northflank Sandbox first. Its pricing page lists an ongoing $20/month allowance
for Northflank Cloud resources and says Sandbox services do not sleep. That
allowance is not a guaranteed browser-worker size: the listed 0.5-vCPU/1-GB
service is $12/month, while 1-vCPU/2-GB is $24/month, before considering other
resources. Keep concurrency low and monitor memory.

If the budget must be strictly $0 and VM maintenance is acceptable, Oracle
Cloud's Always Free Ampere A1 compute provides more resources, but it is ARM64,
can have regional capacity constraints, and may be reclaimed when its low-use
criteria are met. Validate the exact Playwright image and browser binaries on
ARM64 before relying on it.

## Comparison

| Host | Free allowance and behavior | Playwright worker fit |
|---|---|---|
| Northflank Sandbox | Up to $20/month of Northflank Cloud resources; Sandbox services do not sleep. | Closest managed fit for an always-on Docker/BullMQ worker. Verify the worker size and supporting service costs fit the allowance. |
| Google Cloud Run | Monthly free tier includes instance-based compute allowances, shared across projects in a billing account. Services normally scale to zero. | Prefer Cloud Run Jobs for finite jobs dispatched per queue event. A continuously polling worker requires an instance to remain available and can exceed free usage. Jobs support configurable task timeouts up to 168 hours. |
| Oracle Cloud Always Free | A1 allowance: 1,500 OCPU-hours and 9,000 GB-hours/month (equivalent to 2 OCPUs and 12 GB RAM), plus 200 GB block storage. | Can run an always-on Docker VM. Requires VM operations and an ARM64 compatibility test; capacity and idle-reclamation criteria apply. |
| Fly.io | The current free trial is 2 total VM-hours or 7 days, whichever comes first; this is not an ongoing free tier. | Useful only for a brief deployment smoke test, not a sustained worker. |

## Playwright isolation

Keep the browser worker separate from the Next.js request process. Playwright's
official Docker guidance says its image contains browser binaries and system
dependencies, but not the Playwright package. For untrusted sites, do not run
Chromium as root: the official guidance notes that root disables Chromium's
sandbox and recommends a separate user and seccomp profile for crawling.
Confirm the hosting platform supports the required runtime security settings.

Neon can hold artifact bytes for a prototype, but large traces and videos can
increase database storage, backup, and transfer costs. Apply size limits and
avoid fetching artifact bytes in normal run queries.

## Official sources

- [Northflank pricing](https://northflank.com/pricing)
- [Google Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Cloud Run autoscaling](https://docs.cloud.google.com/run/docs/about-instance-autoscaling)
- [Cloud Run task timeout](https://docs.cloud.google.com/run/docs/configuring/task-timeout)
- [Cloud Run container contract](https://docs.cloud.google.com/run/docs/container-contract)
- [Oracle Cloud Always Free resources and reclamation criteria](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Oracle Cloud networking](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/overview.htm)
- [Fly.io free trial](https://docs.fly.io/about/free-trial)
- [Fly.io pricing](https://docs.fly.io/about/pricing)
- [Playwright Docker documentation](https://playwright.dev/docs/docker)
