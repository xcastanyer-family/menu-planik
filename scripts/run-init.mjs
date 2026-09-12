import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE credentials");
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey);

// Curated recipes with food types, emojis, and complexity
const RECIPES = [
  {
    title: "Pasta Integral amb Pesto de Carbassó i Nous",
    description: "Un primer plat cremós, lleuger i ric en greixos saludables, a punt en només 15 minuts.",
    prep_time_minutes: 10,
    cook_time_minutes: 10,
    servings: 2,
    calories: 480,
    nutrition: { calories: 480, protein: 16, carbs: 64, fat: 18, fiber: 7 },
    tags: ["Primers", "Ràpid", "Vegetarià", "Saludable"],
    dietary_tags: ["vegetarian", "mediterranean"],
    source: "curated",
    difficulty: "easy",
    ingredients: [
      { id: "ing-1", name: "Pasta integral (plomes o espirals)", amount: 160, unit: "g", category: "pantry" },
      { id: "ing-2", name: "Carbassons frescos", amount: 2, unit: "unitats", category: "produce" },
      { id: "ing-3", name: "Nous pelades del país", amount: 30, unit: "g", category: "pantry" },
      { id: "ing-4", name: "Formatge Parmesà ratllat", amount: 25, unit: "g", category: "dairy" },
      { id: "ing-5", name: "Oli d'oliva verge extra", amount: 15, unit: "ml", category: "pantry" },
      { id: "ing-6", name: "Fulles d'alfàbrega fresca", amount: 8, unit: "fulles", category: "produce" },
      { id: "ing-7", name: "Gra d'all", amount: 1, unit: "gra", category: "produce" }
    ],
    instructions: [
      "Posa a bullir una olla amb abundant aigua i sal i cou la pasta al dente.",
      "Renta els carbassons, talla'ls a rodanxes i salta'ls 3 minuts a la paella amb un raig d'oli i el gra d'all.",
      "Tritura els carbassons amb les nous, el formatge parmesà, l'alfàbrega i un cullerot d'aigua de cocció de la pasta.",
      "Escorre la pasta i barreja-la amb el pesto de carbassó fora del foc. Serveix amb nous picades per sobre."
    ]
  },
  {
    title: "Salmó al Forn amb Espàrrecs Verds i Llimona",
    description: "Filet de salmó sucós i daurat rostit amb herbes aromàtiques i espàrrecs cruixents.",
    prep_time_minutes: 8,
    cook_time_minutes: 15,
    servings: 2,
    calories: 520,
    nutrition: { calories: 520, protein: 42, carbs: 8, fat: 34, fiber: 4 },
    tags: ["Segons", "Peix", "Low-Carb", "Keto", "Alt en Proteïna"],
    dietary_tags: ["pescatarian", "keto", "low-carb", "gluten-free", "mediterranean"],
    source: "curated",
    difficulty: "easy",
    ingredients: [
      { id: "ing-8", name: "Filets de salmó fresc", amount: 350, unit: "g", category: "meat" },
      { id: "ing-9", name: "Espàrrecs verds frescos", amount: 300, unit: "g", category: "produce" },
      { id: "ing-10", name: "Llimona ecològica", amount: 1, unit: "unitat", category: "produce" },
      { id: "ing-11", name: "Oli d'oliva verge extra", amount: 15, unit: "ml", category: "pantry" },
      { id: "ing-12", name: "Anet o farigola fresca", amount: 1, unit: "branqueta", category: "produce" },
      { id: "ing-13", name: "Sal marina i pebre negre", amount: 1, unit: "pessic", category: "pantry" }
    ],
    instructions: [
      "Escalfa el forn a 190°C.",
      "Neteja els espàrrecs traient la part llenyosa i col·loca'ls en una safata amb paper de forn.",
      "Col·loca els filets de salmó al costat dels espàrrecs, amaneix amb oli, suc de mitja llimona, sal, pebre i herbes.",
      "Posa rodanxes de llimona sobre el salmó i enforna durant 14-16 minuts fins que estigui al punt."
    ]
  },
  {
    title: "Bowl Proteic amb Pollastre a la Planxa, Quinoa i Alvocat",
    description: "Plat únic complet, colorit i energètic, ideal també per emportar com a carmanyola a la feina.",
    prep_time_minutes: 15,
    cook_time_minutes: 15,
    servings: 2,
    calories: 560,
    nutrition: { calories: 560, protein: 46, carbs: 52, fat: 20, fiber: 9 },
    tags: ["Plat Únic", "Fitness", "Meal Prep", "Alt en Proteïna"],
    dietary_tags: ["gluten-free", "mediterranean"],
    source: "curated",
    difficulty: "easy",
    ingredients: [
      { id: "ing-14", name: "Pit de pollastre de pagès", amount: 300, unit: "g", category: "meat" },
      { id: "ing-15", name: "Quinoa", amount: 120, unit: "g", category: "pantry" },
      { id: "ing-16", name: "Alvocat madur", amount: 1, unit: "unitat", category: "produce" },
      { id: "ing-17", name: "Tomàquets cirerols (cherry)", amount: 150, unit: "g", category: "produce" },
      { id: "ing-18", name: "Espinacs baby frescos", amount: 80, unit: "g", category: "produce" },
      { id: "ing-19", name: "Llima o llimona", amount: 1, unit: "unitat", category: "produce" },
      { id: "ing-20", name: "Llavors de sèsam torrat", amount: 10, unit: "g", category: "pantry" }
    ],
    instructions: [
      "Esbandeix la quinoa i cou-la en 240ml d'aigua amb un pessic de sal durant 12 minuts; deixa-la refredar.",
      "Fes el pit de pollastre a la planxa amb espècies (pebre vermell dolç, orenga, sal) 4-5 minuts per banda i talla'l a tires.",
      "Talla l'alvocat a daus i els tomàquets cirerols per la meitat.",
      "Munta els bols amb una base d'espinacs i quinoa, afegeix el pollastre, l'alvocat, els tomàquets i acaba amb sèsam i suc de llima."
    ]
  },
  {
    title: "Porridge Cremós de Civada amb Fruits del Bosc i Mantega de Cacauet",
    description: "L'esmorzar ideal per començar el dia amb energia d'alliberament lent i màxima sacietat.",
    prep_time_minutes: 3,
    cook_time_minutes: 5,
    servings: 1,
    calories: 380,
    nutrition: { calories: 380, protein: 14, carbs: 54, fat: 12, fiber: 8 },
    tags: ["Esmorzar", "Dolç Saludable", "Ràpid", "Vegetarià"],
    dietary_tags: ["vegetarian", "vegan", "dairy-free"],
    source: "curated",
    difficulty: "easy",
    ingredients: [
      { id: "ing-21", name: "Flocs de civada integrals", amount: 50, unit: "g", category: "pantry" },
      { id: "ing-22", name: "Beguda de civada o ametlla", amount: 180, unit: "ml", category: "dairy" },
      { id: "ing-23", name: "Nabius o gerds frescos", amount: 60, unit: "g", category: "produce" },
      { id: "ing-24", name: "Mantega de cacauet 100%", amount: 15, unit: "g", category: "pantry" },
      { id: "ing-25", name: "Canyella de Ceilan en pols", amount: 1, unit: "pessic", category: "pantry" },
      { id: "ing-26", name: "Mel pura o xarop d'atzavara", amount: 10, unit: "ml", category: "pantry" }
    ],
    instructions: [
      "En un cassó petit, aboca els flocs de civada amb la beguda vegetal i un pessic de canyella.",
      "Cou a foc mitjà remenant sense parar durant 4-5 minuts fins a obtenir una textura espessa i cremosa.",
      "Serveix en un bol i decora amb fruits del bosc frescos, una cullerada de mantega de cacauet i un fil de mel."
    ]
  },
  {
    title: "Truita Esponjosa d'Espinacs, Mató Fresc i Cúrcuma",
    description: "Sopar ràpid, nutritiu i lleuger, molt ric en proteïna d'alt valor biològic i ferro.",
    prep_time_minutes: 7,
    cook_time_minutes: 10,
    servings: 2,
    calories: 320,
    nutrition: { calories: 320, protein: 24, carbs: 5, fat: 22, fiber: 3 },
    tags: ["Segons", "Ous", "Vegetarià", "Low-Carb", "Keto"],
    dietary_tags: ["vegetarian", "keto", "low-carb", "gluten-free", "mediterranean"],
    source: "curated",
    difficulty: "easy",
    ingredients: [
      { id: "ing-27", name: "Ous frescos ecològics", amount: 4, unit: "ous", category: "dairy" },
      { id: "ing-28", name: "Mató fresc de llet de vaca", amount: 100, unit: "g", category: "dairy" },
      { id: "ing-29", name: "Espinacs frescos de fulla tendra", amount: 150, unit: "g", category: "produce" },
      { id: "ing-30", name: "Oli d'oliva verge extra", amount: 10, unit: "ml", category: "pantry" },
      { id: "ing-31", name: "Cúrcuma en pols", amount: 1, unit: "culleradeta", category: "pantry" },
      { id: "ing-32", name: "Sal marina i nou moscada", amount: 1, unit: "pessic", category: "pantry" }
    ],
    instructions: [
      "Salteja els espinacs en una paella antiadherent durant 2 minuts amb una mica d'oli i escorre'ls bé.",
      "En un bol bat els ous amb un pessic de sal, cúrcuma i una mica de nou moscada.",
      "Afegeix els espinacs i cullerades de mató fresc sense remenar excessivament.",
      "Cuina a la paella tapada a foc suau durant 6-8 minuts, tombant-la a mitja cocció fins que qualli."
    ]
  },
  {
    title: "Curri Cremós de Cigrons i Llet de Coco amb Arròs Basmati",
    description: "Plat vegà calent, especiat i reconfortant, perfumat amb gingebre fresc i coriandre.",
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    servings: 3,
    calories: 510,
    nutrition: { calories: 510, protein: 15, carbs: 70, fat: 19, fiber: 11 },
    tags: ["Primers", "Plat Únic", "Vegà", "Especiat", "Confort Food"],
    dietary_tags: ["vegan", "vegetarian", "dairy-free", "gluten-free"],
    source: "curated",
    difficulty: "easy",
    ingredients: [
      { id: "ing-33", name: "Cigrons cuits de pot", amount: 400, unit: "g", category: "pantry" },
      { id: "ing-34", name: "Llet de coco en llauna", amount: 250, unit: "ml", category: "pantry" },
      { id: "ing-35", name: "Tomàquet triturat natural", amount: 150, unit: "g", category: "pantry" },
      { id: "ing-36", name: "Arròs Basmati aromàtic", amount: 180, unit: "g", category: "pantry" },
      { id: "ing-37", name: "Ceba de Figueres", amount: 1, unit: "unitat", category: "produce" },
      { id: "ing-38", name: "Curri dolç i Garam Masala", amount: 2, unit: "cullerades", category: "pantry" },
      { id: "ing-39", name: "Gingebre fresc ratllat", amount: 10, unit: "g", category: "produce" }
    ],
    instructions: [
      "Cou l'arròs basmati en aigua bullent amb sal durant 10-12 minuts fins que quedi solt.",
      "En una cassola, sofregeix la ceba i el gingebre picats amb les espècies durant 2 minuts.",
      "Afegeix el tomàquet, els cigrons esbandits i la llet de coco. Deixa fer xup-xup durant 15 minuts a foc lent.",
      "Serveix el curri ben calent sobre una base d'arròs basmati amb coriandre o julivert picat per sobre."
    ]
  },
  {
    title: "Torrada d'Alvocat amb Ou Poché i Llavors de Chia",
    description: "Un gran clàssic per al brunch o per a un esmorzar salat i ric en nutrients de màxima qualitat.",
    prep_time_minutes: 5,
    cook_time_minutes: 5,
    servings: 1,
    calories: 340,
    nutrition: { calories: 340, protein: 15, carbs: 28, fat: 19, fiber: 6 },
    tags: ["Esmorzar", "Brunch", "Ràpid", "Vegetarià"],
    dietary_tags: ["vegetarian", "mediterranean"],
    source: "curated",
    difficulty: "easy",
    ingredients: [
      { id: "ing-40", name: "Pa de sègol o de massa mare", amount: 2, unit: "llesques", category: "bakery" },
      { id: "ing-41", name: "Alvocat madur", amount: 0.5, unit: "unitat", category: "produce" },
      { id: "ing-42", name: "Ou fresc ecològic", amount: 1, unit: "ou", category: "dairy" },
      { id: "ing-43", name: "Flocs de bitxo (chili flakes)", amount: 1, unit: "pessic", category: "pantry" },
      { id: "ing-44", name: "Llavors de chia o sèsam", amount: 5, unit: "g", category: "pantry" },
      { id: "ing-45", name: "Suc de llimona", amount: 5, unit: "ml", category: "produce" }
    ],
    instructions: [
      "Torra les llesques de pa fins que estiguin ben daurades i cruixents.",
      "Aixafeu l'alvocat amb una forquilla juntament amb unes gotes de llimona, sal i pebre.",
      "Fes l'ou poché en aigua calenta amb una cullerada de vinagre durant 3 minuts, deixant el rovell líquid.",
      "Unta l'alvocat a la torrada, col·loca l'ou poché a sobre i empolsa amb llavors de chia i bitxo."
    ]
  },
  {
    title: "Filet d'Orada amb Tomàquets Cherry i Olives Negres",
    description: "Cocció tradicional mediterrània que ressalta la frescor i el sabor autèntic del peix fresc.",
    prep_time_minutes: 10,
    cook_time_minutes: 12,
    servings: 2,
    calories: 310,
    nutrition: { calories: 310, protein: 38, carbs: 6, fat: 14, fiber: 2 },
    tags: ["Segons", "Peix", "Mediterrani", "Tradició", "Lleuger"],
    dietary_tags: ["pescatarian", "mediterranean", "gluten-free", "low-carb"],
    source: "curated",
    difficulty: "medium",
    ingredients: [
      { id: "ing-46", name: "Filets d'orada fresca", amount: 350, unit: "g", category: "meat" },
      { id: "ing-47", name: "Tomàquets cirerols madurs", amount: 200, unit: "g", category: "produce" },
      { id: "ing-48", name: "Olives negres d'Aragó o Kalamata", amount: 30, unit: "g", category: "pantry" },
      { id: "ing-49", name: "Vi blanc sec", amount: 50, unit: "ml", category: "beverages" },
      { id: "ing-50", name: "Julivert fresc picat", amount: 1, unit: "manat", category: "produce" },
      { id: "ing-51", name: "Gra d'all", amount: 1, unit: "gra", category: "produce" }
    ],
    instructions: [
      "En una paella àmplia escalfa oli d'oliva amb el gra d'all picat i un toc de pebre.",
      "Afegeix els tomàquets tallats per la meitat i les olives, saltant durant 2 minuts.",
      "Afegeix el vi blanc, mig got d'aigua i col·loca els filets d'orada amb la pell cap amunt.",
      "Tapa i cou durant 8-10 minuts a foc mitjà. Serveix amb abundant julivert fresc picat."
    ]
  },
  {
    title: "Empedrat Tradicional de Mongetes del Ganxet amb Tonyina",
    description: "Amanida fresca tradicional catalana de llegums, molt rica en fibra i proteïna vegetal i de peix.",
    prep_time_minutes: 10,
    cook_time_minutes: 0,
    servings: 2,
    calories: 420,
    nutrition: { calories: 420, protein: 32, carbs: 45, fat: 12, fiber: 10 },
    tags: ["Primers", "Plat Únic", "Tradició", "Llegums", "Ràpid"],
    dietary_tags: ["pescatarian", "gluten-free", "mediterranean"],
    source: "curated",
    difficulty: "easy",
    ingredients: [
      { id: "ing-52", name: "Mongetes del Ganxet cuites", amount: 350, unit: "g", category: "pantry" },
      { id: "ing-53", name: "Tonyina en oli d'oliva", amount: 120, unit: "g", category: "pantry" },
      { id: "ing-54", name: "Tomàquet d'amanir madur", amount: 1, unit: "unitat", category: "produce" },
      { id: "ing-55", name: "Pebrot verd tendre", amount: 1, unit: "unitat", category: "produce" },
      { id: "ing-56", name: "Ceba tendra", amount: 0.5, unit: "unitat", category: "produce" },
      { id: "ing-57", name: "Olives negres mortes", amount: 25, unit: "g", category: "pantry" },
      { id: "ing-58", name: "Oli d'oliva verge extra i vinagre", amount: 20, unit: "ml", category: "pantry" }
    ],
    instructions: [
      "Esbandeix les mongetes cuites i escorre-les amb cura per no trencar-les.",
      "Pica el tomàquet, el pebrot verd i la ceba tendra a daus petits.",
      "En una amanidora, barreja les mongetes amb les verdures picades, la tonyina esmicolada i les olives negres.",
      "Amaneix amb un bon raig d'oli d'oliva verge extra, una mica de vinagre i sal marina. Serveix fresca."
    ]
  },
  {
    title: "Crema Suau de Carbassa i Gingebre amb Llavors Torrades",
    description: "Primer plat de cullera càlid, vellutat i molt reconfortant per a les nits de tardor i hivern.",
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    servings: 3,
    calories: 220,
    nutrition: { calories: 220, protein: 6, carbs: 32, fat: 8, fiber: 6 },
    tags: ["Primers", "Sopes i Cremes", "Vegà", "Lleuger", "Saludable"],
    dietary_tags: ["vegan", "vegetarian", "gluten-free", "dairy-free"],
    source: "curated",
    difficulty: "easy",
    ingredients: [
      { id: "ing-59", name: "Carbassa violí pelada i tallada a daus", amount: 500, unit: "g", category: "produce" },
      { id: "ing-60", name: "Porro", amount: 1, unit: "unitat", category: "produce" },
      { id: "ing-61", name: "Gingebre fresc ratllat", amount: 8, unit: "g", category: "produce" },
      { id: "ing-62", name: "Brou vegetal suau", amount: 400, unit: "ml", category: "pantry" },
      { id: "ing-63", name: "Llavors de carbassa torrades", amount: 15, unit: "g", category: "pantry" },
      { id: "ing-64", name: "Oli d'oliva verge extra", amount: 15, unit: "ml", category: "pantry" }
    ],
    instructions: [
      "En una cassola, ofega el porro a rodanxes amb l'oli d'oliva durant 4 minuts.",
      "Afegeix els daus de carbassa, el gingebre ratllat i el brou vegetal.",
      "Fes bullir a foc mitjà durant 15-18 minuts fins que la carbassa estigui completament tova.",
      "Tritura molt finament amb la batedora fins a obtenir una textura sedosa. Serveix amb les llavors de carbassa per sobre."
    ]
  },
  {
    title: "Fideuà de Gandia Tradicional amb Gambes i Allioli",
    description: "Recepta familiar marinera amb fideus torrats i sofregit intens de sípia i gambes.",
    prep_time_minutes: 15,
    cook_time_minutes: 25,
    servings: 4,
    calories: 540,
    nutrition: { calories: 540, protein: 32, carbs: 62, fat: 18, fiber: 5 },
    tags: ["Plat Únic", "Peix", "Tradició", "Mariner", "Elaborat"],
    dietary_tags: ["pescatarian", "mediterranean"],
    source: "custom",
    difficulty: "medium",
    ingredients: [
      { id: "ing-p1", name: "Fideus del núm. 2 o 3", amount: 350, unit: "g", category: "pantry" },
      { id: "ing-p2", name: "Gambes fresques o llagostins", amount: 8, unit: "unitats", category: "meat" },
      { id: "ing-p3", name: "Sípia neta tallada a daus", amount: 250, unit: "g", category: "meat" },
      { id: "ing-p4", name: "Fumet de peix de roca", amount: 800, unit: "ml", category: "pantry" },
      { id: "ing-p5", name: "Allioli casolà suau", amount: 4, unit: "cullerades", category: "dairy" }
    ],
    instructions: [
      "En una paella amb oli, marca les gambes 1 minut per banda i reserva-les.",
      "Dora la sípia i afegeix un sofregit de ceba, all i tomàquet ratllat.",
      "Dora els fideus a la paella fins que agafin un color avellanat.",
      "Aboca el fumet de peix bullent i cou 8-10 minuts fins que el fideu quedi sec i aixecat.",
      "Serveix amb les gambes a sobre i una cullerada d'allioli casolà."
    ]
  },
  {
    title: "Suquet Tradicional de Peix de Roca, Gambes i Picada d'Ametlles",
    description: "Recepta marinera elaborada de diumenge amb rap, patates estofades i una picada catalana de morter.",
    prep_time_minutes: 20,
    cook_time_minutes: 35,
    servings: 4,
    calories: 580,
    nutrition: { calories: 580, protein: 44, carbs: 42, fat: 22, fiber: 5 },
    tags: ["Plat Únic", "Peix", "Tradició", "Elaborat", "Cap de Setmana"],
    dietary_tags: ["pescatarian", "mediterranean"],
    source: "custom",
    difficulty: "hard",
    ingredients: [
      { id: "ing-sq-1", name: "Cua de rap fresc a rodanxes", amount: 600, unit: "g", category: "meat" },
      { id: "ing-sq-2", name: "Gambes vermelles de la costa", amount: 8, unit: "unitats", category: "meat" },
      { id: "ing-sq-3", name: "Patates monalisa", amount: 4, unit: "unitats", category: "produce" },
      { id: "ing-sq-4", name: "Fumet de peix de roca casolà", amount: 900, unit: "ml", category: "pantry" },
      { id: "ing-sq-5", name: "Ametlles torrades", amount: 25, unit: "g", category: "pantry" },
      { id: "ing-sq-6", name: "Gra d'all i julivert fresc", amount: 2, unit: "gres", category: "produce" },
      { id: "ing-sq-7", name: "Llesqueta de pa torrat", amount: 1, unit: "unitat", category: "bakery" }
    ],
    instructions: [
      "En una cassola de fang o ferro amb oli, enrosseix les gambes 1 minut i reserva-les.",
      "Sofregeix a foc suau ceba ben picada, all i tomàquet ratllat fins que quedi fosc i confitat.",
      "Afegeix les patates esqueixades per deixar anar el midó i ofega-les 3 minuts.",
      "Cobreix amb el fumet bullent i cou durant 15-18 minuts fins que la patata comenci a ser tova.",
      "Pica al morter les ametlles, l'all, julivert i el pa torrat amb un raig de fumet i afegeix la picada a la cassola.",
      "Incorpora les rodanxes de rap i les gambes, i cou tot junt a foc lent 6-8 minuts més."
    ]
  }
];

const PANTRY = [
  { name: "Pasta integral (plomes)", amount: 500, unit: "g", category: "pantry" },
  { name: "Oli d'oliva verge extra", amount: 750, unit: "ml", category: "pantry" },
  { name: "Arròs Basmati aromàtic", amount: 1000, unit: "g", category: "pantry" },
  { name: "Cigrons cuits de pot", amount: 2, unit: "pots", category: "pantry" },
  { name: "Mongetes del Ganxet cuites", amount: 1, unit: "pot", category: "pantry" },
  { name: "Formatge Parmesà ratllat", amount: 200, unit: "g", category: "dairy" },
  { name: "Ous frescos ecològics", amount: 6, unit: "ous", category: "dairy" },
  { name: "Flocs de civada integrals", amount: 400, unit: "g", category: "pantry" },
  { name: "Carbassons frescos", amount: 3, unit: "unitats", category: "produce" },
  { name: "Nous pelades del país", amount: 150, unit: "g", category: "pantry" },
  { name: "Tonyina en oli d'oliva", amount: 3, unit: "llaunes", category: "pantry" }
];

const WEEK_PLAN_SLOTS = [
  // monday
  { day: "monday", meal_type: "breakfast", recipeIndex: 3 }, // Porridge
  { day: "monday", meal_type: "lunch", recipeIndex: 0 },     // Pasta
  { day: "monday", meal_type: "dinner", recipeIndex: 1 },    // Salmó
  // tuesday
  { day: "tuesday", meal_type: "breakfast", recipeIndex: 6 }, // Torrada alvocat
  { day: "tuesday", meal_type: "lunch", recipeIndex: 2 },     // Bowl pollastre
  { day: "tuesday", meal_type: "dinner", recipeIndex: 4 },    // Truita espinacs
  // wednesday
  { day: "wednesday", meal_type: "breakfast", recipeIndex: 3 }, // Porridge
  { day: "wednesday", meal_type: "lunch", recipeIndex: 8 },     // Empedrat
  { day: "wednesday", meal_type: "dinner", recipeIndex: 7 },    // Orada
  // thursday
  { day: "thursday", meal_type: "breakfast", recipeIndex: 6 }, // Torrada
  { day: "thursday", meal_type: "lunch", recipeIndex: 5 },     // Curri cigrons
  { day: "thursday", meal_type: "dinner", recipeIndex: 9 },    // Crema carbassa
  // friday
  { day: "friday", meal_type: "breakfast", recipeIndex: 3 },   // Porridge
  { day: "friday", meal_type: "lunch", recipeIndex: 0 },       // Pasta
  { day: "friday", meal_type: "dinner", recipeIndex: 1 },      // Salmó
  // saturday
  { day: "saturday", meal_type: "breakfast", recipeIndex: 6 }, // Torrada
  { day: "saturday", meal_type: "lunch", recipeIndex: 4 },     // Truita
  { day: "saturday", meal_type: "dinner", recipeIndex: 7 },    // Orada
  // sunday
  { day: "sunday", meal_type: "breakfast", recipeIndex: 3 },   // Porridge
  { day: "sunday", meal_type: "lunch", recipeIndex: 2 },       // Bowl
  { day: "sunday", meal_type: "dinner", recipeIndex: 8 }       // Empedrat
];

async function run() {
  console.log("== INICIALITZACIÓ / NETEJA DE BASE DE DADES MENUPLANIK ==");

  // 1. Eliminar àpats planificats (meal_slots)
  console.log("1. Eliminant tots els àpats planificats (meal_slots)...");
  const { error: sErr } = await client.from("meal_slots").delete().neq("day", "___none___");
  if (sErr) console.warn("Avís eliminant slots:", sErr.message);
  else console.log("✓ meal_slots eliminats.");

  // 2. Eliminar llista de la compra (grocery_items)
  console.log("2. Eliminant tota la llista de la compra (grocery_items)...");
  const { error: gErr } = await client.from("grocery_items").delete().neq("name", "___none___");
  if (gErr) console.warn("Avís eliminant grocery_items:", gErr.message);
  else console.log("✓ grocery_items eliminats.");

  // 3. Eliminar plans de menú (meal_plans)
  console.log("3. Eliminant tots els plans de menú (meal_plans)...");
  const { error: pErr } = await client.from("meal_plans").delete().neq("title", "___none___");
  if (pErr) console.warn("Avís eliminant meal_plans:", pErr.message);
  else console.log("✓ meal_plans eliminats.");

  // 4. Eliminar totes les receptes (recipes)
  console.log("4. Eliminant totes les receptes (recipes)...");
  const { error: rErr } = await client.from("recipes").delete().neq("title", "___none___");
  if (rErr) {
    console.error("Error eliminant receptes:", rErr.message);
    process.exit(1);
  }
  console.log("✓ recipes eliminades.");

  // 5. Assegurar famílies
  console.log("5. Verificant famílies...");
  let { data: families } = await client.from("families").select("*");
  if (!families || families.length === 0) {
    const { data: newFams } = await client.from("families").insert([
      {
        name: "Família Castanyer",
        code: "CAS-BAR",
        admin_name: "Xavi",
        admin_email: "xcastanyer@gmail.com",
        status: "approved"
      },
      {
        name: "Família MenúPlanik",
        code: "FAM-7492",
        admin_name: "Marc Planik",
        admin_email: "marc@menuplanik.cat",
        status: "approved"
      }
    ]).select();
    families = newFams || [];
  }
  console.log(`✓ Famílies configurades: ${families.length}`);

  console.log("\n=============================================");
  console.log("BASE DE DADES INICIALITZADA: TOTES LES RECEPTES,");
  console.log("MENÚS PLANIFICATS I LLISTA DE LA COMPRA HAN ESTAT ELIMINATS!");
  console.log("=============================================");
}

run();
