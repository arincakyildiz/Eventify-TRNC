# Eventify TRNC – Local Development Guide

Run the backend and frontend locally on Windows.

## Prerequisites
- Node.js 18+ and npm
- Python (for a quick static server)
- MongoDB connection string and SMTP creds (password reset / verification)

## Environment
Create `server/.env` with at least:
```
MONGODB_URI=<your-uri>
JWT_SECRET=<random-secret>
ADMIN_EMAIL=<admin-email>
ADMIN_PASSWORD=<admin-password>
CORS_ORIGIN=http://localhost:8000
SMTP_HOST=<smtp-host>
SMTP_PORT=<smtp-port>
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-pass>
```

## Install backend deps
```powershell
cd C:\Users\erkan\Desktop\projeler\eventify-trnc\server
npm install
```

## Run backend (port 5000)
```powershell
npm run dev
# health check
curl http://localhost:5000/api/health
```

## Run frontend (port 8000)
In a new terminal:
```powershell
cd C:\Users\erkan\Desktop\projeler\eventify-trnc
python -m http.server 8000
```
Open `http://localhost:8000` in the browser.

## Point frontend to local API
`index.html` uses `data-api-base-url`. For local dev set it to:
```html
<body data-api-base-url="http://localhost:5000/api">
```
Alternatively, in the browser console you can override temporarily:
```js
window.API_BASE_URL = 'http://localhost:5000/api';
```

## Common checks
- `http://localhost:5000/api/health` returns 200.
- Browser network tab calls go to `http://localhost:5000/api/*`.
- If CORS errors occur, confirm `CORS_ORIGIN` in `.env` matches `http://localhost:8000`.

