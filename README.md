# CoLab Inventory

A responsive inventory browser built with React, TypeScript, Hono, and Cloudflare Workers. Inventory data is fetched securely from a monday.com board; sample data is shown when the integration is not configured.

## Local development

```bash
npm install
cp .env.example .dev.vars
npm run cf-typegen
npm run dev
```

Set `MONDAY_BOARD_ID` in `.dev.vars`. The file is ignored by Git. The API token
uses the `MONDAY_API_TOKEN` Cloudflare Secrets Store binding configured in
`wrangler.jsonc`. Production Secrets Store values are not available in local
development; create a local Secrets Store secret with Wrangler when live local
data is needed.

## Useful commands

```bash
npm run check
npm run build
npm run preview
```

## Cloudflare setup

The monday.com API token is already connected through the account-level
`Central_Monday_API_TOKEN` Secrets Store secret. Add the board ID as a Worker
secret if you do not want it stored as a non-secret variable:

```bash
npx wrangler secret put MONDAY_BOARD_ID
```

When the initial build is approved, deploy with:

```bash
npm run deploy
```
