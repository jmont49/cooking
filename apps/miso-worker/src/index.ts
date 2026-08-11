import { randomUUID } from 'node:crypto';
import { generatedRecipeSchema, weeklyPrepPlanSchema, type GeneratedRecipe, type WeeklyPrepPlan } from '@mise/contracts';

const shuaApi=(process.env.SHUA_API_URL??'').replace(/\/$/,'');
const shuaToken=process.env.SHUA_INTEGRATION_TOKEN;
const misoApi=(process.env.MISO_API_URL??'http://127.0.0.1:8642/v1').replace(/\/$/,'');
const misoKey=process.env.MISO_API_KEY??process.env.API_SERVER_KEY;
const pollMs=Math.max(5000,Number(process.env.MISO_WORKER_POLL_MS??10000));
if(!shuaApi||!shuaToken||!misoKey){process.stderr.write('SHUA_API_URL, SHUA_INTEGRATION_TOKEN, and MISO_API_KEY (or API_SERVER_KEY) are required.\n');process.exit(1)}

interface Envelope<T>{requestId:string;data:T}
interface Job{id:string;request:{protein:string;minutes:number;servings:number;notes:string}}
interface PrepJob{id:string;request:{weekStart:string;sourceFingerprint:string;meals:Array<{mealId:string;date:string;title:string;servings:number;recipeTitle:string;ingredients:Array<{ingredientId:string;name:string;quantity:string;unit:string}>;steps:string[];equipment:string[];safetyNote:string}>}}
interface Ingredient{id:string;name:string;default_unit:string}
interface InventoryRow{ingredient_id:string;quantity:string;unit:string;ingredients:{name:string}}

async function shua<T>(path:string,method='GET',body?:unknown):Promise<T>{
  const response=await fetch(`${shuaApi}${path}`,{method,headers:{authorization:`Bearer ${shuaToken}`,'content-type':'application/json',...(method==='GET'?{}:{'idempotency-key':randomUUID()})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const payload=await response.json() as Envelope<T>&{error?:{message?:string}};
  if(!response.ok)throw new Error(payload.error?.message??`shua_http_${response.status}`);
  return payload.data;
}

async function healthy(){try{const response=await fetch(`${misoApi.replace(/\/v1$/,'')}/health`,{headers:{authorization:`Bearer ${misoKey}`}});return response.ok}catch{return false}}

function parseJson(content:string):unknown{
  const clean=content.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  try{return JSON.parse(clean)}catch{const start=clean.indexOf('{');const end=clean.lastIndexOf('}');if(start<0||end<=start)throw new Error('miso_response_was_not_json');return JSON.parse(clean.slice(start,end+1))}
}

function normalizeMappings(recipe:GeneratedRecipe,catalog:Ingredient[]):GeneratedRecipe{
  const byId=new Map(catalog.map(row=>[row.id,row]));
  const byName=new Map(catalog.map(row=>[row.name.toLowerCase(),row]));
  const unresolved:string[]=[];
  const ingredients=recipe.ingredients.map(item=>{const match=byId.get(item.ingredientId)??byName.get(item.name.toLowerCase());if(match)return {...item,ingredientId:match.id,name:match.name};unresolved.push(item.name);return {...item,ingredientId:`unresolved:${item.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`}});
  return {...recipe,ingredients,unresolvedIngredientMappings:unresolved};
}

async function askMiso(job:Job,catalog:Ingredient[],inventory:InventoryRow[]):Promise<GeneratedRecipe>{
  const schema={title:'string',description:'string',servings:'integer 1-24',prepMinutes:'integer',cookMinutes:'integer',difficulty:'Easy | Medium | Ambitious',estimatedCost:'decimal string',cuisine:'string',protein:'string',cleanup:'integer 1-5',leftoverQuality:'integer 1-5',leftoverDays:'integer 0-7',reheating:'string',ingredients:[{ingredientId:'canonical UUID when matched; otherwise unresolved',name:'string',quantity:'positive decimal string',unit:'one of count, serving, tsp, tbsp, fl_oz, cup, oz, lb, g, kg, ml, l, package, bag, can, bottle, bunch',optional:'boolean'}],steps:['string'],equipment:['string'],safetyNotes:['string'],substitutions:['string'],tags:['string'],flavorProfile:['string'],leftoverGuidance:'string',imageSearchQuery:'must be exactly identical to title',confidence:'number 0-1',unresolvedIngredientMappings:['string']};
  const prompt={request:job.request,currentInventory:inventory.map(row=>({ingredientId:row.ingredient_id,name:row.ingredients.name,quantity:row.quantity,unit:row.unit})),canonicalIngredients:catalog,schema};
  const response=await fetch(`${misoApi}/chat/completions`,{method:'POST',headers:{authorization:`Bearer ${misoKey}`,'content-type':'application/json'},body:JSON.stringify({model:'miso',temperature:0.35,messages:[{role:'system',content:'You create safe, coherent, practical recipes for Shua. Return ONLY one JSON object matching the provided schema. Prefer current inventory, respect constraints, use canonical ingredient UUIDs exactly when names match, include explicit food-safety temperatures where relevant, and never invent an image URL.'},{role:'user',content:JSON.stringify(prompt)}]})});
  if(!response.ok)throw new Error(`miso_http_${response.status}`);
  const payload=await response.json() as {choices?:Array<{message?:{content?:string}}>};
  const content=payload.choices?.[0]?.message?.content;if(!content)throw new Error('miso_empty_response');
  return normalizeMappings(generatedRecipeSchema.parse(parseJson(content)),catalog);
}

async function askMisoForPrep(job:PrepJob):Promise<WeeklyPrepPlan>{
  const schema={weekStart:'YYYY-MM-DD exactly as supplied',summary:'string',totalMinutes:'integer equal to sum of task estimatedMinutes',estimatedWeeknightMinutesSaved:'integer equal to sum of task weekdayMinutesSaved',generatedAt:'ISO datetime',tasks:[{id:'unique stable kebab-case string',order:'integer starting at 1',title:'concise combined task',action:'complete instruction',estimatedMinutes:'integer',weekdayMinutesSaved:'integer',storage:'specific labeling and refrigerator/freezer instruction',foodSafety:'optional safety guidance',ingredients:[{ingredientId:'exact supplied id',name:'exact supplied name',totalQuantity:'decimal string exactly equal to allocation sum',unit:'exact supplied unit',allocations:[{mealId:'exact supplied id',mealTitle:'exact supplied title',mealDate:'exact supplied date',quantity:'decimal string no greater than supplied recipe amount',unit:'exact supplied unit'}]}]}]};
  const response=await fetch(`${misoApi}/chat/completions`,{method:'POST',headers:{authorization:`Bearer ${misoKey}`,'content-type':'application/json'},body:JSON.stringify({model:'miso',temperature:.2,messages:[{role:'system',content:'You create one cohesive, safe Sunday prep session for Shua. Return ONLY one JSON object matching the supplied schema. Combine identical actions on the same canonical ingredient and add their quantities, such as two 1-count diced-onion allocations becoming one 2-count task. Keep different cuts or preparations separate. Every total must exactly equal its allocations. Use only supplied meal IDs, ingredient IDs, quantities, and units; never convert units or invent ingredients. Tell the cook how to divide and label portions. Do not recommend unsafe make-ahead work: keep raw proteins separate, do not prep delicate seafood early, freeze cooked food needed beyond safe refrigeration, and include specific food-safety guidance where relevant. Prefer useful work that materially reduces weeknight effort.'},{role:'user',content:JSON.stringify({request:job.request,schema})}]})});
  if(!response.ok)throw new Error(`miso_http_${response.status}`);
  const payload=await response.json() as {choices?:Array<{message?:{content?:string}}>};const content=payload.choices?.[0]?.message?.content;if(!content)throw new Error('miso_empty_response');
  return weeklyPrepPlanSchema.parse(parseJson(content));
}

async function runOnce(){
  if(!await healthy())return false;
  const recipeJob=await shua<Job|null>('/recipe-jobs/claim','POST',{});
  if(recipeJob){try{const [catalog,inventory]=await Promise.all([shua<Ingredient[]>('/ingredients'),shua<InventoryRow[]>('/inventory')]);const recipe=await askMiso(recipeJob,catalog,inventory);await shua(`/recipe-jobs/${recipeJob.id}/complete`,'POST',recipe);process.stdout.write(`Completed recipe job ${recipeJob.id}: ${recipe.title}\n`)}catch(error){const code=error instanceof Error?error.message:'miso_worker_failed';process.stderr.write(`Recipe job ${recipeJob.id} failed: ${code}\n`);await shua(`/recipe-jobs/${recipeJob.id}/fail`,'POST',{errorCode:code}).catch(()=>undefined)}return true}
  const prepJob=await shua<PrepJob|null>('/prep-jobs/claim','POST',{});if(!prepJob)return false;
  try{const prepPlan=await askMisoForPrep(prepJob);await shua(`/prep-jobs/${prepJob.id}/complete`,'POST',prepPlan);process.stdout.write(`Completed weekly prep job ${prepJob.id}: ${prepPlan.tasks.length} tasks\n`)}
  catch(error){const code=error instanceof Error?error.message:'miso_worker_failed';process.stderr.write(`Weekly prep job ${prepJob.id} failed: ${code}\n`);await shua(`/prep-jobs/${prepJob.id}/fail`,'POST',{errorCode:code}).catch(()=>undefined)}
  return true;
}

const once=process.argv.includes('--once');
do{const worked=await runOnce();if(once)break;await new Promise(resolve=>setTimeout(resolve,worked?1000:pollMs))}while(!once);
