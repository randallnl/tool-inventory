import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Boxes,
  Check,
  ChevronDown,
  Grid2X2,
  LayoutList,
  MapPin,
  Menu,
  PackageCheck,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { demoInventory } from "./demo-data";
import type { InventoryItem, InventoryResponse } from "./types";

type ViewMode = "grid" | "list";

async function fetchInventory(): Promise<InventoryResponse> {
  const response = await fetch("/api/inventory");
  if (!response.ok) throw new Error("Live inventory is not connected yet.");
  return response.json() as Promise<InventoryResponse>;
}

function App() {
  const embedded =
    window.location.pathname === "/embed" ||
    new URLSearchParams(window.location.search).has("embed") ||
    window.self !== window.top;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [location, setLocation] = useState("All locations");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const inventory = useQuery({
    queryKey: ["inventory"],
    queryFn: fetchInventory,
  });

  const items = inventory.data?.items ?? demoInventory;
  const isDemo = !inventory.data;
  const categories = useMemo(
    () => [...new Set(items.flatMap((item) => item.category))].sort(),
    [items],
  );
  const locations = useMemo(
    () => [...new Set(items.map((item) => item.location).filter(Boolean))].sort(),
    [items],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !needle ||
        [item.name, item.description, item.location, ...item.category]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return (
        matchesQuery &&
        (category === "All categories" || item.category.includes(category)) &&
        (location === "All locations" || item.location === location) &&
        (!inStockOnly || item.inStock)
      );
    });
  }, [items, query, category, location, inStockOnly]);

  const resetFilters = () => {
    setQuery("");
    setCategory("All categories");
    setLocation("All locations");
    setInStockOnly(false);
  };

  useEffect(() => {
    if (!embedded) return;

    document.documentElement.classList.add("embed-page");
    let animationFrame = 0;
    const reportHeight = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        window.parent.postMessage(
          {
            type: "colab-inventory:resize",
            height: document.documentElement.scrollHeight,
          },
          "*",
        );
      });
    };
    const observer = new ResizeObserver(reportHeight);
    observer.observe(document.body);
    reportHeight();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
      document.documentElement.classList.remove("embed-page");
    };
  }, [embedded]);

  return (
    <div className={`app-shell ${embedded ? "embedded" : ""}`}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="CoLab Inventory home">
          <span className="brand-mark"><Boxes size={22} /></span>
          <span>CoLab<span className="brand-light"> Inventory</span></span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a className="active" href="#inventory">Inventory</a>
          <a href="#about">How it works</a>
          <a href="#help">Get help</a>
        </nav>
        <button className="menu-button" aria-label="Open menu"><Menu /></button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-layout">
            <img
              className="hero-logo"
              src="https://cdn.shopify.com/s/files/1/0605/0535/8543/files/CoLab_Logo.png?v=1785375429"
              alt="CoLab"
              width="4500"
              height="3000"
              fetchPriority="high"
            />
            <div className="hero-copy">
              <p>Browse tools, equipment, and creative resources available across the CoLab community.</p>
              <label className="hero-search">
                <Search size={21} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search cameras, tools, event supplies…"
                  aria-label="Search inventory"
                />
                <kbd>⌘ K</kbd>
              </label>
              <div className="hero-stats">
                <span><strong>{items.length}</strong> listed resources</span>
                <span><strong>{categories.length}</strong> categories</span>
                <span><strong>{items.filter((item) => item.inStock).length}</strong> available now</span>
              </div>
            </div>
          </div>
        </section>

        <section className="inventory-section" id="inventory">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Explore the collection</span>
              <h2>Community inventory</h2>
            </div>
            <button
              className="sync-button"
              onClick={() => void inventory.refetch()}
              disabled={inventory.isFetching}
            >
              <RefreshCw size={15} className={inventory.isFetching ? "spin" : ""} />
              {inventory.isFetching ? "Syncing" : "Refresh"}
            </button>
          </div>

          {isDemo && (
            <div className="demo-banner">
              <span><Sparkles size={16} /> Showing sample inventory until monday.com is connected.</span>
              {!embedded && <a href="#setup">Connection setup <ArrowRight size={14} /></a>}
            </div>
          )}

          <div className="inventory-layout">
            <aside className={`filters ${filtersOpen ? "filters-open" : ""}`}>
              <div className="filter-title">
                <span><SlidersHorizontal size={17} /> Filters</span>
                <button onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={18} /></button>
              </div>
              <FilterSelect
                label="Category"
                value={category}
                onChange={setCategory}
                options={["All categories", ...categories]}
              />
              <FilterSelect
                label="Location"
                value={location}
                onChange={setLocation}
                options={["All locations", ...locations]}
              />
              <label className="stock-toggle">
                <span>
                  <span className="toggle-copy">Available only</span>
                  <small>Hide checked-out items</small>
                </span>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => setInStockOnly(event.target.checked)}
                />
                <span className="toggle-ui"><Check size={12} /></span>
              </label>
              <button className="clear-button" onClick={resetFilters}>Clear all filters</button>
              <div className="filter-note">
                <PackageCheck size={20} />
                <strong>Need something else?</strong>
                <span>Ask the CoLab team about borrowing or sourcing an item.</span>
              </div>
            </aside>

            <div className="results">
              <div className="results-toolbar">
                <span><strong>{filtered.length}</strong> {filtered.length === 1 ? "resource" : "resources"}</span>
                <div className="toolbar-actions">
                  <button className="mobile-filter" onClick={() => setFiltersOpen(true)}>
                    <SlidersHorizontal size={16} /> Filters
                  </button>
                  <div className="view-switch" aria-label="Choose view">
                    <button className={view === "grid" ? "selected" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 size={17} /></button>
                    <button className={view === "list" ? "selected" : ""} onClick={() => setView("list")} aria-label="List view"><LayoutList size={18} /></button>
                  </div>
                </div>
              </div>

              {filtered.length ? (
                <div className={`item-collection ${view}`}>
                  {filtered.map((item) => (
                    <InventoryCard key={item.id} item={item} onSelect={setSelected} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Search size={28} />
                  <h3>No matching resources</h3>
                  <p>Try a broader search or clear your filters.</p>
                  <button onClick={resetFilters}>Reset filters</button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="setup-section" id="setup">
          <div>
            <span className="section-kicker">Built for your workflow</span>
            <h2>Connected to the tools you already use.</h2>
          </div>
          <p>Inventory is read securely from your monday.com board through a Cloudflare Worker. Your API token never reaches the browser.</p>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="/"><span className="brand-mark"><Boxes size={19} /></span>CoLab</a>
        <span>Shared tools. Collective possibility.</span>
      </footer>

      {filtersOpen && <button className="filter-backdrop" onClick={() => setFiltersOpen(false)} aria-label="Close filters" />}
      {selected && <ItemDrawer item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <div>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
        <ChevronDown size={15} />
      </div>
    </label>
  );
}

function InventoryCard({ item, onSelect }: { item: InventoryItem; onSelect: (item: InventoryItem) => void }) {
  return (
    <article className="inventory-card" onClick={() => onSelect(item)}>
      <div className="card-image">
        {item.image ? <img src={item.image} alt="" /> : <div className="image-placeholder"><Boxes size={32} /></div>}
        <span className={`stock-badge ${item.inStock ? "" : "out"}`}>
          <span /> {item.inStock ? "Available" : "Checked out"}
        </span>
      </div>
      <div className="card-copy">
        <div className="category-row">{item.category.slice(0, 2).map((value) => <span key={value}>{value}</span>)}</div>
        <h3>{item.name}</h3>
        <p>{item.description || "More details available from the CoLab team."}</p>
        <div className="card-meta">
          <span><MapPin size={14} /> {item.location || "Location pending"}</span>
          <span className="quantity">{item.quantity === null ? "—" : item.quantity} in stock</span>
        </div>
      </div>
    </article>
  );
}

function ItemDrawer({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  return (
    <>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close item details" />
      <aside className="item-drawer" aria-label={`${item.name} details`}>
        <button className="drawer-close" onClick={onClose} aria-label="Close"><X /></button>
        <div className="drawer-image">
          {item.image ? <img src={item.image} alt="" /> : <Boxes size={44} />}
        </div>
        <div className="drawer-content">
          <div className="category-row">{item.category.map((value) => <span key={value}>{value}</span>)}</div>
          <h2>{item.name}</h2>
          <span className={`drawer-status ${item.inStock ? "" : "out"}`}>
            <span /> {item.inStock ? `${item.quantity ?? "Quantity"} available` : "Currently checked out"}
          </span>
          <p>{item.description || "Contact the CoLab team for more information about this resource."}</p>
          <div className="drawer-location"><MapPin size={18} /><span><small>Stored at</small>{item.location || "Location pending"}</span></div>
          <button className="request-button">Ask about this item <ArrowRight size={17} /></button>
          <small className="request-note">Requests will be enabled in the next build.</small>
        </div>
      </aside>
    </>
  );
}

export default App;
