import Decimal from 'decimal.js';
import type { GroceryRequirement, InventoryItem, PlannedMeal, Quantity, Recipe, RecipeIngredient, ScoreInput, ScoreResult, Unit, WeeklyPrepPlan, WeeklyPrepTask } from './types.js';
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

export function validatePrepPlanQuantities(plan: WeeklyPrepPlan): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const task of plan.tasks) {
    if (ids.has(task.id)) errors.push(`Duplicate prep task id: ${task.id}`); else ids.add(task.id);
    for (const ingredient of task.ingredients) {
      const allocated = ingredient.allocations.reduce((sum, allocation) => {
        const converted = convert(allocation.quantity, allocation.unit, ingredient.unit);
        if (converted === null) { errors.push(`${ingredient.name} has incompatible allocation units.`); return sum; }
        return sum.plus(converted);
      }, new Decimal(0));
      if (!allocated.equals(ingredient.totalQuantity)) errors.push(`${ingredient.name} total does not equal its meal portions.`);
    }
  }
  if (plan.totalMinutes !== plan.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)) errors.push('Prep plan total minutes do not equal its tasks.');
  if (plan.estimatedWeeknightMinutesSaved !== plan.tasks.reduce((sum, task) => sum + task.weekdayMinutesSaved, 0)) errors.push('Weeknight time saved does not equal its tasks.');
  return errors;
}

const prepActions: Record<string,{title:string;action:string;minutes:number;storage:string}> = {
  onion:{title:'Dice the onions',action:'Peel and dice the onions together, then divide them by meal.',minutes:8,storage:'Refrigerate in separate labeled airtight containers.'},
  carrot:{title:'Prep the carrots',action:'Wash, peel, and chop the carrots, keeping each meal portion separate.',minutes:7,storage:'Refrigerate in separate labeled airtight containers.'},
  'bell-pepper':{title:'Slice the bell peppers',action:'Core and slice the peppers, then divide them by meal.',minutes:7,storage:'Refrigerate in separate labeled airtight containers.'},
  broccoli:{title:'Cut the broccoli florets',action:'Cut the broccoli into bite-size florets and divide it by meal.',minutes:6,storage:'Refrigerate with a dry paper towel in labeled containers.'},
  garlic:{title:'Mince the garlic',action:'Peel and mince the garlic, then divide it by meal.',minutes:5,storage:'Refrigerate promptly in separate labeled airtight containers.'},
  ginger:{title:'Grate the ginger',action:'Peel and grate the ginger for the week.',minutes:4,storage:'Refrigerate in a small labeled airtight container.'},
  cabbage:{title:'Shred the cabbage',action:'Thinly shred the cabbage for the planned meal.',minutes:5,storage:'Refrigerate with a dry paper towel in a labeled container.'},
  'green-beans':{title:'Trim the green beans',action:'Wash, dry, and trim the green beans.',minutes:5,storage:'Refrigerate in a labeled airtight container.'}
};

export function createDemoWeeklyPrepPlan(weekStart:string, meals:Array<{meal:PlannedMeal;recipe:Recipe}>):WeeklyPrepPlan {
  const grouped = new Map<string,WeeklyPrepTask>();
  for (const {meal,recipe} of meals) {
    const scale=new Decimal(meal.servings).div(recipe.servings);
    for (const ingredient of recipe.ingredients) {
      const prep=prepActions[ingredient.ingredientId];if(!prep)continue;
      const key=`${ingredient.ingredientId}:${ingredient.unit}`;
      const quantity=new Decimal(ingredient.quantity).times(scale).toFixed();
      const allocation={mealId:meal.id,mealTitle:meal.title,mealDate:meal.date,quantity,unit:ingredient.unit};
      const current=grouped.get(key);
      if(current){current.ingredients[0]!.totalQuantity=new Decimal(current.ingredients[0]!.totalQuantity).plus(quantity).toFixed();current.ingredients[0]!.allocations.push(allocation);continue}
      grouped.set(key,{id:`prep-${ingredient.ingredientId}-${ingredient.unit}`,order:0,title:prep.title,action:prep.action,estimatedMinutes:prep.minutes,weekdayMinutesSaved:Math.max(3,prep.minutes-1),storage:prep.storage,ingredients:[{ingredientId:ingredient.ingredientId,name:ingredient.name,totalQuantity:quantity,unit:ingredient.unit,allocations:[allocation]}]});
    }
  }
  const tasks=[...grouped.values()].map((task,index)=>({...task,order:index+1}));
  if(tasks.length===0&&meals[0]){const {meal,recipe}=meals[0];const ingredient=recipe.ingredients[0]!;tasks.push({id:'prep-first-meal',order:1,title:`Set up ${meal.title}`,action:'Measure the shelf-stable ingredients and gather the equipment so cooking can start immediately.',estimatedMinutes:8,weekdayMinutesSaved:5,storage:'Keep shelf-stable ingredients together; refrigerate anything perishable.',ingredients:[{ingredientId:ingredient.ingredientId,name:ingredient.name,totalQuantity:ingredient.quantity,unit:ingredient.unit,allocations:[{mealId:meal.id,mealTitle:meal.title,mealDate:meal.date,quantity:ingredient.quantity,unit:ingredient.unit}]}]})}
  const totalMinutes=tasks.reduce((sum,task)=>sum+task.estimatedMinutes,0);const saved=tasks.reduce((sum,task)=>sum+task.weekdayMinutesSaved,0);
  return {weekStart,summary:`One coordinated prep session for ${meals.length} planned ${meals.length===1?'meal':'meals'}, with shared ingredients combined and portioned by cooking day.`,totalMinutes,estimatedWeeknightMinutesSaved:saved,generatedAt:new Date().toISOString(),tasks};
}
