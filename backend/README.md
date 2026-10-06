# Crypto Backend

This folder contains the backend side of the app:

- `app/api`: existing API endpoint handlers moved out of the frontend app.
- `lib`: server-side helpers and shared logic used by the endpoints.
- `types`: shared TypeScript types used by backend logic.

Current state: the endpoint files are still in the original Next.js route-handler format. This preserves the existing backend behavior while we separate the codebase.

Recommended next step: turn this folder into a standalone backend app with its own `package.json`, server entry point, routing layer, and environment config.

