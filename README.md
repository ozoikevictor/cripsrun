# Crypto Project Structure

This project has been split into two top-level areas:

- `frontend`: the customer/admin user interface, pages, components, styles, assets, and frontend build config.
- `backend`: API endpoint handlers and server-side helpers used for auth, orders, products, payments, logistics, notifications, and Firebase Admin access.

This is the first structural split. The backend currently keeps the existing Next.js route-handler shape under `backend/app/api` so no endpoint code is lost during the move. The next step is to decide whether the backend should stay as Next route handlers or become a standalone API service such as Express, Fastify, or NestJS.

