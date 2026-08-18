import { describe, expect, it } from 'vitest';
import { recipes } from './data';

describe('preference-shaped starter catalog',()=>{
  it('contains a complete pantry-first two-serving collection with nutrition estimates',()=>{
    expect(recipes.length).toBeGreaterThanOrEqual(12);
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

  it('adds a detailed chicken-first collection with one breast per serving',()=>{
    const chickenFirst=recipes.filter(recipe=>recipe.tags.includes('chicken-first'));
    expect(chickenFirst.length).toBeGreaterThanOrEqual(8);
    for(const recipe of chickenFirst){
      expect(recipe.protein,recipe.title).toBe('Chicken breast');
      expect(recipe.ingredients.length,recipe.title).toBeGreaterThanOrEqual(7);
      expect(recipe.steps.length,recipe.title).toBeGreaterThanOrEqual(5);
      expect(recipe.safetyNote,recipe.title).toContain('165°F');
      expect(recipe.prepMinutes+recipe.cookMinutes,recipe.title).toBeLessThanOrEqual(55);
      expect(recipe.ingredients.find(item=>item.ingredientId==='chicken')).toMatchObject({quantity:'2',unit:'count'});
    }
  });
});
