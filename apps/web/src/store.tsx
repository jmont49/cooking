import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { consume, groceryList, prioritizeConfirmation, projected, release, reserve, scoreRecommendation, type GroceryRequirement, type InventoryItem, type PlannedMeal, type Recipe } from '@mise/domain';
import { initialInventory, recipes as seedRecipes } from './data';

interface Feedback { id: string; mealTitle: string; rating: number; wouldMakeAgain: boolean; tags: string[]; notes: string; createdAt: string }
interface State { inventory: InventoryItem[]; recipes: Recipe[]; meals: PlannedMeal[]; feedback: Feedback[]; confirmedIds: string[]; groceryChecked: string[]; monthlySpent: string }
interface Store extends State {
  grocery: GroceryRequirement[];
  recommendations: Array<{recipe: Recipe; score: ReturnType<typeof scoreRecommendation>}>;
  confirmationQueue: InventoryItem[];
  planMeal(date: string, recipeId: string, servings?: number): void;
  removeMeal(id: string): void;
  setMealStatus(id: string, status: PlannedMeal['status']): void;
  confirmInventory(id: string, action: 'correct'|'none'|'less'|'more'|'discarded', exact?: string): void;
  adjustInventory(id: string, quantity: string): void;
  completeMeal(id: string): void;
  addFeedback(mealTitle: string, rating: number, notes: string, tags: string[]): void;
  toggleGrocery(key: string): void;
  purchaseGroceries(): void;
  addRecipe(recipe: Recipe): void;
  resetDemo(): void;
}

const KEY = 'mise-demo-state-v2';
const initialState = (): State => ({ inventory: initialInventory, recipes: seedRecipes, meals: [], feedback: [{ id:'f1',mealTitle:'Ginger chicken rice bowls',rating:9,wouldMakeAgain:true,tags:['excellent seasoning','great leftovers'],notes:'Fast and excellent for lunch.',createdAt:new Date(Date.now()-5*86400000).toISOString() }], confirmedIds: [], groceryChecked: [], monthlySpent: '86.40' });
const Context = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => { try { return JSON.parse(localStorage.getItem(KEY) ?? '') as State; } catch { return initialState(); } });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);

  const plannedRecipes = useMemo(() => state.meals.filter(m => m.status === 'planned' && m.recipeId).map(m => ({ recipe: state.recipes.find(r => r.id === m.recipeId)!, servings: m.servings })).filter(x => x.recipe), [state.meals,state.recipes]);
  const grocery = useMemo(() => groceryList(plannedRecipes, state.inventory), [plannedRecipes,state.inventory]);
  const needed = useMemo(() => plannedRecipes.flatMap(x => x.recipe.ingredients.map(i => i.ingredientId)), [plannedRecipes]);
  const confirmationQueue = useMemo(() => state.inventory.filter(i => !state.confirmedIds.includes(i.id)).sort((a,b) => prioritizeConfirmation(b,needed)-prioritizeConfirmation(a,needed)), [state.inventory,state.confirmedIds,needed]);
  const recommendations = useMemo(() => state.recipes.map(recipe => {
    const availability = recipe.ingredients.filter(need => state.inventory.some(item => item.ingredientId===need.ingredientId && Number(projected(item))>0)).length / recipe.ingredients.length;
    const expiring = recipe.ingredients.some(need => state.inventory.some(item => item.ingredientId===need.ingredientId && item.expiresOn && new Date(item.expiresOn).getTime()-Date.now()<3*86400000));
    const repeated = state.meals.some(m => state.recipes.find(r=>r.id===m.recipeId)?.protein===recipe.protein);
    const values = { preference: ['Chicken','Salmon','Ground beef','Eggs','White fish'].includes(recipe.protein)?.9:.65, availability, expiration:expiring?1:.25, cost:Math.max(0,1-Number(recipe.estimatedCost)/25), budget:.85, variety:repeated?.25:.9, time:recipe.prepMinutes+recipe.cookMinutes<=40?1:.5, cleanup:1-(recipe.cleanup-1)/4, leftovers:recipe.leftoverQuality/5, confidence:state.feedback.some(f=>f.mealTitle===recipe.title)?.95:.6, exploration:['Tofu','Lentils','Chickpeas'].includes(recipe.protein)?.8:.45 };
    return { recipe, score: scoreRecommendation(values) };
  }).sort((a,b)=>b.score.totalScore-a.score.totalScore), [state.inventory,state.meals,state.recipes,state.feedback]);

  const planMeal = (date:string,recipeId:string,servings?:number) => setState(s => {
    const recipe=s.recipes.find(r=>r.id===recipeId); if(!recipe)return s;
    const existing=s.meals.find(m=>m.date===date&&m.slot==='dinner'&&m.status==='planned');
    let inventory=s.inventory; let meals=s.meals;
    if(existing?.recipeId){const old=s.recipes.find(r=>r.id===existing.recipeId);if(old)inventory=release(inventory,old.ingredients,existing.servings/old.servings);meals=meals.filter(m=>m.id!==existing.id);}
    const count=servings??recipe.servings; inventory=reserve(inventory,recipe.ingredients,count/recipe.servings);
    const nextMeal: PlannedMeal={id:crypto.randomUUID(),date,slot:'dinner',recipeId,title:recipe.title,servings:count,status:'planned'};
    return {...s,inventory,meals:[...meals,nextMeal].sort((a,b)=>a.date.localeCompare(b.date))};
  });
  const removeMeal=(id:string)=>setState(s=>{const meal=s.meals.find(m=>m.id===id);const recipe=s.recipes.find(r=>r.id===meal?.recipeId);return {...s,inventory:meal&&recipe?release(s.inventory,recipe.ingredients,meal.servings/recipe.servings):s.inventory,meals:s.meals.filter(m=>m.id!==id)};});
  const setMealStatus=(id:string,status:PlannedMeal['status'])=>setState(s=>{const meal=s.meals.find(m=>m.id===id);const recipe=s.recipes.find(r=>r.id===meal?.recipeId);let inventory=s.inventory;if(meal?.status==='planned'&&status!=='planned'&&recipe)inventory=release(inventory,recipe.ingredients,meal.servings/recipe.servings);return {...s,inventory,meals:s.meals.map(m=>m.id===id?{...m,status}:m)};});
  const confirmInventory=(id:string,action:'correct'|'none'|'less'|'more'|'discarded',exact?:string)=>setState(s=>({...s,confirmedIds:[...new Set([...s.confirmedIds,id])],inventory:s.inventory.map(i=>i.id===id?{...i,quantity:exact??(action==='none'||action==='discarded'?'0':action==='less'?String(Math.max(0,Number(i.quantity)*.5)):action==='more'?String(Number(i.quantity)*1.5):i.quantity),confidence:1,lastConfirmedAt:new Date().toISOString()}:i)}));
  const adjustInventory=(id:string,quantity:string)=>setState(s=>({...s,inventory:s.inventory.map(i=>i.id===id?{...i,quantity,confidence:1,lastConfirmedAt:new Date().toISOString()}:i)}));
  const completeMeal=(id:string)=>setState(s=>{const meal=s.meals.find(m=>m.id===id);const recipe=s.recipes.find(r=>r.id===meal?.recipeId);if(!meal||!recipe)return s;return {...s,inventory:consume(s.inventory,recipe.ingredients,meal.servings/recipe.servings),meals:s.meals.map(m=>m.id===id?{...m,status:'completed'}:m)};});
  const addFeedback=(mealTitle:string,rating:number,notes:string,tags:string[])=>setState(s=>({...s,feedback:[{id:crypto.randomUUID(),mealTitle,rating,wouldMakeAgain:rating>=7,tags,notes,createdAt:new Date().toISOString()},...s.feedback]}));
  const toggleGrocery=(key:string)=>setState(s=>({...s,groceryChecked:s.groceryChecked.includes(key)?s.groceryChecked.filter(k=>k!==key):[...s.groceryChecked,key]}));
  const purchaseGroceries=()=>setState(s=>{const purchased=grocery.filter(g=>s.groceryChecked.includes(`${g.ingredientId}:${g.unit}`));let inventory=[...s.inventory];for(const row of purchased){const found=inventory.find(i=>i.ingredientId===row.ingredientId&&i.unit===row.unit);if(found)inventory=inventory.map(i=>i.id===found.id?{...i,quantity:String(Number(i.quantity)+Number(row.quantity)),confidence:1}:i);else inventory.push({id:crypto.randomUUID(),ingredientId:row.ingredientId,name:row.name,quantity:row.quantity,reserved:'0',unit:row.unit,confidence:1,location:'Pantry',lastConfirmedAt:new Date().toISOString()});}return {...s,inventory,groceryChecked:[],monthlySpent:String((Number(s.monthlySpent)+purchased.reduce((n,g)=>n+Math.max(1,Number(g.quantity)*1.25),0)).toFixed(2))};});
  const addRecipe=(recipe:Recipe)=>setState(s=>({...s,recipes:[recipe,...s.recipes]}));
  const resetDemo=()=>setState(initialState());
  return <Context.Provider value={{...state,grocery,recommendations,confirmationQueue,planMeal,removeMeal,setMealStatus,confirmInventory,adjustInventory,completeMeal,addFeedback,toggleGrocery,purchaseGroceries,addRecipe,resetDemo}}>{children}</Context.Provider>;
}

export function useStore(){const store=useContext(Context);if(!store)throw new Error('StoreProvider missing');return store;}
