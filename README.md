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

The build command generates `worker-configuration.d.ts` before TypeScript runs,
so clean CI and Cloudflare builds do not depend on a generated file being
committed.

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

## Embed in Shopify

The `/embed` route removes the app header, setup section, and footer, uses tighter
spacing, and sends its current content height to the parent page. After replacing
the example host with the deployed Worker URL, add this to a Shopify **Custom
Liquid** section:

```liquid
<div style="width: 100%; max-width: 1400px; margin: 0 auto;">
  <iframe
    id="colab-inventory-frame"
    src="https://YOUR-WORKER-URL.workers.dev/embed"
    title="CoLab community inventory"
    loading="lazy"
    style="display: block; width: 100%; min-height: 900px; border: 0;"
  ></iframe>
</div>

<script>
  (() => {
    const frame = document.getElementById("colab-inventory-frame");
    if (!frame) return;
    const frameOrigin = new URL(frame.src).origin;

    window.addEventListener("message", (event) => {
      if (event.source !== frame.contentWindow || event.origin !== frameOrigin) return;
      if (event.data?.type !== "colab-inventory:resize") return;

      const height = Number(event.data.height);
      if (Number.isFinite(height)) {
        frame.style.height = `${Math.max(700, height)}px`;
      }
    });
  })();
</script>
```

The Worker permits framing only from `queerlective.com`, its `www` host,
`*.myshopify.com`, Shopify Admin, and itself.
