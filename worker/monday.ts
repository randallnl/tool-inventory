import type { InventoryItem } from "../src/types";

const COLUMN_IDS = [
  "numbers5",
  "dropdown_mkne67x2",
  "color_mknmv73s",
  "file_mknefqr2",
  "long_text_mknpnjt9",
] as const;

type MondayAsset = {
  id?: string;
  public_url?: string;
  url?: string;
};

type MondayColumn = {
  id: string;
  text?: string | null;
  value?: string | null;
  values?: Array<{ label?: string | null }> | null;
};

type MondayItem = {
  id: string;
  name: string;
  column_values?: MondayColumn[];
  assets?: MondayAsset[];
};

type ItemsPage = {
  cursor?: string | null;
  items?: MondayItem[];
};

type MondayPayload = {
  data?: {
    boards?: Array<{ items_page?: ItemsPage }>;
    next_items_page?: ItemsPage;
  };
  errors?: unknown;
};

const itemFields = `
  id
  name
  column_values(ids: ${JSON.stringify(COLUMN_IDS)}) {
    id
    type
    text
    value
    ... on DropdownValue {
      values { id label }
    }
    ... on LongTextValue {
      text
    }
  }
  assets { id name public_url url }
`;

export async function fetchAllInventory(boardId: string, apiToken: string): Promise<InventoryItem[]> {
  const items: InventoryItem[] = [];
  let cursor: string | null = null;

  do {
    const query = cursor
      ? `query NextPage($cursor: String!) {
          next_items_page(cursor: $cursor, limit: 500) {
            cursor
            items { ${itemFields} }
          }
        }`
      : `query FirstPage($boardId: [ID!]) {
          boards(ids: $boardId) {
            items_page(limit: 500) {
              cursor
              items { ${itemFields} }
            }
          }
        }`;

    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiToken,
        "API-Version": "2025-10",
      },
      body: JSON.stringify({
        query,
        variables: cursor ? { cursor } : { boardId: [boardId] },
      }),
    });

    if (!response.ok) {
      throw new Error(`monday API request failed with status ${response.status}`);
    }

    const payload: MondayPayload = await response.json();
    if (payload.errors) throw new Error("monday API returned GraphQL errors");

    const page: ItemsPage | undefined = cursor
      ? payload.data?.next_items_page
      : payload.data?.boards?.[0]?.items_page;

    items.push(...(page?.items ?? []).map(normalizeItem));
    cursor = page?.cursor ?? null;
  } while (cursor);

  return items
    .filter((item) => item.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeItem(item: MondayItem): InventoryItem {
  const byId = Object.fromEntries((item.column_values ?? []).map((column) => [column.id, column]));
  const quantityText = byId.numbers5?.text?.trim() ?? "";
  const parsedQuantity = quantityText === "" ? null : Number(quantityText);
  const quantity = parsedQuantity !== null && Number.isFinite(parsedQuantity) ? parsedQuantity : null;
  const category =
    byId.dropdown_mkne67x2?.values?.map((value) => value.label?.trim()).filter(isString) ??
    splitCommaText(byId.dropdown_mkne67x2?.text);
  const description =
    byId.long_text_mknpnjt9?.text?.trim() ||
    longTextFromValue(byId.long_text_mknpnjt9?.value);
  const images = extractPhotoUrls(byId.file_mknefqr2, item.assets ?? []);

  return {
    id: item.id,
    name: item.name.trim(),
    quantity,
    inStock: quantity === null || quantity > 0,
    category,
    location: byId.color_mknmv73s?.text?.trim() ?? "",
    description,
    image: images[0] ?? "",
    images,
  };
}

function isString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function splitCommaText(text?: string | null): string[] {
  return text?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
}

function longTextFromValue(value?: string | null): string {
  if (!value) return "";
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) && typeof parsed.text === "string" ? parsed.text.trim() : "";
  } catch {
    return "";
  }
}

function extractPhotoUrls(fileColumn: MondayColumn | undefined, assets: MondayAsset[]): string[] {
  const urls: string[] = [];
  if (fileColumn?.value) {
    try {
      const parsed: unknown = JSON.parse(fileColumn.value);
      if (isRecord(parsed) && Array.isArray(parsed.files)) {
        for (const file of parsed.files) {
          if (!isRecord(file)) continue;
          const assetId = typeof file.assetId === "number" || typeof file.assetId === "string"
            ? String(file.assetId)
            : null;
          const asset = assetId ? assets.find((candidate) => String(candidate.id) === assetId) : undefined;
          pushUrl(urls, asset?.public_url);
          pushUrl(urls, asset?.url);
          pushUrl(urls, file.public_url);
          pushUrl(urls, file.url);
        }
      }
    } catch {
      // An invalid file value should not prevent the rest of the inventory from loading.
    }
  }
  if (!urls.length) {
    for (const asset of assets) {
      pushUrl(urls, asset.public_url);
      pushUrl(urls, asset.url);
    }
  }
  return [...new Set(urls)];
}

function pushUrl(urls: string[], value: unknown): void {
  if (typeof value === "string" && /^https:\/\//.test(value)) urls.push(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
