# API Endpoints

- `GET /api/health`
- `GET /api/requirements`
- `POST /api/token` body: `{ "token": "..." }`
- `POST /api/run-batch` body: `{ "count": 1-100, "commandTemplate": "...", "railwayToken": "...", "workRoot": "..." }`
