import { describe, expect, it } from 'vitest';
import { budgetSummary, consume, convert, groceryList, projected, reserve, scoreRecommendation } from './index.js';
import type { InventoryItem, Recipe } from './types.js';

const chicken: InventoryItem = { id: 'i1', ingredientId: 'chicken', name: 'Chicken', quantity: '2', reserved: '0', unit: 'lb', confidence: 1, location: 'fridge', lastConfirmedAt: '2026-01-01' };
const recipe: Recipe = { id: 'r1', version: 1, title: 'Chicken', description: '', cuisine: 'American', protein: 'Chicken', servings: 2, prepMinutes: 5, cookMinutes: 10, difficulty: 'Easy', estimatedCost: '8', cleanup: 1, leftoverQuality: 4, leftoverDays: 3, ingredients: [{ ingredientId: 'chicken', name: 'Chicken', quantity: '1', unit: 'lb' }], steps: ['Cook'], tags: [], reheating: 'Microwave', equipment: [] };

describe('deterministic domain', () => {
  it('converts compatible units and rejects packages', () => { expect(convert('1', 'lb', 'oz')).toBe('16'); expect(convert('1', 'bag', 'cup')).toBeNull(); });
  it('reserves, releases through consumption, and projects', () => { const held = reserve([chicken], recipe.ingredients); expect(projected(held[0]!)).toBe('1'); const used = consume(held, recipe.ingredients); expect(used[0]!.quantity).toBe('1'); expect(used[0]!.reserved).toBe('0'); });
  it('subtracts inventory from consolidated groceries', () => { expect(groceryList([{ recipe, servings: 6 }], [chicken])[0]!.quantity).toBe('1'); });
  it('calculates budgets without floats', () => { expect(budgetSummary('100.10', '20.20', '240').remaining).toBe('119.70'); });
  it('returns transparent recommendation reasons', () => { const values = { preference: 1, availability: 1, expiration: 1, cost: 1, budget: 1, variety: 1, time: 1, cleanup: 1, leftovers: 1, confidence: 1, exploration: 1 }; expect(scoreRecommendation(values).totalScore).toBe(1); expect(scoreRecommendation(values).reasons.length).toBeGreaterThan(2); });
});
