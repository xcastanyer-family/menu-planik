"use client";

import React, { useState, useEffect } from "react";
import { Product, GroceryCategory } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SupabaseProductService } from "@/lib/supabase/products";
import { Camera, Plus, Save } from "lucide-react";
import { toast } from "sonner";

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onProductSaved: (product: Product) => void;
  onOpenScan?: () => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onProductSaved,
  onOpenScan,
}) => {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState<GroceryCategory>("other");
  const [defaultUnit, setDefaultUnit] = useState("u.");
  const [packageSize, setPackageSize] = useState<string>("");
  const [calories, setCalories] = useState<string>("");
  const [protein, setProtein] = useState<string>("");
  const [carbs, setCarbs] = useState<string>("");
  const [fat, setFat] = useState<string>("");
  const [allergensText, setAllergensText] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || "");
      setBrand(productToEdit.brand || "");
      setBarcode(productToEdit.barcode || "");
      setCategory(productToEdit.category || "other");
      setDefaultUnit(productToEdit.defaultUnit || "u.");
      setPackageSize(productToEdit.packageSize ? String(productToEdit.packageSize) : "");
      setCalories(productToEdit.nutrition?.calories ? String(productToEdit.nutrition.calories) : "");
      setProtein(productToEdit.nutrition?.protein ? String(productToEdit.nutrition.protein) : "");
      setCarbs(productToEdit.nutrition?.carbs ? String(productToEdit.nutrition.carbs) : "");
      setFat(productToEdit.nutrition?.fat ? String(productToEdit.nutrition.fat) : "");
      setAllergensText((productToEdit.allergens || []).join(", "));
      setNotes(productToEdit.notes || "");
    } else {
      setName("");
      setBrand("");
      setBarcode("");
      setCategory("other");
      setDefaultUnit("u.");
      setPackageSize("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setAllergensText("");
      setNotes("");
    }
  }, [productToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nom del producte és obligatori.");
      return;
    }

    setIsSubmitting(true);
    try {
      const allergens = allergensText
        .split(",")
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean);

      const payload: Partial<Product> = {
        name: name.trim(),
        brand: brand.trim() || undefined,
        barcode: barcode.trim() || undefined,
        category,
        defaultUnit: defaultUnit.trim() || "u.",
        packageSize: packageSize ? Number(packageSize) : undefined,
        nutrition: {
          calories: Number(calories) || 0,
          protein: Number(protein) || 0,
          carbs: Number(carbs) || 0,
          fat: Number(fat) || 0,
        },
        allergens,
        notes: notes.trim() || undefined,
        source: "manual",
      };

      let result: Product | null = null;
      if (productToEdit) {
        result = await SupabaseProductService.updateProduct({
          ...productToEdit,
          ...payload,
        } as Product);
      } else {
        result = await SupabaseProductService.addProduct(payload);
      }

      if (result) {
        toast.success(
          productToEdit
            ? `Producte "${result.name}" actualitzat a la base de dades!`
            : `Producte "${result.name}" afegit a la base de dades!`
        );
        onProductSaved(result);
        onClose();
      } else {
        toast.error("Error en desar el producte a la base de dades.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error inesperat.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? "Edita Producte" : "Donar d'Alta Producte a la BD"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!productToEdit && onOpenScan && (
          <div className="bg-primary-50/70 dark:bg-primary-950/30 border border-primary-200/80 dark:border-primary-800/60 p-3.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span className="text-xs text-primary-950 dark:text-primary-200 font-medium">
                Pots capturar el codi de barres amb la càmera del mòbil
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenScan();
              }}
              className="text-xs border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300"
            >
              Escanejar
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Nom del Producte *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Llet sencera, Macarrons, Tomàquet triturat"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Marca
            </label>
            <input
              type="text"
              placeholder="Ex: Hacendado, Pascual, Gallo"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Codi de Barres (EAN)
            </label>
            <input
              type="text"
              placeholder="8410100012345"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as GroceryCategory)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value="produce">🥦 Fruita i Verdura</option>
              <option value="dairy">🧀 Làctics i Ous</option>
              <option value="meat">🥩 Carn i Peix</option>
              <option value="bakery">🍞 Pa i Forn</option>
              <option value="pantry">🍝 Rebost i Espècies</option>
              <option value="frozen">❄️ Congelats</option>
              <option value="beverages">🧃 Begudes</option>
              <option value="other">📦 Altres</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Unitat
              </label>
              <input
                type="text"
                placeholder="g, kg, l, u."
                value={defaultUnit}
                onChange={(e) => setDefaultUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Mida envàs
              </label>
              <input
                type="number"
                placeholder="500, 1000"
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Calories (kcal/100g)
            </label>
            <input
              type="number"
              placeholder="Ex: 250"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Al·lèrgens (separats per comes)
            </label>
            <input
              type="text"
              placeholder="gluten, llet, fruits secs"
              value={allergensText}
              onChange={(e) => setAllergensText(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel·la
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            <Save className="w-3.5 h-3.5 mr-1" />
            {isSubmitting ? "Desant a la BD..." : productToEdit ? "Actualitza" : "Desa a la Base de Dades"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

