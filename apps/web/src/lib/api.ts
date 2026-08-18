import type { Recipe, Unit, WeeklyPrepPlan } from '@mise/domain';
import type { GeneratedRecipe } from '@mise/contracts';
import { supabase } from './supabase';

const apiUrl=(import.meta.env.VITE_API_URL as string|undefined)?.replace(/\/$/,'');

interface Envelope<T>{requestId:string;data:T}
interface ErrorEnvelope{requestId:string;error:{code:string;message:string;retryable:boolean;confirmationToken?:string;summary?:string}}
export interface IngredientOption{id:string;slug:string;name:string;category:string;default_unit:Unit;perishable:boolean;default_shelf_days:number|null}
export interface InventoryRow{id:string;ingredient_id:string;quantity:string;reserved_quantity:string;unit:Unit;confidence:string;estimated_expiration_date:string|null;last_confirmed_at:string|null;ingredients:{name:string;category:string;photo_url:string|null};storage_locations:{name:string}|null}
export type IntegrationScope='inventory:read'|'inventory:write'|'recipes:read'|'recipes:write'|'plans:read'|'plans:write'|'cooking:write'|'feedback:write'|'groceries:read'|'groceries:write'|'budget:read';
export interface CreatedIntegrationToken{id:string;name:string;token_prefix:string;scopes:IntegrationScope[];created_at:string;token:string;displayedOnce:true}
export interface PhotoCandidate{id:string;imageUrl:string;thumbUrl:string;altText:string;photographerName:string;photographerUrl:string;sourceUrl:string;downloadLocation:string;provider:'unsplash'}
export interface RecipeJob{id:string;status:'queued'|'processing'|'ready'|'failed'|'saved'|'discarded';request:{protein:string;minutes:number;servings:number;notes:string};recipe_draft:GeneratedRecipe|null;photo_candidates:PhotoCandidate[];error_code:string|null;created_at:string;updated_at:string}
export interface PrepRequestMeal{mealId:string;date:string;title:string;servings:number;recipeTitle:string;ingredients:Array<{ingredientId:string;name:string;quantity:string;unit:Unit}>;steps:string[];equipment:string[];safetyNote:string}
export interface PrepJob{id:string;status:'queued'|'processing'|'ready'|'failed';week_start:string;source_fingerprint:string;request:{weekStart:string;sourceFingerprint:string;meals:PrepRequestMeal[]};prep_plan:WeeklyPrepPlan|null;completed_task_ids:string[];error_code:string|null;created_at:string;updated_at:string}
export interface UserSettings{monthlyBudget:string;weekdayLimit:number;planLunch:boolean;coveredStaples:boolean;exploration:number;preferredProteins:string;exclusions:string;tasteProfile:string}
interface RecipeRow{id:string;title:string;description:string;primary_photo_url:string|null;photo_attribution:Recipe['photoAttribution']|null;recipe_tags:Array<{tag:string}>;recipe_versions:Array<{id:string;version:number;servings:string;prep_minutes:number;cook_minutes:number;difficulty:Recipe['difficulty'];estimated_cost:string|null;calories_per_serving:number|null;protein_grams_per_serving:string|null;cuisine:string|null;protein:string|null;cleanup:number|null;leftover_quality:number|null;leftover_days:number|null;reheating:string|null;safety_notes:string[];equipment:string[];recipe_ingredients:Array<{ingredient_id:string|null;unresolved_name:string|null;quantity:string;unit:Unit;optional:boolean;sort_order:number;ingredients:{name:string}|null}>;recipe_steps:Array<{step_number:number;instruction:string}>}>}

export class ShuaApiError extends Error{constructor(public code:string,message:string,public retryable=false,public confirmationToken?:string,public summary?:string){super(message)}}

async function request<T>(path:string,init:RequestInit={}):Promise<T>{
  if(!apiUrl||!supabase)throw new ShuaApiError('configuration_missing','Shua API configuration is missing.');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new ShuaApiError('unauthorized','Your session expired. Sign in again.');
  const formData=typeof FormData!=='undefined'&&init.body instanceof FormData;
  const response=await fetch(`${apiUrl}${path}`,{...init,headers:{authorization:`Bearer ${session.access_token}`,...(formData?{}:{'content-type':'application/json'}),...(init.headers??{})}});
  const payload=await response.json() as Envelope<T>|ErrorEnvelope;
  if(!response.ok){const failure=payload as ErrorEnvelope;throw new ShuaApiError(failure.error?.code??'request_failed',failure.error?.message??'The request failed.',failure.error?.retryable,failure.error?.confirmationToken,failure.error?.summary)}
  return (payload as Envelope<T>).data;
}

export const inventoryApi={
  list:()=>request<InventoryRow[]>('/v1/inventory'),
  ingredients:(query?:string)=>request<IngredientOption[]>(`/v1/ingredients${query?`?q=${encodeURIComponent(query)}`:''}`),
  photo:(ingredientId:string)=>request<{imageUrl:string|null}>(`/v1/ingredients/${ingredientId}/photo`),
  add:(input:{ingredientId?:string;ingredientName:string;quantity:string;unit:Unit;location:string;expiresOn?:string})=>request<InventoryRow>('/v1/inventory',{method:'POST',headers:{'idempotency-key':crypto.randomUUID()},body:JSON.stringify(input)}),
  async adjust(input:{inventoryItemId:string;quantityDelta:string;unit:Unit;reason:'manual'|'discarded'|'expired'|'cooking_difference'}){
    const idempotencyKey=crypto.randomUUID();
    try{return await request<InventoryRow>('/v1/inventory/adjust',{method:'POST',headers:{'idempotency-key':idempotencyKey},body:JSON.stringify(input)})}
    catch(error){
      if(!(error instanceof ShuaApiError)||error.code!=='confirmation_required'||!error.confirmationToken)throw error;
      if(!window.confirm(error.summary??error.message))throw new ShuaApiError('confirmation_cancelled','The adjustment was cancelled.');
      return request<InventoryRow>('/v1/inventory/adjust',{method:'POST',headers:{'idempotency-key':idempotencyKey,'x-confirmation-token':error.confirmationToken},body:JSON.stringify(input)});
    }
  }
};

export const integrationApi={
  create:(name:string,scopes:IntegrationScope[])=>request<CreatedIntegrationToken>('/v1/integration-tokens',{method:'POST',body:JSON.stringify({name,scopes})})
};

const mapRecipe=(row:RecipeRow):Recipe=>{const version=[...row.recipe_versions].sort((a,b)=>b.version-a.version)[0];if(!version)throw new Error(`Recipe ${row.title} has no version.`);return {id:row.id,version:version.version,title:row.title,description:row.description,cuisine:version.cuisine??'Unspecified',protein:version.protein??'Other',servings:Number(version.servings),prepMinutes:version.prep_minutes,cookMinutes:version.cook_minutes,difficulty:version.difficulty,estimatedCost:String(version.estimated_cost??'0'),caloriesPerServing:Number(version.calories_per_serving??0),proteinGramsPerServing:Number(version.protein_grams_per_serving??0),cleanup:Math.min(5,Math.max(1,version.cleanup??2)) as Recipe['cleanup'],leftoverQuality:Math.min(5,Math.max(1,version.leftover_quality??3)) as Recipe['leftoverQuality'],leftoverDays:version.leftover_days??1,ingredients:[...version.recipe_ingredients].sort((a,b)=>a.sort_order-b.sort_order).map(item=>({ingredientId:item.ingredient_id??`unresolved:${item.unresolved_name}`,name:item.ingredients?.name??item.unresolved_name??'Unresolved ingredient',quantity:String(item.quantity),unit:item.unit,optional:item.optional})),steps:[...version.recipe_steps].sort((a,b)=>a.step_number-b.step_number).map(step=>step.instruction),tags:row.recipe_tags.map(tag=>tag.tag),...(version.safety_notes[0]?{safetyNote:version.safety_notes.join(' ')}:{}),reheating:version.reheating??'Reheat until steaming hot.',equipment:version.equipment,...(row.primary_photo_url?{photoUrl:row.primary_photo_url}:{}),...(row.photo_attribution?{photoAttribution:row.photo_attribution}:{})}};

export const recipeApi={
  list:async()=>((await request<RecipeRow[]>('/v1/recipes')).map(mapRecipe)),
  createManual:(recipe:GeneratedRecipe)=>request<{recipeId:string;recipeVersionId:string}>('/v1/recipes',{method:'POST',body:JSON.stringify(recipe)}),
  async importMany(recipes:GeneratedRecipe[],retireTitles:string[]=[]){
    const total={imported:0,updated:0,skipped:0,retired:0,imagesAdded:0,imagesMissing:0};
    const batchSize=8;
    for(let start=0;start<recipes.length;start+=batchSize){
      const result=await request<typeof total>('/v1/recipes/import',{method:'POST',body:JSON.stringify({recipes:recipes.slice(start,start+batchSize),retireTitles:start===0?retireTitles:[]})});
      for(const key of Object.keys(total) as Array<keyof typeof total>)total[key]+=result[key]??0;
    }
    return total;
  },
  uploadPhoto:(id:string,file:File)=>{const body=new FormData();body.set('file',file);return request<{imageUrl:string}>(`/v1/recipes/${id}/photo`,{method:'POST',body})},
  delete:(id:string)=>request<{deleted:true}>(`/v1/recipes/${id}`,{method:'DELETE'}),
  createJob:(input:{protein:string;minutes:number;servings:number;notes:string})=>request<RecipeJob>('/v1/recipe-jobs',{method:'POST',body:JSON.stringify(input)}),
  latestJob:()=>request<RecipeJob|null>('/v1/recipe-jobs/latest'),
  getJob:(id:string)=>request<RecipeJob>(`/v1/recipe-jobs/${id}`),
  discardJob:(id:string)=>request<{discarded:true}>(`/v1/recipe-jobs/${id}/discard`,{method:'POST'}),
  saveJob:(id:string,recipe:GeneratedRecipe,selectedPhoto:PhotoCandidate|null)=>request<{recipeId:string;recipeVersionId:string}>(`/v1/recipe-jobs/${id}/save`,{method:'POST',body:JSON.stringify({recipe,selectedPhoto})})
};

export const prepApi={
  createJob:(input:{weekStart:string;sourceFingerprint:string;meals:PrepRequestMeal[]})=>request<PrepJob>('/v1/prep-jobs',{method:'POST',body:JSON.stringify(input)}),
  latest:(weekStart:string)=>request<PrepJob|null>(`/v1/prep-jobs/latest?weekStart=${encodeURIComponent(weekStart)}`),
  getJob:(id:string)=>request<PrepJob>(`/v1/prep-jobs/${id}`),
  updateProgress:(id:string,completedTaskIds:string[])=>request<PrepJob>(`/v1/prep-jobs/${id}`,{method:'PATCH',body:JSON.stringify({completedTaskIds})})
};

export const settingsApi={
  get:()=>request<UserSettings&{monthlySpent:string}>('/v1/settings'),
  update:(settings:UserSettings)=>request<UserSettings>('/v1/settings',{method:'PATCH',body:JSON.stringify(settings)})
};
