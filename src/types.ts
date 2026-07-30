export type InventoryItem = {
  id: string;
  name: string;
  quantity: number | null;
  inStock: boolean;
  category: string[];
  location: string;
  description: string;
  image: string;
  images: string[];
};

export type InventoryResponse = {
  items: InventoryItem[];
  source: "monday";
  syncedAt: string;
};
