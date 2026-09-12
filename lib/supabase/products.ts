import { Product, GroceryCategory } from "@/types";

export const SupabaseProductService = {
  /**
   * Obté tots els productes de la base de dades
   */
  async getProducts(): Promise<{ products: Product[]; tableMissing?: boolean }> {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return { products: json.products || [], tableMissing: json.tableMissing };
        }
      }
    } catch (err) {
      console.warn("Error al connectar amb /api/products:", err);
    }
    return { products: [] };
  },

  /**
   * Crea un nou producte a la base de dades
   */
  async addProduct(product: Partial<Product>): Promise<Product | null> {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.product) {
          return json.product;
        }
      }
    } catch (err) {
      console.error("Error creant producte:", err);
    }
    return null;
  },

  /**
   * Actualitza un producte existent a la base de dades
   */
  async updateProduct(product: Product): Promise<Product | null> {
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.product) {
          return json.product;
        }
      }
    } catch (err) {
      console.error("Error actualitzant producte:", err);
    }
    return null;
  },

  /**
   * Elimina un producte de la base de dades
   */
  async deleteProduct(productId: string): Promise<boolean> {
    try {
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        const json = await res.json();
        return Boolean(json.success);
      }
    } catch (err) {
      console.error("Error eliminant producte:", err);
    }
    return false;
  },

  /**
   * Cerca un producte per nom o l'auto-crea a la base de dades si no existeix
   */
  async findOrCreateProduct(
    name: string,
    category: GroceryCategory = "other",
    defaultUnit: string = "u."
  ): Promise<Product | null> {
    try {
      const { products } = await this.getProducts();
      const cleanName = name.trim().toLowerCase();
      const existing = products.find(
        (p) => p.name.trim().toLowerCase() === cleanName
      );
      if (existing) return existing;

      // Auto-crea el producte a la base de dades
      return await this.addProduct({
        name: name.trim(),
        category,
        defaultUnit: defaultUnit || "u.",
        source: "manual",
      });
    } catch (err) {
      console.error("Error a findOrCreateProduct:", err);
      return null;
    }
  },
};

