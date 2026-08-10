import Decimal from 'decimal.js';
import type { GroceryRequirement, InventoryItem, PlannedMeal, Quantity, Recipe, RecipeIngredient, ScoreInput, ScoreResult, Unit } from './types.js';
export * from './types.js';

const conversion: Partial<Record<Unit, { family: string; baseFactor: string }>> = {
  tsp: { family: 'volume', baseFactor: '4.92892159375' }, tbsp: { family: 'volume', baseFactor: '14.78676478125' },
  fl_oz: { family: 'volume', baseFactor: '29.5735295625' }, cup: { family: 'volume', baseFactor: '236.5882365' },
  ml: { family: 'volume', baseFactor: '1' }, l: { family: 'volume', baseFactor: '1000' },
  oz: { family: 'mass', baseFactor: '28.349523125' }, lb: { family: 'mass', baseFactor: '453.59237' },
  g: { family: 'mass', baseFactor: '1' }, kg: { family: 'mass', baseFactor: '1000' },
  count: { family: 'count', baseFactor: '1' }, serving: { family: 'serving', baseFactor: '1' }
};

export function convert(quantity: Quantity, from: Unit, to: Unit): Quantity | null {
  if (from === to) return new Decimal(quantity).toFixed();
  const source = conversion[from]; const target = conversion[to];
  if (!source || !target || source.family !== target.family) return null;
  return new Decimal(quantity).times(source.baseFactor).div(target.baseFactor).toSignificantDigits(12).toFixed();
}

export function projected(item: Pick<InventoryItem, 'quantity' | 'reserved'>): Quantity {
  return Decimal.max(0, new Decimal(item.quantity).minus(item.reserved)).toFixed();
}

export function reserve(items: InventoryItem[], ingredients: RecipeIngredient[], scale = 1): InventoryItem[] {
  return items.map((item) => {
    const needs = ingredients.filter((i) => i.ingredientId === item.ingredientId && !i.optional)
      .reduce((sum, need) => {
        const q = convert(need.quantity, need.unit, item.unit);
        return q === null ? sum : sum.plus(new Decimal(q).times(scale));
      }, new Decimal(0));
    return needs.isZero() ? item : { ...item, reserved: new Decimal(item.reserved).plus(needs).toFixed() };
  });
}

export function release(items: InventoryItem[], ingredients: RecipeIngredient[], scale = 1): InventoryItem[] {
  return items.map((item) => {
    const released = ingredients.filter((i) => i.ingredientId === item.ingredientId && !i.optional)
      .reduce((sum, need) => {
        const q = convert(need.quantity, need.unit, item.unit);
        return q === null ? sum : sum.plus(new Decimal(q).times(scale));
      }, new Decimal(0));
    return released.isZero() ? item : { ...item, reserved: Decimal.max(0, new Decimal(item.reserved).minus(released)).toFixed() };
  });
}

export function consume(items: InventoryItem[], ingredients: RecipeIngredient[], scale = 1): InventoryItem[] {
  return release(items, ingredients, scale).map((item) => {
    const used = ingredients.filter((i) => i.ingredientId === item.ingredientId && !i.optional)
      .reduce((sum, need) => {
        const q = convert(need.quantity, need.unit, item.unit);
        return q === null ? sum : sum.plus(new Decimal(q).times(scale));
      }, new Decimal(0));
    return used.isZero() ? item : { ...item, quantity: Decimal.max(0, new Decimal(item.quantity).minus(used)).toFixed() };
  });
}

export function sequentialProjection(start: InventoryItem[], meals: Array<{ recipe: Recipe; servings: number }>): InventoryItem[] {
  return meals.reduce((state, meal) => reserve(state, meal.recipe.ingredients, meal.servings / meal.recipe.servings), start);
}

export function groceryList(recipes: Array<{ recipe: Recipe; servings: number }>, inventory: InventoryItem[]): GroceryRequirement[] {
  const rows = new Map<string, GroceryRequirement>();
  for (const { recipe, servings } of recipes) for (const need of recipe.ingredients.filter((x) => !x.optional)) {
    const key = `${need.ingredientId}:${need.unit}`; const scaled = new Decimal(need.quantity).times(servings).div(recipe.servings);
    const old = rows.get(key);
    rows.set(key, { ...need, quantity: scaled.plus(old?.quantity ?? 0).toFixed(), recipeIds: [...(old?.recipeIds ?? []), recipe.id], estimatedCost: old?.estimatedCost ?? '0' });
  }
  for (const row of rows.values()) {
    const owned = inventory.filter((i) => i.ingredientId === row.ingredientId).reduce((sum, item) => {
      const q = convert(projected(item), item.unit, row.unit); return q === null ? sum : sum.plus(q);
    }, new Decimal(0));
    row.quantity = Decimal.max(0, new Decimal(row.quantity).minus(owned)).toFixed();
  }
  return [...rows.values()].filter((r) => new Decimal(r.quantity).greaterThan(0));
}

export const defaultWeights: ScoreInput = { preference: .16, availability: .17, expiration: .12, cost: .1, budget: .08, variety: .1, time: .07, cleanup: .05, leftovers: .07, confidence: .05, exploration: .03 };

export function scoreRecommendation(values: ScoreInput, weights: ScoreInput = defaultWeights): ScoreResult {
  const keys = Object.keys(values) as (keyof ScoreInput)[];
  const total = keys.reduce((sum, key) => sum + Math.max(0, Math.min(1, values[key])) * weights[key], 0) / keys.reduce((sum, key) => sum + weights[key], 0);
  const reasons: string[] = []; const tradeoffs: string[] = [];
  if (values.availability >= .75) reasons.push('Uses ingredients already in your kitchen');
  if (values.expiration >= .7) reasons.push('Uses food before its estimated expiration');
  if (values.leftovers >= .7) reasons.push('Makes useful leftovers for a future lunch');
  if (values.preference >= .75) reasons.push('Matches your established meal preferences');
  if (values.cost < .4) tradeoffs.push('Requires a higher incremental grocery spend');
  if (values.variety < .4) tradeoffs.push('Repeats a recent protein or cuisine');
  return { totalScore: Number(total.toFixed(3)), reasons, tradeoffs, breakdown: values };
}

export function budgetSummary(spent: string, upcoming: string, monthly: string) {
  const remaining = new Decimal(monthly).minus(spent).minus(upcoming);
  return { spent: new Decimal(spent).toFixed(2), upcoming: new Decimal(upcoming).toFixed(2), remaining: remaining.toFixed(2), overBudget: remaining.isNegative() };
}

export function prioritizeConfirmation(item: InventoryItem, neededIngredientIds: string[], today = new Date()): number {
  const ageDays = Math.max(0, (today.getTime() - new Date(item.lastConfirmedAt).getTime()) / 86400000);
  const expirationDays = item.expiresOn ? (new Date(item.expiresOn).getTime() - today.getTime()) / 86400000 : 99;
  return Math.round((1 - item.confidence) * 35 + Math.min(ageDays, 21) + (expirationDays <= 3 ? 25 : 0) + (neededIngredientIds.includes(item.ingredientId) ? 20 : 0));
}

export function activeMeals(meals: PlannedMeal[]) { return meals.filter((m) => m.status === 'planned' && m.recipeId); }
