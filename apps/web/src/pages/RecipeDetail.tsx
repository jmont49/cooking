import { ArrowLeft, Beef, CheckCircle2, ChefHat, Clock, DollarSign, Flame, GitBranch, ImageUp, Loader2, ShoppingBasket, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { projected, convert } from '@mise/domain';
import { useStore } from '../store';
import { RecipeArtwork } from '../components/UI';
import { recipeApi } from '../lib/api';
import { demoMode } from '../lib/supabase';

export function RecipeDetail(){
  const {id}=useParams();
  const nav=useNavigate();
  const s=useStore();
  const photoInput=useRef<HTMLInputElement>(null);
  const [uploadingPhoto,setUploadingPhoto]=useState(false);
  const [photoError,setPhotoError]=useState('');
  const [photoSaved,setPhotoSaved]=useState(false);
  const r=s.recipes.find(x=>x.id===id);
  if(!r)return <p>Recipe not found.</p>;
  const missing=r.ingredients.filter(need=>!s.inventory.some(i=>i.ingredientId===need.ingredientId&&convert(projected(i),i.unit,need.unit)!==null&&Number(convert(projected(i),i.unit,need.unit))>=Number(need.quantity)));
  const uploadPhoto=async(file?:File)=>{if(!file)return;setPhotoError('');setPhotoSaved(false);if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setPhotoError('Choose a JPEG, PNG, or WebP image.');return}if(file.size>5*1024*1024){setPhotoError('Choose an image smaller than 5 MB.');return}setUploadingPhoto(true);try{await recipeApi.uploadPhoto(r.id,file);await s.refreshRecipes();setPhotoSaved(true);window.setTimeout(()=>setPhotoSaved(false),2200)}catch(error){setPhotoError(error instanceof Error?error.message:'The recipe photo could not be uploaded.')}finally{setUploadingPhoto(false)}};
  return <>
    <button onClick={()=>nav(-1)} className="mb-6 flex items-center gap-2 text-sm font-semibold text-herb-700"><ArrowLeft size={16}/>Back to recipes</button>
    <section className="overflow-hidden rounded-[2rem] bg-white shadow-soft">
      <div className="grid lg:grid-cols-[1fr_1.05fr]">
        <div className="relative grid min-h-[360px] place-items-center overflow-hidden bg-gradient-to-br from-[#c9a26b] to-[#6c4b32] text-9xl">
          <RecipeArtwork recipe={r} loading="eager"/>
          {!demoMode&&<><input ref={photoInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{const file=event.target.files?.[0];event.target.value='';void uploadPhoto(file)}}/><button type="button" disabled={uploadingPhoto} onClick={()=>photoInput.current?.click()} className="btn-secondary absolute right-4 top-4 border-0 bg-white/95 text-sm shadow-lg hover:bg-white disabled:opacity-70">{uploadingPhoto?<Loader2 className="animate-spin" size={17}/>:<ImageUp size={17}/>} {uploadingPhoto?'Uploading…':r.photoUrl?'Change photo':'Add photo'}</button></>}
        </div>
        <div className="p-7 lg:p-10">
          <p className="eyebrow">{r.cuisine} · Version {r.version}</p><h1 className="mt-3 text-4xl leading-tight sm:text-5xl">{r.title}</h1><p className="mt-4 leading-7 text-ink/60">{r.description}</p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5"><Metric icon={<Clock/>} label="Total" value={`${r.prepMinutes+r.cookMinutes} min`}/><Metric icon={<Users/>} label="Serves" value={String(r.servings)}/><Metric icon={<Flame/>} label="Per serving" value={`~${r.caloriesPerServing} cal`}/><Metric icon={<Beef/>} label="Protein" value={`~${r.proteinGramsPerServing}g`}/><Metric icon={<DollarSign/>} label="Est. cost" value={`$${r.estimatedCost}`}/></div>
          {(photoError||photoSaved)&&<p role={photoError?'alert':'status'} className={`mt-5 rounded-2xl p-3 text-sm ${photoError?'bg-red-50 text-red-700':'bg-herb-50 text-herb-800'}`}>{photoError||'Recipe photo updated.'}</p>}
          <div className="mt-7 flex flex-wrap gap-2"><Link to="/plan" className="btn-primary"><ChefHat size={17}/>Plan this meal</Link><Link to="/recipes/generate" state={{adapt:r}} className="btn-secondary"><GitBranch size={17}/>Adapt</Link>{missing.length>0&&<Link to="/groceries" className="btn-secondary"><ShoppingBasket size={17}/>Add {missing.length} missing</Link>}</div>
        </div>
      </div>
    </section>
    <div className="mt-7 grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
      <section className="card"><h2 className="text-3xl">Ingredients</h2><p className="mt-1 text-sm text-ink/50">For {r.servings} servings</p><ul className="mt-5 space-y-4">{r.ingredients.map((i,n)=>{const owned=s.inventory.some(x=>x.ingredientId===i.ingredientId&&Number(projected(x))>0);return <li key={n} className="flex items-center justify-between gap-3 border-b border-black/5 pb-3"><span><span className="font-semibold">{i.quantity} {i.unit}</span> {i.name}</span><span className={`pill ${owned?'bg-herb-100 text-herb-700':'bg-orange-100 text-orange-800'}`}>{owned?<><CheckCircle2 size={12}/>In kitchen</>:'Grocery'}</span></li>})}</ul><div className="mt-6 rounded-2xl bg-herb-50 p-4"><p className="text-sm font-semibold text-herb-700">Leftovers</p><p className="mt-1 text-sm text-ink/60">Keeps up to {r.leftoverDays} days. {r.reheating}</p></div></section>
      <section className="card"><h2 className="text-3xl">Method</h2><ol className="mt-6 space-y-6">{r.steps.map((step,i)=><li key={i} className="flex gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-herb-600 font-semibold text-white">{i+1}</span><p className="pt-1.5 leading-6 text-ink/75">{step}</p></li>)}</ol>{r.safetyNote&&<div className="mt-7 rounded-2xl bg-orange-50 p-4 text-sm text-orange-900"><strong>Food safety:</strong> {r.safetyNote}</div>}</section>
    </div>
  </>;
}

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div>{<span className="text-herb-600 [&>svg]:size-17">{icon}</span>}<p className="mt-2 text-xs text-ink/40">{label}</p><p className="font-semibold">{value}</p></div>}
