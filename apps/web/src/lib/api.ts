import type { Unit } from '@mise/domain';
import { supabase } from './supabase';

const apiUrl=(import.meta.env.VITE_API_URL as string|undefined)?.replace(/\/$/,'');

interface Envelope<T>{requestId:string;data:T}
interface ErrorEnvelope{requestId:string;error:{code:string;message:string;retryable:boolean;confirmationToken?:string;summary?:string}}
export interface IngredientOption{id:string;slug:string;name:string;category:string;default_unit:Unit;perishable:boolean;default_shelf_days:number|null}
export interface InventoryRow{id:string;ingredient_id:string;quantity:string;reserved_quantity:string;unit:Unit;confidence:string;estimated_expiration_date:string|null;last_confirmed_at:string|null;ingredients:{name:string;category:string};storage_locations:{name:string}|null}
export type IntegrationScope='inventory:read'|'inventory:write'|'recipes:read'|'recipes:write'|'plans:read'|'plans:write'|'cooking:write'|'feedback:write'|'groceries:read'|'groceries:write'|'budget:read';
export interface CreatedIntegrationToken{id:string;name:string;token_prefix:string;scopes:IntegrationScope[];created_at:string;token:string;displayedOnce:true}

export class ShuaApiError extends Error{constructor(public code:string,message:string,public retryable=false,public confirmationToken?:string,public summary?:string){super(message)}}

async function request<T>(path:string,init:RequestInit={}):Promise<T>{
  if(!apiUrl||!supabase)throw new ShuaApiError('configuration_missing','Shua API configuration is missing.');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new ShuaApiError('unauthorized','Your session expired. Sign in again.');
  const response=await fetch(`${apiUrl}${path}`,{...init,headers:{authorization:`Bearer ${session.access_token}`,'content-type':'application/json',...(init.headers??{})}});
  const payload=await response.json() as Envelope<T>|ErrorEnvelope;
  if(!response.ok){const failure=payload as ErrorEnvelope;throw new ShuaApiError(failure.error?.code??'request_failed',failure.error?.message??'The request failed.',failure.error?.retryable,failure.error?.confirmationToken,failure.error?.summary)}
  return (payload as Envelope<T>).data;
}

export const inventoryApi={
  list:()=>request<InventoryRow[]>('/v1/inventory'),
  ingredients:()=>request<IngredientOption[]>('/v1/ingredients'),
  add:(input:{ingredientId:string;quantity:string;unit:Unit;location:string;expiresOn?:string})=>request<InventoryRow>('/v1/inventory',{method:'POST',headers:{'idempotency-key':crypto.randomUUID()},body:JSON.stringify(input)}),
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
