# Crypto Frontend

This folder contains the user interface for the app:

- `app`: Next.js pages, layouts, and route groups for customer, auth, and admin screens.
- `components`: reusable UI components.
- `hooks`, `store`, `types`, and `lib`: frontend support code and shared helpers.
- `public`: static images and assets.

Run frontend commands from this folder.

```bash
npm run dev
```

The frontend still calls API URLs such as `/api/products`. After the backend is made into a standalone service, those calls should point to the backend base URL instead.

