import type { GeneratedRecipe } from '@mise/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase',()=>({
  demoMode:false,
  supabase:{auth:{getSession:vi.fn().mockResolvedValue({data:{session:{access_token:'test-token'}}})}}
}));

const recipe=(index:number):GeneratedRecipe=>({
  title:`Starter recipe ${index}`,description:'A complete test recipe.',servings:2,prepMinutes:10,cookMinutes:20,difficulty:'Easy',estimatedCost:'10.00',caloriesPerServing:600,proteinGramsPerServing:45,
  ingredients:[{ingredientId:'chicken',name:'Chicken breast',quantity:'0.75',unit:'lb'},{ingredientId:'rice',name:'Rice',quantity:'0.75',unit:'cup'}],steps:['Cook the complete meal safely.'],equipment:[],safetyNotes:['Cook chicken to 165°F.'],substitutions:[],tags:['starter'],cuisine:'American',protein:'Chicken breast',cleanup:1,leftoverQuality:5,leftoverDays:1,reheating:'Reheat until steaming.',flavorProfile:[],leftoverGuidance:'Refrigerate promptly.',imageSearchQuery:`starter chicken ${index}`,confidence:1,unresolvedIngredientMappings:[]
});

describe('starter recipe import',()=>{
  beforeEach(()=>{vi.resetModules();vi.stubEnv('VITE_API_URL','https://api.test');});
  afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()});

  it('imports a large collection in small batches and aggregates every result',async()=>{
    const bodies:Array<{recipes:GeneratedRecipe[];retireTitles:string[]}>=[];
    const fetchMock=vi.fn(async(_input:string|URL|Request,init?:RequestInit)=>{
      const body=JSON.parse(String(init?.body)) as {recipes:GeneratedRecipe[];retireTitles:string[]};bodies.push(body);
      return new Response(JSON.stringify({requestId:'test',data:{imported:body.recipes.length,updated:0,skipped:0,retired:body.retireTitles.length,imagesAdded:0,imagesMissing:body.recipes.length}}),{status:201,headers:{'content-type':'application/json'}});
    });
    vi.stubGlobal('fetch',fetchMock);
    const {recipeApi}=await import('./api');

    const result=await recipeApi.importMany(Array.from({length:17},(_,index)=>recipe(index)),['Old starter one','Old starter two']);

    expect(bodies.map(body=>body.recipes.length)).toEqual([8,8,1]);
    expect(bodies.map(body=>body.retireTitles.length)).toEqual([2,0,0]);
    expect(result).toEqual({imported:17,updated:0,skipped:0,retired:2,imagesAdded:0,imagesMissing:17});
  });

  it('lets the browser set the multipart boundary for photo uploads',async()=>{
    const fetchMock=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({requestId:'test',data:{imageUrl:'https://signed.test/photo'}}),{status:201,headers:{'content-type':'application/json'}}));
    vi.stubGlobal('fetch',fetchMock);
    const {recipeApi}=await import('./api');
    const file=new File([new Uint8Array([0xff,0xd8,0xff,0xdb])],'dinner.jpg',{type:'image/jpeg'});

    await recipeApi.uploadPhoto('11111111-1111-4111-8111-111111111111',file);

    const [,init]=fetchMock.mock.calls[0]!;if(!init)throw new Error('Expected fetch options.');const headers=init.headers as Record<string,string>;
    expect(init.body).toBeInstanceOf(FormData);
    expect(headers.authorization).toBe('Bearer test-token');
    expect(headers['content-type']).toBeUndefined();
  });
});
