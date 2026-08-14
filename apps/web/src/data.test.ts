import { describe, expect, it } from 'vitest';
import { recipes } from './data';

describe('preference-shaped starter catalog',()=>{
  it('contains 50+ complete two-serving meals with nutrition estimates',()=>{
    expect(recipes.length).toBeGreaterThanOrEqual(50);
    for(const recipe of recipes){
      expect(recipe.servings,recipe.title).toBe(2);
      expect(recipe.ingredients.length,recipe.title).toBeGreaterThanOrEqual(2);
      expect(recipe.caloriesPerServing,recipe.title).toBeGreaterThanOrEqual(50);
      expect(recipe.proteinGramsPerServing,recipe.title).toBeGreaterThanOrEqual(0);
      expect(recipe.leftoverDays,recipe.title).toBe(1);
    }
  });

  it('contains no pork or nut-allergy conflicts',()=>{
    const ingredientNames=recipes.flatMap(recipe=>recipe.ingredients.map(item=>item.name.toLowerCase()));
    expect(ingredientNames.filter(name=>/(peanut|almond|walnut|cashew|pecan|pistachio|hazelnut|macadamia|pork|bacon|prosciutto|pancetta|lard)/.test(name))).toEqual([]);
    expect(ingredientNames.filter(name=>name.includes('pesto')&&!name.includes('nut-free'))).toEqual([]);
  });
});
