# Chuyển tiền liên chi nhánh — Distributed Inter-Branch Transfer

A teaching/demo system for inter-branch bank transfers using **Two-Phase Commit (2PC)**:
an Android (Jetpack Compose) client, a Node.js coordinator, and three branch nodes
(HN, HCM, DN), each owning its own accounts and JSON data files.

```
Android app ──► Coordinator :3000 ──► HN  :3001
                                  ├─► HCM :3002
                                  └─► DN  :3003
```

- Same-branch transfers are forwarded to the owning node and applied locally.
- Cross-branch transfers run 2PC: PREPARE reserves funds on the source, the
  coordinator durably records COMMIT/ABORT, then each node applies the decision.
- Unfinished transactions are recovered on coordinator startup or via
  `POST /api/transfers/recover`.

## Quick start

```bash
cd backend
npm run install:all
npm run start:all      # coordinator + 3 nodes
```

From the repo root, in another terminal:

```bash
npm run demo:all       # end-to-end demo (success, abort, commit timeout + recovery, idempotency)
npm run test:chaos     # chaos scenarios with money-conservation checks
npm run test:recovery  # commit failure + recovery
npm run reset          # restore seed balances (total 80,000,000 VND)
```

The Android app targets the emulator (`http://10.0.2.2:3000/`); open the project in
Android Studio and run the `app` module.

## Layout

| Path | Contents |
| --- | --- |
| `app/` | Android client |
| `backend/coordinator/` | 2PC coordinator, transaction log, recovery |
| `backend/shared/src/` | Branch node logic (accounts, local transfers, 2PC participant, chaos) |
| `backend/nodes/{hn,hcm,dn}/` | Per-branch entrypoints and data |
| `docs/` | Report, architecture analysis, test and presentation scripts (Vietnamese) |
| `.ai-context/` | Specification documents |

See [`backend/README.md`](backend/README.md) for API endpoints and known limitations.

See [`ROADMAP.md`](ROADMAP.md) for the remaining work to complete the project.
