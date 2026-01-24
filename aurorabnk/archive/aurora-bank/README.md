# Aurora Bank (scaffold)

This is a minimal scaffold created inside the workspace.

Structure:

my-project (aurora-bank)/
- src/         <- Frontend source (React)
- public/      <- Public files
- api/         <- Serverless endpoints (simple handlers)
- package.json <- Project manifest
- index.html   <- Simple entry

How to run (development):

- Install dependencies in `aurora-bank` (recommended using a separate terminal):

```bash
cd aurora-bank
npm install
npm start
```

The `api/` folder contains simple Node-style handlers (module.exports). Adapt them for your target serverless platform (Vercel, Netlify, etc.) as needed.
