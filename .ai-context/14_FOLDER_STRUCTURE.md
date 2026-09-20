# Recommended Repository Structure

```text
digital-bank/
│
├── .ai-context/
│   ├── README.md
│   ├── 00_PROJECT_CONTEXT.md
│   ├── 01_AI_INSTRUCTIONS.md
│   ├── 02_REQUIREMENTS.md
│   ├── 03_ARCHITECTURE.md
│   ├── 04_2PC_PROTOCOL.md
│   ├── 05_DATA_MODEL.md
│   ├── 06_API_CONTRACT.md
│   ├── 07_CHAOS_TESTING.md
│   ├── 08_MOBILE_UI.md
│   ├── 09_BACKEND_STRUCTURE.md
│   ├── 10_TEST_PLAN.md
│   ├── 11_AI_TASK_TEMPLATE.md
│   ├── 12_PROJECT_STATUS.md
│   ├── 13_DEVELOPMENT_CONVENTIONS.md
│   ├── 14_FOLDER_STRUCTURE.md
│   ├── 15_DATABASE_SCHEMA.md
│   ├── 16_DEMO_SCRIPT.md
│   └── 17_ENVIRONMENT.md
│
├── mobile/
│   ├── lib/                  # Flutter
│   ├── assets/
│   ├── test/
│   └── ...
│
├── backend/
│   ├── coordinator/
│   ├── nodes/
│   │   ├── hn/
│   │   ├── hcm/
│   │   └── dn/
│   ├── shared/
│   └── tests/
│
├── docs/
│   ├── diagrams/
│   ├── screenshots/
│   └── report/
│
└── README.md
```

If React Native is selected instead of Flutter, adapt only the mobile-specific folders; do not change the distributed architecture without an explicit decision.
