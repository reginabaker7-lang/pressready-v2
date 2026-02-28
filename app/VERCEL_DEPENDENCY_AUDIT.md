# Vercel dependency/lockfile audit (`@clerk/nextjs/server`)

## Findings
- Vercel Root Directory is expected to be `app`, so the install/build context is the `app/` folder and it uses `app/package.json`.
- `app/package.json` already includes `"@clerk/nextjs": "^6.0.0"` in `dependencies`.
- `app/package-lock.json` exists in the same folder but does **not** include `@clerk/nextjs` entries.

## Why the build fails
When `package.json` and `package-lock.json` are out of sync, CI/CD installs from the lockfile, so `@clerk/nextjs` is not installed and imports such as `@clerk/nextjs/server` fail to resolve.

## Required follow-up (in Codespaces)
Run these commands from the repo root to regenerate and commit the lockfile under the Vercel root directory:

```bash
cd app
npm install
cd ..
git add app/package-lock.json
git commit -m "chore(app): sync lockfile with @clerk/nextjs dependency"
```

Then re-deploy on Vercel.
