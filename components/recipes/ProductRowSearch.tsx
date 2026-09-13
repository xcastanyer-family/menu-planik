"use client";

import React, { useState, useRef, useEffect } from "react";
import { Product } from "@/types";
import { Search, X, Check, Plus, ScanLine, Pencil } from "lucide-react";

interface ProductRowSearchProps {
  products: Product[];
  selectedProductId?: string;
  onSelectProduct: (product: Product | null) => void;
  onOpenCreate: () => void;
  onOpenScan: () => void;
  onOpenVisualPicker: () => void;
}

export const ProductRowSearch: React.FC<ProductRowSearchProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
  onOpenCreate,
  onOpenScan,
  onOpenVisualPicker,
}) => {
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.brand && p.brand.toLowerCase().includes(query.toLowerCase())) ||
          (p.category && p.category.toLowerCase().includes(query.toLowerCase()))
      )
    : products.slice(0, 15); // Show first 15 if no query

  // If already selected, display clean chip with change button
  if (selectedProduct && !isOpen) {
    return (
      <div className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">
            {selectedProduct.name}
          </span>
          {selectedProduct.brand && (
            <span className="text-[11px] text-zinc-400 truncate hidden sm:inline">
              ({selectedProduct.brand})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="text-[11px] font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 p-1 rounded hover:bg-primary-50 dark:hover:bg-primary-950/40 flex items-center gap-1"
            title="Canviar producte"
          >
            <Pencil className="w-3 h-3" />
            <span className="hidden xs:inline">Canviar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Escriu per cercar producte..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-8 pr-16 py-1.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        />
        <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenVisualPicker}
            className="text-[10px] font-bold px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-300"
            title="Obre cercador visual complet"
          >
            📋 Catàleg
          </button>
        </div>
      </div>

      {/* Instant Dropdown Results */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          {filtered.length === 0 ? (
            <div className="p-3 text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
              <p>Cap producte coincident amb &quot;{query}&quot;.</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCreate();
                  }}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear &quot;{query}&quot;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenScan();
                  }}
                  className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
                >
                  <ScanLine className="w-3.5 h-3.5" /> Escanejar
                </button>
              </div>
            </div>
          ) : (
            filtered.map((p) => {
              const isCurrent = p.id === selectedProductId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelectProduct(p);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition ${
                    isCurrent ? "bg-emerald-50/60 dark:bg-emerald-950/30" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {p.name}
                      </span>
                      {p.brand && (
                        <span className="text-[11px] text-zinc-400 truncate">
                          ({p.brand})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                      Unitat: {p.defaultUnit || "u."} {p.packageSize ? `• ${p.packageSize}${p.defaultUnit || ""}` : ""}
                    </span>
                  </div>
                  {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </button>
              );
            })
          )}

          {/* Quick options at bottom of list */}
          <div className="p-2 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenCreate();
              }}
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> + Donar d&apos;alta nou
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenScan();
              }}
              className="font-medium text-primary-600 hover:underline flex items-center gap-1"
            >
              <ScanLine className="w-3 h-3" /> 📸 Escanejar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

