"use client";

import { useRouter } from "next/navigation";

export function SortSelect({
  currentSort,
  cat,
  q,
}: {
  currentSort?: string;
  cat?: string;
  q?: string;
}) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextVal = e.target.value;
    const params = new URLSearchParams();
    if (cat) params.set("cat", cat);
    if (q) params.set("q", q);
    if (nextVal && nextVal !== "newest") {
      params.set("sort", nextVal);
    }
    const query = params.toString();
    router.push(`/catalogue${query ? `?${query}` : ""}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-xs font-medium text-[var(--theme-muted)]">
        Trier par :
      </label>
      <select
        id="sort"
        name="sort"
        value={currentSort || "newest"}
        onChange={handleChange}
        className="text-xs font-medium py-1.5 px-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] focus:outline-none"
      >
        <option value="newest">Nouveautés</option>
        <option value="price_asc">Prix croissant</option>
        <option value="price_desc">Prix décroissant</option>
        <option value="name">Nom (A-Z)</option>
      </select>
    </div>
  );
}
