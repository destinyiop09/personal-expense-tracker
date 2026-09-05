# ExpenseFlow Frontend

A dependency-free frontend for the supplied FastAPI personal expense tracker.

## What is included

- Animated login and registration screens
- JWT authentication against `/auth/login`
- Registration against `/auth/register`
- Authenticated `/auth/me` profile lookup
- Dashboard with balance, income and expense KPIs
- Monthly spending line chart
- Spending-by-category donut chart
- Authenticated transaction listing/filtering
- Add transaction flow wired to `POST /transactions/`
- Delete transaction flow wired to `DELETE /transactions/{id}`
- Responsive mobile navigation
- Session expiry handling and logout
- Backend error messages surfaced in the UI

## Run

1. Apply `backend_patch/src/routes/auth.py` to your backend (it adds `GET /auth/me`).
2. Make sure your FastAPI server is running on `http://127.0.0.1:8000`.
3. Serve this folder on an allowed CORS origin, for example:

```bash
python -m http.server 5173
```

4. Open `http://127.0.0.1:5173`.

If your API is hosted elsewhere, set it before loading the app:

```js
localStorage.setItem("expense_api_url", "http://YOUR_HOST:8000");
```

Then reload.

## Backend contract used

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (patch included)
- `GET /categories/`
- `GET /transactions/`
- `POST /transactions/`
- `DELETE /transactions/{id}`
- `GET /summary/`
- `GET /summary/categories`
- `GET /summary/monthly`

The frontend intentionally does not duplicate business rules: transaction validation and ownership remain enforced by the backend.
