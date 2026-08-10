#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

const baseUrl=(process.env.SHUA_API_URL??process.env.MISE_API_URL??'http://127.0.0.1:54321/functions/v1/api/v1').replace(/\/$/,'');
const token=process.env.SHUA_INTEGRATION_TOKEN??process.env.MISE_INTEGRATION_TOKEN;
if(!token){process.stderr.write('SHUA_INTEGRATION_TOKEN is required\n');process.exit(1)}

async function call(path:string,method='GET',body?:unknown,confirmationToken?:string){const headers:Record<string,string>={authorization:`Bearer ${token}`,'content-type':'application/json'};if(method!=='GET')headers['idempotency-key']=randomUUID();if(confirmationToken)headers['x-confirmation-token']=confirmationToken;const response=await fetch(`${baseUrl}${path}`,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await response.json();if(!response.ok&&response.status!==409)throw new Error(`${response.status}: ${JSON.stringify(data)}`);return data}
const server=new McpServer({name:'shua-cooking-tools',version:'1.0.0'});
const result=(value:unknown)=>({content:[{type:'text' as const,text:JSON.stringify(value,null,2)}],structuredContent:typeof value==='object'&&value!==null?value as Record<string,unknown>:{value}});

server.tool('get_inventory','Read current confirmed, reserved, and projected inventory.',{},async()=>result(await call('/inventory')));
server.tool('search_inventory','Search inventory by ingredient name.',{query:z.string()},async({query})=>{const response:any=await call('/inventory');const rows=(response.data??[]).filter((x:any)=>String(x.ingredients?.name??'').toLowerCase().includes(query.toLowerCase()));return result({...response,data:rows})});
server.tool('get_expiring_items','Get inventory estimated to expire in the next three days.',{},async()=>result(await call('/inventory/expiring')));
server.tool('search_ingredients','Find canonical ingredients that can be added to Shua.',{query:z.string().default('')},async({query})=>result(await call(`/ingredients?q=${encodeURIComponent(query)}`)));
server.tool('add_inventory','Add a new ingredient amount to Shua inventory.',{ingredientId:z.string().uuid(),quantity:z.string().regex(/^\d+(\.\d{1,4})?$/),unit:z.string(),location:z.string().default('Pantry'),expiresOn:z.string().optional()},async(body)=>result(await call('/inventory','POST',body)));
server.tool('adjust_inventory','Apply a scoped, auditable inventory delta. Large changes return confirmation_required.',{inventoryItemId:z.string().uuid(),quantityDelta:z.string(),unit:z.string(),reason:z.enum(['manual','discarded','expired','cooking_difference']),confirmationToken:z.string().optional()},async({confirmationToken,...body})=>result(await call('/inventory/adjust','POST',body,confirmationToken)));
server.tool('confirm_inventory_item','Confirm or correct one inventory item.',{inventoryItemId:z.string().uuid(),quantityDelta:z.string(),unit:z.string(),confirmationToken:z.string().optional()},async({confirmationToken,...body})=>result(await call('/inventory/adjust','POST',{...body,reason:'manual'},confirmationToken)));
server.tool('get_current_week_plan','Read the current weekly plan and planned meals.',{},async()=>result(await call('/plans/current')));
server.tool('get_planned_meal','Read a planned meal from the current plan.',{mealId:z.string().uuid()},async({mealId})=>{const response:any=await call('/plans/current');const meals=response.data?.planned_meals??[];return result({requestId:response.requestId,data:meals.find((x:any)=>x.id===mealId)??null})});
server.tool('search_recipes','Search saved recipes.',{query:z.string().default('')},async({query})=>{const response:any=await call('/recipes');return result({...response,data:(response.data??[]).filter((x:any)=>x.title.toLowerCase().includes(query.toLowerCase()))})});
server.tool('get_recipe','Get a saved recipe and all versioned ingredients and steps.',{recipeId:z.string().uuid()},async({recipeId})=>{const response:any=await call('/recipes');return result({...response,data:(response.data??[]).find((x:any)=>x.id===recipeId)??null})});
server.tool('generate_recipe_draft','Generate a schema-validated unsaved recipe draft.',{protein:z.string().optional(),servings:z.number().positive().optional(),budget:z.number().positive().optional(),minutes:z.number().positive().optional(),constraints:z.array(z.string()).optional()},async(body)=>result(await call('/recipes/generate','POST',body)));
server.tool('adapt_recipe_draft','Generate a new unsaved version of a recipe.',{recipeId:z.string().uuid(),instructions:z.array(z.string()).min(1)},async(body)=>result(await call('/recipes/adapt','POST',body)));
server.tool('record_meal_feedback','Interpret meal feedback into a reviewable proposal without accepting it.',{notes:z.string(),tags:z.array(z.string()).default([])},async(body)=>result(await call('/feedback/interpret','POST',body)));
server.tool('get_grocery_list','Read the active consolidated grocery list.',{},async()=>result(await call('/groceries')));
server.tool('get_budget_summary','Read current monthly grocery spending and remaining budget.',{},async()=>result(await call('/budget')));

await server.connect(new StdioServerTransport());
