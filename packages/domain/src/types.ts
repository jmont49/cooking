export type Quantity = string;
export type Money = string;

export type Unit =
  | 'count' | 'serving' | 'tsp' | 'tbsp' | 'fl_oz' | 'cup' | 'oz' | 'lb'
  | 'g' | 'kg' | 'ml' | 'l' | 'package' | 'bag' | 'can' | 'bottle' | 'bunch';

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  defaultUnit: Unit;
  perishable?: boolean;
  staple?: boolean;
}

export interface InventoryItem {
  id: string;
  ingredientId: string;
  name: string;
  quantity: Quantity;
  reserved: Quantity;
  unit: Unit;
  confidence: number;
  expiresOn?: string;
  ingredientPhotoUrl?: string;
  location: string;
  lastConfirmedAt: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  name: string;
  quantity: Quantity;
  unit: Unit;
  optional?: boolean;
}

export interface Recipe {
  id: string;
  version: number;
  parentVersionId?: string;
  title: string;
  description: string;
  cuisine: string;
  protein: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: 'Easy' | 'Medium' | 'Ambitious';
  estimatedCost: Money;
  caloriesPerServing: number;
  proteinGramsPerServing: number;
  cleanup: 1 | 2 | 3 | 4 | 5;
  leftoverQuality: 1 | 2 | 3 | 4 | 5;
  leftoverDays: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[];
  safetyNote?: string;
  reheating: string;
  equipment: string[];
  photoUrl?: string;
  photoAttribution?: { photographerName: string; photographerUrl: string; sourceUrl: string };
}

export interface PlannedMeal {
  id: string;
  date: string;
  slot: 'lunch' | 'dinner';
  recipeId?: string;
  title: string;
  servings: number;
  status: 'planned' | 'completed' | 'skipped' | 'eating_out' | 'flexible';
  leftoverFromMealId?: string;
}

export interface PrepAllocation {
  mealId: string;
  mealTitle: string;
  mealDate: string;
  quantity: Quantity;
  unit: Unit;
}

export interface PrepIngredient {
  ingredientId: string;
  name: string;
  totalQuantity: Quantity;
  unit: Unit;
  allocations: PrepAllocation[];
}

export interface WeeklyPrepTask {
  id: string;
  order: number;
  title: string;
  action: string;
  estimatedMinutes: number;
  weekdayMinutesSaved: number;
  storage: string;
  foodSafety?: string;
  ingredients: PrepIngredient[];
}

export interface WeeklyPrepPlan {
  weekStart: string;
  summary: string;
  totalMinutes: number;
  estimatedWeeknightMinutesSaved: number;
  generatedAt: string;
  tasks: WeeklyPrepTask[];
}

export interface GroceryRequirement extends RecipeIngredient {
  recipeIds: string[];
  estimatedCost: Money;
}

export interface ScoreInput {
  preference: number;
  availability: number;
  expiration: number;
  cost: number;
  budget: number;
  variety: number;
  time: number;
  cleanup: number;
  leftovers: number;
  confidence: number;
  exploration: number;
}

export interface ScoreResult { totalScore: number; reasons: string[]; tradeoffs: string[]; breakdown: ScoreInput }
