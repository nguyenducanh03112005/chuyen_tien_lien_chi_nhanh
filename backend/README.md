# Digital Banking — Distributed Backend Foundation (Week 3/Part 2.8)

This is the refactored distributed backend consisting of a Coordinator and three Branch Nodes.

## Architecture
- **Coordinator**: Port 3000. Orchestrates requests and aggregates data from nodes.
- **HN Node**: Port 3001. Manages accounts starting with `HN-`.
- **HCM Node**: Port 3002. Manages accounts starting with `HCM-`.
- **DN Node**: Port 3003. Manages accounts starting with `DN-`.

## Installation
```bash
cd backend
npm install
cd shared
npm install
```

## Running the backend
To start all nodes and the coordinator simultaneously:
```bash
cd backend
npm run start:all
```

Or start individually:
```bash
npm run coordinator
npm run node:hn
npm run node:hcm
npm run node:dn
```

## API Endpoints (Coordinator)
- `GET /api/health`: Health of coordinator.
- `GET /api/health/nodes`: Health of all branch nodes.
- `GET /api/branches`: List logical branches.
- `GET /api/accounts`: Aggregate accounts from all online nodes.
- `GET /api/accounts?branchId=HN`: Get accounts from HN node.
- `GET /api/accounts/:id`: Get specific account (routed to correct node).
- `POST /api/transfers`: Process same-branch transfers locally or coordinate cross-branch transfers with 2PC.

## Data Storage
Each node has its own `data/accounts.json` file located in its respective folder under `nodes/`.

## Current Limitations
- Persistence uses JSON files for teaching/demo purposes, not database transactions.
- The Coordinator is a single point of coordination and 2PC can block while it is unavailable.
- Internal and chaos endpoints are not hardened for production exposure.
