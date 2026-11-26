"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SORTS, type SortOption } from "@/lib/domain/catalog";
import { useI18n } from "@/lib/i18n/provider";

/** Sort menu that updates the URL right away (keeps search and category). */
export function SortSelect({ value }: { value: SortOption }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-[0.94rem] font-medium">
      {t.shop.sortLabel}
      <select
        value={value}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          if (event.target.value === "featured") next.delete("sort");
          else next.set("sort", event.target.value);
          router.push(`/shop${next.size ? `?${next}` : ""}`, { scroll: false });
        }}
        className="min-h-11 rounded-[var(--radius-field)] border border-line-strong bg-canvas px-3 text-[0.94rem]"
      >
        {SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t.shop.sort[sort]}
          </option>
        ))}
      </select>
    </label>
  );
}
