/**
 * Smart food search — estimates kg CO2e per typical serving by keyword
 * matching against a curated list. Falls back to omnivore default.
 *
 * Source: Poore & Nemecek 2018 (per-kg averages, converted to typical
 * serving sizes). Pure module, easy to unit-test.
 */

export interface FoodEstimate {
  /** Canonical food name shown to the user. */
  name: string;
  /** kg CO2e for one typical serving. */
  kg: number;
  /** Keywords (lowercase) used to match user input. */
  keywords: string[];
}

export const FOOD_DB: FoodEstimate[] = [
  { name: "Beef burger / steak", kg: 6.0, keywords: ["beef", "burger", "steak", "hamburger"] },
  { name: "Lamb dish", kg: 5.7, keywords: ["lamb", "mutton"] },
  { name: "Cheese plate", kg: 2.1, keywords: ["cheese", "paneer", "halloumi"] },
  { name: "Pork / bacon", kg: 1.8, keywords: ["pork", "bacon", "ham", "sausage"] },
  { name: "Chicken meal", kg: 1.3, keywords: ["chicken", "poultry", "turkey"] },
  { name: "Fish / seafood", kg: 1.1, keywords: ["fish", "salmon", "tuna", "seafood", "shrimp", "prawn"] },
  { name: "Eggs", kg: 0.5, keywords: ["egg", "eggs", "omelette"] },
  { name: "Dairy milk (glass)", kg: 0.6, keywords: ["milk", "latte", "cappuccino"] },
  { name: "Yogurt", kg: 0.4, keywords: ["yogurt", "yoghurt", "curd"] },
  { name: "Rice meal", kg: 0.9, keywords: ["rice", "biryani", "risotto"] },
  { name: "Pasta", kg: 0.4, keywords: ["pasta", "spaghetti", "noodles", "ramen"] },
  { name: "Bread / sandwich", kg: 0.3, keywords: ["bread", "sandwich", "toast", "bagel"] },
  { name: "Tofu / tempeh", kg: 0.4, keywords: ["tofu", "tempeh", "soy"] },
  { name: "Beans / lentils", kg: 0.3, keywords: ["beans", "lentil", "dal", "dhal", "chickpea", "hummus"] },
  { name: "Vegetable dish", kg: 0.2, keywords: ["vegetable", "salad", "veggie", "broccoli", "spinach", "carrot"] },
  { name: "Fruit", kg: 0.2, keywords: ["fruit", "apple", "banana", "berry", "berries", "orange", "mango"] },
  { name: "Plant milk", kg: 0.2, keywords: ["oat milk", "almond milk", "soy milk", "plant milk"] },
  { name: "Coffee (black)", kg: 0.15, keywords: ["coffee", "espresso", "americano"] },
  { name: "Tea", kg: 0.05, keywords: ["tea", "chai", "matcha"] },
  { name: "Pizza (cheese)", kg: 2.5, keywords: ["pizza"] },
  { name: "Chocolate", kg: 1.9, keywords: ["chocolate", "cocoa"] },
];

/** Default to omnivore baseline if no match. */
export const DEFAULT_FOOD_KG = 2.5;

export function searchFoods(query: string, limit = 6): FoodEstimate[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return FOOD_DB.filter((f) =>
    f.name.toLowerCase().includes(q) || f.keywords.some((k) => k.includes(q) || q.includes(k)),
  ).slice(0, limit);
}

/**
 * Sum the estimated CO2e (kg) for all entries. Each entry is one serving.
 */
export function estimateFoodFootprint(entries: FoodEstimate[]): number {
  if (entries.length === 0) return 0;
  const sum = entries.reduce((acc, e) => acc + e.kg, 0);
  return Math.round(sum * 100) / 100;
}
