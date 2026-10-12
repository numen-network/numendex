# NumenDEX

## Install
From the project root:

```powershell
cd backend
npm install
cd ..\frontend
npm install
```

## Environment
Use only the root `.env`. Do not create `backend/.env` or `frontend/.env`.
See `.env.example` for supported variables.

## Run backend
```powershell
cd backend
npm start
```

## Run frontend
```powershell
cd frontend
npm run dev
```

## Token logos
Put trusted PNG/WebP token images in `frontend/public/tokens/` and map each image by contract address in `frontend/src/config/tokenLogos.js`.
