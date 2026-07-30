import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { fetchAllInventory } from "./monday";

const app = new Hono<{ Bindings: Env }>();

app.use("*", secureHeaders());

app.get("/api/health", (context) =>
  context.json({
    ok: true,
    service: "colab-inventory",
    timestamp: new Date().toISOString(),
  }),
);

app.get("/api/inventory", async (context) => {
  const boardId = context.env.MONDAY_BOARD_ID;
  const apiTokenBinding = context.env.MONDAY_API_TOKEN;

  if (!boardId || !apiTokenBinding) {
    return context.json(
      { error: "Inventory source is not configured", code: "SOURCE_NOT_CONFIGURED" },
      503,
    );
  }

  try {
    const apiToken = await apiTokenBinding.get();
    if (!apiToken) {
      return context.json(
        { error: "Inventory source is not configured", code: "SOURCE_NOT_CONFIGURED" },
        503,
      );
    }

    const items = await fetchAllInventory(boardId, apiToken);
    return context.json(
      {
        items,
        source: "monday" as const,
        syncedAt: new Date().toISOString(),
      },
      200,
      {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
      },
    );
  } catch (error) {
    console.error(JSON.stringify({
      message: "Failed to load inventory",
      error: error instanceof Error ? error.message : String(error),
    }));
    return context.json(
      { error: "Failed to load inventory", code: "UPSTREAM_ERROR" },
      502,
    );
  }
});

app.notFound((context) => context.json({ error: "Not found" }, 404));

export default app;
