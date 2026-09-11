import { Recipe, Ingredient, DietaryPreference, MealType, DayOfWeek } from "@/types";

interface KnownIngredientDef {
  keywords: string[];
  name: string;
  amount: number;
  unit: string;
  category: "produce" | "dairy" | "meat" | "bakery" | "pantry" | "frozen" | "beverages" | "other";
}

const KNOWN_INGREDIENTS: KnownIngredientDef[] = [
  // Produce / Vegetables & Herbs
  { keywords: ["patata", "patates", "patatas", "papa", "papas"], name: "Patates de varietat monalisa o kennebec", amount: 350, unit: "g", category: "produce" },
  { keywords: ["ceba", "cebes", "cebolla", "cebollas", "onion"], name: "Ceba de Figueres", amount: 1, unit: "unitat", category: "produce" },
  { keywords: ["all", "alls", "ajo", "ajos", "garlic"], name: "Grans d'all", amount: 2, unit: "unitats", category: "produce" },
  { keywords: ["tomaquet", "tomàquet", "tomaquets", "tomàquets", "tomate", "tomates"], name: "Tomàquets madurs de branca", amount: 2, unit: "unitats", category: "produce" },
  { keywords: ["pebrot", "pebrots", "pimiento", "pimientos", "pepper"], name: "Pebrot vermell i verd", amount: 1, unit: "unitat", category: "produce" },
  { keywords: ["carbassó", "carbasso", "calabacin", "calabacín", "zucchini"], name: "Carbassó fresc", amount: 1, unit: "unitat", category: "produce" },
  { keywords: ["albergínia", "alberginia", "berenjena", "berenjenas", "eggplant"], name: "Albergínia", amount: 1, unit: "unitat", category: "produce" },
  { keywords: ["espinacs", "espinacas", "spinach"], name: "Espinacs frescos", amount: 200, unit: "g", category: "produce" },
  { keywords: ["bolet", "bolets", "xampinyo", "xampinyons", "setas", "champinones", "champiñones", "mushrooms"], name: "Bolets o xampinyons variats", amount: 250, unit: "g", category: "produce" },
  { keywords: ["pastanaga", "pastanagues", "zanahoria", "zanahorias", "carrot"], name: "Pastanagues", amount: 2, unit: "unitats", category: "produce" },
  { keywords: ["porro", "porros", "puerro", "puerros", "leek"], name: "Porro fresc", amount: 1, unit: "unitat", category: "produce" },
  { keywords: ["carbassa", "calabaza", "pumpkin"], name: "Carbassa a daus", amount: 300, unit: "g", category: "produce" },
  { keywords: ["enciam", "lechuga", "lettuce", "brots"], name: "Brots tendres o enciam fresc", amount: 150, unit: "g", category: "produce" },
  { keywords: ["ruca", "rúcula", "rucula", "arugula"], name: "Ruca fresca", amount: 80, unit: "g", category: "produce" },
  { keywords: ["broquil", "bròquil", "brócoli", "brocoli", "broccoli"], name: "Bròquil tallat a brots", amount: 250, unit: "g", category: "produce" },
  { keywords: ["coliflor", "cauliflower"], name: "Coliflor fresca", amount: 250, unit: "g", category: "produce" },
  { keywords: ["carxofa", "carxofes", "alcachofa", "alcachofas", "artichoke"], name: "Carxofes fresques netes", amount: 3, unit: "unitats", category: "produce" },
  { keywords: ["esparrecs", "espàrrecs", "esparragos", "espárragos", "asparagus"], name: "Espàrrecs verds", amount: 150, unit: "g", category: "produce" },
  { keywords: ["alvocat", "aguacate", "avocado"], name: "Alvocat madur", amount: 1, unit: "unitat", category: "produce" },
  { keywords: ["llimona", "limon", "limón", "lemon"], name: "Llimona", amount: 1, unit: "unitat", category: "produce" },
  { keywords: ["platan", "plàtan", "platano", "plátano", "banana"], name: "Plàtan madur", amount: 1, unit: "unitat", category: "produce" },
  { keywords: ["poma", "pomes", "manzana", "apple"], name: "Poma golden o fuji", amount: 1, unit: "unitat", category: "produce" },
  { keywords: ["julivert", "perejil", "parsley"], name: "Julivert fresc picat", amount: 1, unit: "branqueta", category: "produce" },
  { keywords: ["romani", "romaní", "romero", "rosemary"], name: "Branqueta de romaní", amount: 1, unit: "unitat", category: "produce" },
  { keywords: ["farigola", "tomillo", "thyme"], name: "Farigola fresca", amount: 1, unit: "branqueta", category: "produce" },
  { keywords: ["alfabrega", "alfàbrega", "albahaca", "basil"], name: "Fulles d'alfàbrega fresca", amount: 8, unit: "fulles", category: "produce" },
  { keywords: ["gingebre", "jengibre", "ginger"], name: "Gingebre fresc ratllat", amount: 10, unit: "g", category: "produce" },

  // Meat & Seafood
  { keywords: ["salmo", "salmó", "salmon", "salmón"], name: "Filets de salmó fresc", amount: 320, unit: "g", category: "meat" },
  { keywords: ["lluc", "lluç", "merluza", "hake"], name: "Llom de lluç fresc", amount: 320, unit: "g", category: "meat" },
  { keywords: ["bacalla", "bacallà", "bacalao", "cod"], name: "Llom de bacallà dessalat", amount: 320, unit: "g", category: "meat" },
  { keywords: ["sipia", "sípia", "sepia", "cuttlefish"], name: "Sípia neta tallada a daus", amount: 300, unit: "g", category: "meat" },
  { keywords: ["calamar", "calamars", "calamares", "squid"], name: "Calamars nets tallats a anelles", amount: 250, unit: "g", category: "meat" },
  { keywords: ["gamba", "gambes", "gambas", "prawns", "shrimp", "llagostins"], name: "Gambes o llagostins", amount: 200, unit: "g", category: "meat" },
  { keywords: ["tonyina", "atun", "atún", "tuna"], name: "Filet de tonyina o tonyina clara", amount: 200, unit: "g", category: "meat" },
  { keywords: ["dorada", "daurada", "llobarro", "lubina", "sea bass"], name: "Filet de peix fresc (llobarro o daurada)", amount: 320, unit: "g", category: "meat" },
  { keywords: ["pollastre", "pollo", "chicken", "pit"], name: "Pit de pollastre a trossos o tires", amount: 350, unit: "g", category: "meat" },
  { keywords: ["cuixes", "aletes", "muslos"], name: "Cuixes de pollastre de corral", amount: 2, unit: "unitats", category: "meat" },
  { keywords: ["gall dindi", "pavo", "turkey"], name: "Filets de pit de gall dindi", amount: 320, unit: "g", category: "meat" },
  { keywords: ["vedella", "ternera", "beef", "bistec"], name: "Filets o daus de vedella", amount: 300, unit: "g", category: "meat" },
  { keywords: ["carn picada", "carne picada", "mince"], name: "Carn picada mixta (vedella i porc)", amount: 300, unit: "g", category: "meat" },
  { keywords: ["mandonguilles", "albondigas", "meatballs"], name: "Mandonguilles casolanes", amount: 8, unit: "unitats", category: "meat" },
  { keywords: ["hamburguesa", "hamburgueses", "burger"], name: "Hamburgueses casolanes", amount: 2, unit: "unitats", category: "meat" },
  { keywords: ["porc", "cerdo", "pork", "llom", "lomo"], name: "Llom de porc ibèric", amount: 300, unit: "g", category: "meat" },
  { keywords: ["botifarra", "butifarra", "sausage", "xistorra"], name: "Botifarra de pagès", amount: 2, unit: "unitats", category: "meat" },
  { keywords: ["pernil", "jamon", "jamón", "ham"], name: "Pernil ibèric o pernil dolç a daus", amount: 80, unit: "g", category: "meat" },
  { keywords: ["bacon", "cansalada", "panceta"], name: "Cansalada o bacon fumat a tires", amount: 80, unit: "g", category: "meat" },
  { keywords: ["tofu"], name: "Tofu ferm ecològic a daus", amount: 250, unit: "g", category: "meat" },

  // Dairy & Eggs
  { keywords: ["ou", "ous", "huevo", "huevos", "egg", "eggs"], name: "Ous frescos de gallines camperes (classe L)", amount: 4, unit: "unitats", category: "dairy" },
  { keywords: ["formatge", "queso", "cheese"], name: "Formatge semi-curat o parmesà ratllat", amount: 50, unit: "g", category: "dairy" },
  { keywords: ["parmesa", "parmesà", "parmesano", "parmesan"], name: "Formatge parmesà o Grana Padano ratllat", amount: 40, unit: "g", category: "dairy" },
  { keywords: ["mozzarella", "burrata"], name: "Mozzarella di bufala o fresca", amount: 125, unit: "g", category: "dairy" },
  { keywords: ["cabra", "rulo"], name: "Formatge de cabra rul·lo", amount: 80, unit: "g", category: "dairy" },
  { keywords: ["mantega", "mantequilla", "butter"], name: "Mantega artesana", amount: 25, unit: "g", category: "dairy" },
  { keywords: ["nata", "crema de leche", "cream"], name: "Nata líquida per cuinar", amount: 100, unit: "ml", category: "dairy" },
  { keywords: ["llet", "leche", "milk"], name: "Llet sencera o beguda vegetal", amount: 200, unit: "ml", category: "dairy" },
  { keywords: ["iogurt", "yogur", "yogurt"], name: "Iogurt grec natural sense sucre", amount: 150, unit: "g", category: "dairy" },

  // Grains, Pasta, Legumes & Pantry
  { keywords: ["arros", "arròs", "arroz", "rice"], name: "Arròs bomba o rodó del Delta", amount: 180, unit: "g", category: "pantry" },
  { keywords: ["risotto", "arborio", "carnaroli"], name: "Arròs especial risotto (Arborio o Carnaroli)", amount: 180, unit: "g", category: "pantry" },
  { keywords: ["basmati", "jazmin"], name: "Arròs basmati aromàtic", amount: 160, unit: "g", category: "pantry" },
  { keywords: ["pasta", "macarrons", "espaguetis", "espaghetti", "spaghetti", "penne", "tallarines", "tagliatelle"], name: "Pasta de sèmola de blat dur", amount: 180, unit: "g", category: "pantry" },
  { keywords: ["fideus", "fideos", "fideua", "fideuà"], name: "Fideus tradicionals", amount: 160, unit: "g", category: "pantry" },
  { keywords: ["llenties", "lentejas", "lentils"], name: "Llenties pardines cuites", amount: 350, unit: "g", category: "pantry" },
  { keywords: ["cigrons", "garbanzos", "chickpeas"], name: "Cigrons cuits de pot", amount: 350, unit: "g", category: "pantry" },
  { keywords: ["mongetes", "alubias", "beans", "fesols"], name: "Mongetes blanques cuites", amount: 350, unit: "g", category: "pantry" },
  { keywords: ["pesols", "pèsols", "guisantes", "peas"], name: "Pèsols fins tendres", amount: 150, unit: "g", category: "produce" },
  { keywords: ["quinoa"], name: "Quinoa rentada", amount: 150, unit: "g", category: "pantry" },
  { keywords: ["civada", "avena", "oats"], name: "Flocs de civada integrals", amount: 80, unit: "g", category: "pantry" },
  { keywords: ["pizza", "massa"], name: "Massa de pizza artesana estirada", amount: 1, unit: "unitat", category: "bakery" },
  { keywords: ["pa", "pan", "bread"], name: "Llesques de pa de pagès torrat", amount: 2, unit: "unitats", category: "bakery" },
  { keywords: ["tinta"], name: "Tinta de sípia o calamar", amount: 2, unit: "sobres", category: "pantry" },
  { keywords: ["brou de peix", "fumet", "pescado"], name: "Fumet de peix i marisc de roca", amount: 600, unit: "ml", category: "pantry" },
  { keywords: ["brou de pollastre", "caldo de pollo"], name: "Brou suau de pollastre casolà", amount: 600, unit: "ml", category: "pantry" },
  { keywords: ["brou de verdures", "caldo de verduras"], name: "Brou vegetal aromàtic", amount: 600, unit: "ml", category: "pantry" },
  { keywords: ["curri", "curry"], name: "Curri suau en pols", amount: 1, unit: "culleradeta", category: "pantry" },
  { keywords: ["soja"], name: "Salsa de soja baixa en sal", amount: 20, unit: "ml", category: "pantry" },
  { keywords: ["nous", "nueces", "walnuts"], name: "Nous pelades", amount: 30, unit: "g", category: "pantry" },
  { keywords: ["ametlles", "almendras"], name: "Ametlles torrades o laminades", amount: 30, unit: "g", category: "pantry" },
  { keywords: ["orenga", "oregano", "orégano"], name: "Orenga seca aromàtica", amount: 1, unit: "culleradeta", category: "pantry" },
];

function cleanTitle(prompt: string): string {
  let cleaned = prompt.trim();

  // Remove common prefixes
  cleaned = cleaned.replace(
    /^(?:vull\s+(?:fer|cuinar|menjar|preparar|prendre)|m['’]agradaria\s+(?:fer|cuinar|menjar|preparar)|fes(?:-me)?\s+(?:una?\s+)?(?:recepta\s+de\s+|un\s+plat\s+de\s+)?|prepara(?:-me)?\s+(?:una?\s+)?|com\s+(?:es\s+fa|fer|cuinar|preparar)|recepta\s+(?:de\s+|d['’]|per\s+a\s+)?|vull\s+|com\s+|quiero\s+(?:hacer|cocinar|comer|preparar)|hazme\s+(?:una\s+)?(?:receta\s+de\s+)?|receta\s+(?:de\s+|para\s+)?|como\s+(?:hacer|cocinar|preparar)|recipe\s+for\s+|how\s+to\s+(?:make|cook)|cook\s+me\s+a\s+)\s*/i,
    ""
  );

  // Remove trailing details
  cleaned = cleaned.replace(
    /(?:\s+(?:per\s+(?:a\s+)?(?:sopar|dinar|esmorzar|berenar|menjar)|ràpid[a-z]*|fàcil[a-z]*|casol[a-z]*|saludable|si\s+us\s+plau|por\s+favor|para\s+(?:cenar|comer|desayunar)|per\s+a\s+\d+\s+persones|para\s+\d+\s+personas))+$|[.!?]+$/i,
    ""
  );

  // Strip leading articles like "un", "una", "uns", "unes", "el", "la", "els", "les"
  cleaned = cleaned.replace(/^(?:un|una|uns|unes|el|la|els|les)\s+/i, "");

  if (cleaned.length < 3) {
    return prompt.trim().charAt(0).toUpperCase() + prompt.trim().slice(1);
  }

  // Capitalize first character
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function detectArchetype(text: string): "rice" | "pasta" | "eggs" | "fish" | "poultry" | "meat" | "soup" | "legumes" | "salad" | "pizza" | "breakfast" | "vegetable" | "general" {
  const t = text.toLowerCase();

  if (/\b(?:arros|arròs|arroz|paella|risotto|fideua|fideuà)\b/.test(t)) return "rice";
  if (/\b(?:pasta|macarrons|espaguetis|espaghetti|spaghetti|tallarines|fideus|lasanya|canelons|tagliatelle|penne|ravioli)\b/.test(t)) return "pasta";
  if (/\b(?:truita|tortilla|ous|ou|frittata|remenat)\b/.test(t)) return "eggs";
  if (/\b(?:salmo|salmó|salmon|lluc|lluç|merluza|bacalla|bacallà|bacalao|sipia|sípia|sepia|calamar|calamars|gamba|gambes|tonyina|atun|marisc|peix|pescado|dorada|daurada|llobarro|lubina|pop|pulpo)\b/.test(t)) return "fish";
  if (/\b(?:pollastre|pollo|chicken|gall dindi|pavo|turkey|aletes|cuixes)\b/.test(t)) return "poultry";
  if (/\b(?:vedella|ternera|carn picada|carne picada|porc|cerdo|mandonguilles|albondigas|hamburguesa|burger|botifarra|costelles|llom)\b/.test(t)) return "meat";
  if (/\b(?:crema|sopa|pure|puré|caldo|brou|escudella|gaspatxo|gazpacho|salmorejo)\b/.test(t)) return "soup";
  if (/\b(?:llenties|lentejas|cigrons|garbanzos|mongetes|alubias|estofat|guisat|faves)\b/.test(t)) return "legumes";
  if (/\b(?:amanida|ensalada|salad|bowl|poke|carpaccio|tartar|tàrtar)\b/.test(t)) return "salad";
  if (/\b(?:pizza|focaccia|coca|empanada|quiche)\b/.test(t)) return "pizza";
  if (/\b(?:pancake|pancakes|crep|creps|tortitas|civada|avena|porridge|smoothie|batut|pastis|pastís|bizcocho|galetes|galletas)\b/.test(t)) return "breakfast";
  if (/\b(?:escalivada|samfaina|pisto|wok|saltat|verdures|verdura)\b/.test(t)) return "vegetable";

  return "general";
}

function generateCulinaryTitle(prompt: string, archetype: string): string {
  const lower = prompt.toLowerCase();

  switch (archetype) {
    case "rice":
      if (lower.includes("negre") || lower.includes("negro") || lower.includes("tinta")) {
        return "Arròs negre de la costa amb calamar i allioli";
      }
      if (lower.includes("risotto") || lower.includes("ceps") || lower.includes("bolet") || lower.includes("setas")) {
        return "Risotto cremós de bolets de temporada amb parmesà";
      }
      if (lower.includes("marisc") || lower.includes("marisco") || lower.includes("gamba") || lower.includes("peix")) {
        return "Arròs mariner tradicional amb marisc fresc";
      }
      if (lower.includes("pollastre") || lower.includes("pollo") || lower.includes("carn")) {
        return "Arròs melós de camp amb pollastre i verdures";
      }
      return "Arròs tradicional de la casa amb sofregit de l'horta";

    case "pasta":
      if (lower.includes("bolonyesa") || lower.includes("boloñesa") || lower.includes("bolognese") || lower.includes("carn")) {
        return "Macarrons tradicionals amb sofregit de carn a la bolonyesa";
      }
      if (lower.includes("tonyina") || lower.includes("atun") || lower.includes("atún")) {
        return "Pasta mediterrània amb tomàquet casolà i tonyina";
      }
      if (lower.includes("carbonara") || lower.includes("formatge") || lower.includes("queso")) {
        return "Tallarines cremoses amb salsa suau de formatges fins";
      }
      if (lower.includes("pesto")) {
        return "Espaguetis al pesto genovès amb pinyons torrats";
      }
      return "Pasta casolana amb salsa de tomàquet i herbes fresques";

    case "fish":
      if (lower.includes("salmo") || lower.includes("salmó") || lower.includes("salmon")) {
        return "Suprema de salmó a la planxa amb llimona i anet fresc";
      }
      if (lower.includes("bacalla") || lower.includes("bacallà") || lower.includes("bacalao")) {
        return "Bacallà confitat sobre llit de patates i pebrots";
      }
      if (lower.includes("lluc") || lower.includes("lluç") || lower.includes("merluza")) {
        return "Filet de lluç a la planxa amb all i julivert fresc";
      }
      if (lower.includes("sipia") || lower.includes("sípia") || lower.includes("calamar") || lower.includes("sepia")) {
        return "Sípia estofada amb pèsols i picada catalana";
      }
      return "Peix de llotja al forn amb guarnició de verdures de temporada";

    case "poultry":
      return "Pit de pollastre marinat a les herbes aromàtiques amb guarnició";

    case "meat":
      if (lower.includes("hamburguesa") || lower.includes("burger")) {
        return "Hamburguesa gourmet de vedella amb formatge fos i ceba";
      }
      if (lower.includes("mandonguilles") || lower.includes("albondigas")) {
        return "Mandonguilles casolanes amb salsa de tomàquet i pèsols";
      }
      return "Saltat tendre de carn amb verdures de l'horta";

    case "eggs":
      if (lower.includes("patata") || lower.includes("patates") || lower.includes("patatas")) {
        return "Truita de patates tradicional ben suculenta";
      }
      return "Remenat cremós d'ous de pagès amb verdures fresques";

    case "soup":
      if (lower.includes("gaspatxo") || lower.includes("gazpacho")) {
        return "Gaspatxo andalús tradicional ben fresc";
      }
      return "Crema suau de verdures de temporada amb crostons cruixents";

    case "legumes":
      if (lower.includes("llenties") || lower.includes("lentejas")) {
        return "Estofat casolà de llenties pardines amb verdures";
      }
      if (lower.includes("cigrons") || lower.includes("garbanzos")) {
        return "Cigrons saltats a la catalana amb espinacs";
      }
      return "Guisat tradicional de llegums amb sofregit";

    case "salad":
      return "Amanida fresca de temporada amb vinagreta d'oli d'oliva verge";

    case "pizza":
      return "Pizza artesana cruixent amb tomàquet natural i mozzarella";

    case "breakfast":
      return "Bol energètic de civada amb fruita fresca i llavors";

    case "vegetable":
      return "Wok de verdures fresques saltejades amb oli d'oliva i soja";

    default: {
      const cleaned = cleanTitle(prompt);
      if (cleaned.length > 0 && cleaned.length < 35 && !/\b(?:vull|algo|cosa|recepta|idea|menjar|fer)\b/i.test(cleaned)) {
        return `${cleaned} a l'estil mediterrani`;
      }
      return "Plat casolà mediterrani de temporada";
    }
  }
}

export function generateSmartRecipeFromPrompt(params: {
  mealType?: MealType;
  day?: DayOfWeek;
  dietaryPreference?: DietaryPreference;
  notes?: string;
  dishName?: string;
  servings?: number;
  maxTimeMinutes?: number;
  includeIngredients?: string[];
  excludeIngredients?: string[];
}): Recipe {
  const prompt = params.dishName?.trim() || params.notes?.trim() || "Recepta casolana mediterrània";
  const archetype = detectArchetype(`${prompt} ${params.notes || ""}`);
  const title = generateCulinaryTitle(prompt, archetype);
  const lower = `${title} ${prompt} ${params.notes || ""} ${params.includeIngredients?.join(" ") || ""}`.toLowerCase();
  const servings = params.servings || 2;
  const ratio = servings / 2;

  // Extract explicit ingredients from catalog
  const matchedDefs: KnownIngredientDef[] = [];
  for (const def of KNOWN_INGREDIENTS) {
    // Check if ingredient is excluded
    if (params.excludeIngredients?.some((ex) => ex.trim() && def.keywords.some((kw) => ex.toLowerCase().includes(kw)))) {
      continue;
    }
    if (def.keywords.some((kw) => lower.includes(kw))) {
      matchedDefs.push(def);
    }
  }

  // Also include any custom ingredients specified in includeIngredients
  if (params.includeIngredients) {
    for (const inc of params.includeIngredients) {
      if (inc.trim() && !matchedDefs.some((d) => d.name.toLowerCase().includes(inc.toLowerCase()))) {
        matchedDefs.push({
          name: inc.trim(),
          amount: Math.round(100 * ratio),
          unit: "g",
          category: "produce",
          keywords: [inc.toLowerCase().trim()],
        });
      }
    }
  }

  // Ensure base ingredients according to archetype
  if (archetype === "rice" && !matchedDefs.some((d) => d.keywords.includes("arros"))) {
    matchedDefs.unshift(KNOWN_INGREDIENTS.find((d) => d.keywords.includes("arros"))!);
  }
  if (archetype === "pasta" && !matchedDefs.some((d) => d.keywords.includes("pasta"))) {
    matchedDefs.unshift(KNOWN_INGREDIENTS.find((d) => d.keywords.includes("pasta"))!);
  }
  if (archetype === "eggs" && !matchedDefs.some((d) => d.keywords.includes("ou"))) {
    matchedDefs.unshift(KNOWN_INGREDIENTS.find((d) => d.keywords.includes("ou"))!);
  }
  if (archetype === "pizza" && !matchedDefs.some((d) => d.keywords.includes("pizza"))) {
    matchedDefs.unshift(KNOWN_INGREDIENTS.find((d) => d.keywords.includes("pizza"))!);
  }
  if (archetype === "soup" && !matchedDefs.some((d) => d.keywords.includes("ceba"))) {
    matchedDefs.push(KNOWN_INGREDIENTS.find((d) => d.keywords.includes("ceba"))!);
  }

  // If black rice was asked for, add tinta and fish broth if missing
  if (lower.includes("negre") || lower.includes("negro") || lower.includes("tinta")) {
    if (!matchedDefs.some((d) => d.keywords.includes("tinta"))) {
      matchedDefs.push(KNOWN_INGREDIENTS.find((d) => d.keywords.includes("tinta"))!);
    }
    if (!matchedDefs.some((d) => d.keywords.includes("brou de peix"))) {
      matchedDefs.push(KNOWN_INGREDIENTS.find((d) => d.keywords.includes("brou de peix"))!);
    }
  }

  // Always ensure aromatic base (onion/garlic/olive oil) if appropriate
  const baseIngredients: Ingredient[] = [];

  // Add extracted ingredients
  matchedDefs.forEach((def, idx) => {
    baseIngredients.push({
      id: `ing-${idx}-${Date.now()}`,
      name: def.name,
      amount: Math.max(1, Math.round(def.amount * ratio)),
      unit: def.unit,
      category: def.category,
    });
  });

  // Always append olive oil & salt if not present
  baseIngredients.push({
    id: `ing-oil-${Date.now()}`,
    name: "Oli d'oliva verge extra",
    amount: 30,
    unit: "ml",
    category: "pantry",
  });
  baseIngredients.push({
    id: `ing-salt-${Date.now()}`,
    name: "Sal marina i pebre negre",
    amount: 1,
    unit: "pessic",
    category: "pantry",
  });

  // Generate customized instructions and nutritional info
  let prepTimeMinutes = 10;
  let cookTimeMinutes = 15;
  let calories = 480;
  let protein = 25;
  let carbs = 45;
  let fat = 18;
  let instructions: string[] = [];
  let tags = ["Casolà", "Equilibrat"];

  switch (archetype) {
    case "rice":
      prepTimeMinutes = 12;
      cookTimeMinutes = 25;
      calories = 540;
      protein = 22;
      carbs = 72;
      fat = 14;
      tags = ["Arròs", "Tradicional", "Mediterrani"];
      instructions = [
        `Preparar i picar ben fins els vegetals i netejar els ingredients principals (${title}).`,
        "En una paella ampla o cassola de ferro colat, escalfar l'oli d'oliva verge extra i enrossir els ingredients principals a foc viu durant 4-5 minuts. Retirar o reservar a la vora.",
        "A la mateixa cassola, sofregir la ceba picada i els alls a foc molt lent fins que estiguin ben caramel·litzats i foscos.",
        "Afegir l'arròs i nacarar-lo (remenar-lo durant 1-2 minuts amb el sofregit perquè s'impregni bé de tot el sabor).",
        "Abocar el brou ben calent (i la tinta si escau) i coure a foc fort durant els primers 8 minuts. Després abaixar a foc suau durant 8-10 minuts més.",
        "Apagar el foc, tapar la cassola amb un drap net i deixar reposar durant 3-5 minuts abans de servir a taula."
      ];
      break;

    case "pasta":
      prepTimeMinutes = 8;
      cookTimeMinutes = 14;
      calories = 520;
      protein = 20;
      carbs = 70;
      fat = 15;
      tags = ["Pasta", "Fàcil", "Ràpid"];
      instructions = [
        "Posar una olla gran amb abundant aigua i un pessic generós de sal a bullir.",
        "Quan l'aigua arrenqui el bull, introduir la pasta i coure el temps exacte indicat pel fabricant per deixar-la al dente.",
        "Mentrestant, en una paella fonda amb un bon raig d'oli d'oliva, saltar els ingredients del plat a foc mitjà.",
        "Escórrer la pasta reservant un mig got de l'aigua de cocció rica en midó.",
        "Abocar la pasta directa a la paella amb la salsa, afegir un parell de cullerades de l'aigua de cocció i remenar enèrgicament durant 1 minut perquè quedi ben integrada i melosa.",
        "Servir immediatament ben calent amb un toc de pebre negre i formatge ratllat al gust."
      ];
      break;

    case "eggs":
      prepTimeMinutes = 10;
      cookTimeMinutes = 15;
      calories = 430;
      protein = 24;
      carbs = 22;
      fat = 26;
      tags = ["Ous", "Truita", "Proteïna"];
      instructions = [
        "Pelar i tallar els ingredients sòlids (com patates, ceba o verdures) a làmines o daus fins i regulars.",
        "En una paella antiadherent amb oli d'oliva, coure els vegetals a foc moderat fins que estiguin tendres i lleugerament daurats. Escórrer l'excés d'oli.",
        "En un bol gran, batre els ous amb un pessic de sal fins que quedin ben escumosos.",
        "Abocar els ingredients cuits al bol amb els ous batuts i deixar reposar la mescla 2-3 minuts perquè agafi cos.",
        "Escalfar la paella amb unes gotes d'oli i abocar-hi tota la mescla. Quallar a foc mitjà durant 2-3 minuts.",
        "Girar la truita amb l'ajuda d'un plat pla o una tapadora i coure per l'altra banda 1-2 minuts segons el punt desitjat (sucosa o ben quallada).",
        "Servir temperada o calenta acompanyada de pa amb tomàquet."
      ];
      break;

    case "fish":
      prepTimeMinutes = 10;
      cookTimeMinutes = 16;
      calories = 460;
      protein = 36;
      carbs = 18;
      fat = 22;
      tags = ["Peix", "Omega 3", "Lleuger"];
      instructions = [
        "Assecar bé els filets o peces de peix amb paper de cuina i amanir amb sal marina, pebre negre i un fil d'oli d'oliva.",
        "Tallar les guarnicions (patates, verduretes o all i julivert) al gust.",
        "Si es fa al forn: preescalfar a 190°C i enfornar durant 14-16 minuts fins que el peix estigui en el seu punt òptim de cocció, sucós per dins.",
        "Si es fa a la planxa: escalfar la paella a foc viu i daurar la peça 3 minuts per la banda de la pell fins que quedi cruixent, girar i coure 2 minuts més.",
        "Emplatar acompanyat de les verdures, regar amb els seus sucs de cocció i un toc de llimona fresca."
      ];
      break;

    case "poultry":
    case "meat":
      prepTimeMinutes = 10;
      cookTimeMinutes = 18;
      calories = 490;
      protein = 38;
      carbs = 20;
      fat = 22;
      tags = ["Carn", "Proteïna", "Plat Principal"];
      instructions = [
        "Netejar la carn i tallar-la a la mida desitjada (tires, daus o filets regulars). Salpebrar al gust.",
        "Picar la ceba, els alls i les verdures d'acompanyament.",
        "En una paella o cassola amb oli d'oliva verge extra, daurar la carn a foc viu per segellar els sucs. Retirar i reservar.",
        "A la mateixa cassola, sofregir les verdures a foc mitjà fins que estiguin tendres i dolces.",
        "Reincorporar la carn, afegir les herbes aromàtiques (romaní, farigola o espècies) i deixar que s'acabi de coure tot junt durant 5-8 minuts perquè s'integrin els sabors.",
        "Rectificar de sal i servir ben calent."
      ];
      break;

    case "soup":
      prepTimeMinutes = 10;
      cookTimeMinutes = 22;
      calories = 340;
      protein = 12;
      carbs = 38;
      fat = 12;
      tags = ["Cullera", "Reconfortant", "Vegetals"];
      instructions = [
        "Rentar, pelar i trossejar totes les verdures a trossos homogenis.",
        "En una olla fonda amb un raig d'oli d'oliva verge, sofregir la ceba o porro durant 5 minuts per extreure'n la dolçor natural.",
        "Afegir la resta de vegetals i cobrir just amb aigua calenta o brou de verdures.",
        "Tapar i coure a foc mitjà durant 18-20 minuts fins que totes les verdures estiguin ben toves en punxar-les.",
        "Triturar amb la batedora a màxima potència durant 2 minuts fins a aconseguir una textura ultra fina, cremosa i vellutada.",
        "Tastar, rectificar de sal i servir amb un fil d'oli d'oliva verge extra i llavors o crostons cruixents per sobre."
      ];
      break;

    case "legumes":
      prepTimeMinutes = 8;
      cookTimeMinutes = 16;
      calories = 440;
      protein = 24;
      carbs = 58;
      fat = 10;
      tags = ["Llegums", "Fibra", "Saludable"];
      instructions = [
        "Esbandir bé els llegums cuits sota l'aixeta amb aigua freda i escórrer-los.",
        "En una cassola amb oli d'oliva, enrossir l'all picat, la ceba i la resta d'ingredients aromàtics a foc suau.",
        "Incorporar els llegums i remenar delicadament per evitar que es trenquin.",
        "Afegir un cullerot de brou suau o salsa de tomàquet i coure a foc lent durant 8-10 minuts perquè absorbeixin tots els sabors.",
        "Empolsar amb julivert fresc o pebre vermell i servir ben calent."
      ];
      break;

    case "salad":
      prepTimeMinutes = 15;
      cookTimeMinutes = 0;
      calories = 380;
      protein = 18;
      carbs = 24;
      fat = 22;
      tags = ["Amanida", "Fresca", "Sense Cocció"];
      instructions = [
        "Rentar i escórrer molt bé les fulles verdes i vegetals frescos perquè no aigualin el plat.",
        "Disposar la base d'enciam o brots en un bol o safata ampla.",
        "Distribuir per sobre de manera harmoniosa la resta d'ingredients tallats a daus o làmines.",
        "Preparar la vinagreta en un pot petit barrejant 3 parts d'oli d'oliva verge extra, 1 part de vinagre o suc de llimona, sal i pebre.",
        "Amanir just abans de servir a taula i remenar suaument."
      ];
      break;

    case "pizza":
      prepTimeMinutes = 15;
      cookTimeMinutes = 15;
      calories = 620;
      protein = 26;
      carbs = 78;
      fat = 20;
      tags = ["Pizza", "Forn", "Casolà"];
      instructions = [
        "Preescalfar el forn a la màxima potència (220°C - 250°C) amb la safata dins.",
        "Estirar la massa de pizza sobre paper de forn fins a deixar-la fina.",
        "Estendre una capa uniforme de salsa de tomàquet i formatge mozzarella ratllat.",
        "Distribuir els ingredients triats per tota la superfície sense sobrecarregar la massa.",
        "Enfornar sobre la safata calenta durant 10-14 minuts fins que les vores estiguin ben daurades i cruixents i el formatge bombollegi.",
        "Acabar amb un toc d'orenga fresca i unes gotes d'oli d'oliva verge extra abans de tallar."
      ];
      break;

    case "breakfast":
      prepTimeMinutes = 8;
      cookTimeMinutes = 8;
      calories = 360;
      protein = 16;
      carbs = 48;
      fat = 10;
      tags = ["Esmorzar", "Energètic", "Ràpid"];
      instructions = [
        "Barrejar els ingredients principals en un bol fins a obtenir una consistència homogènia.",
        "Si requereix cocció (com pancakes o civada): coure a foc mitjà en una paella antiadherent amb una mica de mantega o oli durant uns minuts per banda.",
        "Servir acompanyat de fruita fresca trossejada, fruits secs o una culleradeta de mel.",
        "Gaudir acompanyat d'un cafè, te o beguda vegetal."
      ];
      break;

    default:
      prepTimeMinutes = 10;
      cookTimeMinutes = 15;
      calories = 450;
      protein = 25;
      carbs = 40;
      fat = 16;
      tags = ["Casolà", "Fàcil"];
      instructions = [
        "Netejar i tallar tots els ingredients a trossos regulars per garantir una cocció uniforme.",
        "Escalfar una paella o cassola amb un raig d'oli d'oliva verge extra.",
        "Afegir primer els ingredients que requereixen més cocció i sofregir a foc mitjà.",
        "Incorporar la resta d'elements i amanir amb sal, pebre i herbes al gust.",
        "Coure fins que tot estigui tendre, sucós i ben integrat.",
        "Servir acabat de fer a taula."
      ];
      break;
  }

  const dietaryPreference = params.dietaryPreference || "mediterranean";

  return {
    id: `rec-smart-${Date.now()}`,
    title,
    description: `Deliciosa recepta de ${title.toLowerCase()}, preparada pas a pas amb ingredients frescos de qualitat i equilibrada nutricionalment.`,
    prepTimeMinutes,
    cookTimeMinutes,
    servings: servings,
    calories,
    nutrition: {
      calories,
      protein,
      carbs,
      fat,
    },
    tags,
    dietaryTags: [dietaryPreference],
    source: "ai",
    ingredients: baseIngredients,
    instructions,
  };
}

export function generateSmartPantryRecipes(params: {
  pantryItems: string[];
  dietaryPreference?: string;
}): Recipe[] {
  const items = params.pantryItems.map((i) => i.trim()).filter(Boolean);
  if (items.length === 0) return [];

  const mainItem = items[0];
  const secondaryItem = items[1] || items[0];
  const thirdItem = items[2] || "verdures";

  const prompt1 = `${mainItem} amb ${secondaryItem}`;
  const prompt2 = `Saltat de ${items.slice(0, 3).join(" i ")}`;
  const prompt3 = `Crema suau o plat ràpid de ${thirdItem}`;

  return [
    generateSmartRecipeFromPrompt({ notes: prompt1, dietaryPreference: (params.dietaryPreference as DietaryPreference) || "mediterranean" }),
    generateSmartRecipeFromPrompt({ notes: prompt2, dietaryPreference: (params.dietaryPreference as DietaryPreference) || "mediterranean" }),
    generateSmartRecipeFromPrompt({ notes: prompt3, dietaryPreference: (params.dietaryPreference as DietaryPreference) || "mediterranean" }),
  ];
}

