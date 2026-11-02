"use client";

import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { FormField } from "@/components/forms/form-field";
import { NativeSelect } from "@/components/forms/native-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GHANA_REGIONS } from "@/lib/ghana";
import { cn } from "@/lib/utils";
import { LISTING_SORTS } from "@/modules/catalog/schemas";

type Values = {
  q: string;
  category: string;
  region: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sort: string;
};

/**
 * Filters in a bottom sheet, within thumb reach on phones. It's a plain GET
 * form, so the results are a shareable URL.
 */
export function MarketFilters({
  values,
  activeCount,
}: {
  values: Values;
  activeCount: number;
}) {
  return (
    <Sheet>
      <SheetTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-11 shrink-0 bg-card px-3",
        )}
      >
        <SlidersHorizontal aria-hidden />
        Filters
        {activeCount ? (
          <span className="ml-0.5 rounded-full bg-field-green px-1.5 text-xs text-white">
            {activeCount}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[90dvh] overflow-y-auto rounded-t-3xl pb-safe sm:mx-auto sm:max-w-lg"
      >
        <form method="get" action="/market" className="flex flex-col">
          {values.q ? <input type="hidden" name="q" value={values.q} /> : null}
          {values.category ? (
            <input type="hidden" name="category" value={values.category} />
          ) : null}
          <SheetHeader>
            <SheetTitle className="text-lg font-bold">Filters</SheetTitle>
            <SheetDescription>
              Narrow down produce by where it’s grown and its price.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4">
            <FormField id="filter-region" label="Farm region">
              <NativeSelect
                id="filter-region"
                name="region"
                defaultValue={values.region}
              >
                <option value="">Anywhere in Ghana</option>
                {Object.entries(GHANA_REGIONS).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="filter-min" label="Min price (GH₵)">
                <Input
                  id="filter-min"
                  name="minPrice"
                  inputMode="decimal"
                  defaultValue={values.minPrice}
                />
              </FormField>
              <FormField id="filter-max" label="Max price (GH₵)">
                <Input
                  id="filter-max"
                  name="maxPrice"
                  inputMode="decimal"
                  defaultValue={values.maxPrice}
                />
              </FormField>
            </div>
            <FormField id="filter-sort" label="Sort by">
              <NativeSelect
                id="filter-sort"
                name="sort"
                defaultValue={values.sort}
              >
                {Object.entries(LISTING_SORTS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <label className="flex items-center gap-3 rounded-xl border border-border p-3">
              <input
                type="checkbox"
                name="inStock"
                value="1"
                defaultChecked={values.inStock}
                className="size-5 accent-field-green"
              />
              <span className="font-medium">
                Only show what I can order now
              </span>
            </label>
          </div>
          <SheetFooter className="flex-row gap-2">
            <Link
              href="/market"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
            >
              Clear all
            </Link>
            <Button type="submit" className="flex-1">
              Show results
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
