import { AlertCircle, CheckCircle2, Loader2, PackageCheck, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageTitle } from '../components/UI';
import { useStore } from '../store';

export function Kitchen(){
  const s=useStore();
  const [query,setQuery]=useState('');
  const [adding,setAdding]=useState(false);
  const [removing,setRemoving]=useState('');
  const shown=s.inventory.filter(item=>Number(item.quantity)>0&&item.name.toLowerCase().includes(query.toLowerCase()));
  const remove=async(id:string,name:string)=>{if(!confirm(`Remove ${name} from your kitchen?`))return;setRemoving(id);try{await s.removeInventory(id)}finally{setRemoving('')}};

  return <>
    <PageTitle eyebrow="Simple kitchen inventory" title="Only track what you have." description="If an ingredient is listed here, Shua assumes you have enough. No quantities, reservations, expiration checks, or follow-up confirmations." action={<button className="btn-primary" onClick={()=>setAdding(true)}><Plus size={17}/>I have an ingredient</button>}/>
    {s.inventoryError&&<div role="alert" className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800"><span className="flex items-center gap-2"><AlertCircle size={18}/>{s.inventoryError}</span><button className="font-semibold" onClick={()=>void s.refreshInventory()}>Retry</button></div>}
    {adding&&<AddInventory onClose={()=>setAdding(false)}/>}
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-3xl">In your kitchen</h2><p className="mt-1 text-sm text-ink/50">{shown.length} {shown.length===1?'ingredient':'ingredients'} shown</p></div><label className="relative"><span className="sr-only">Search inventory</span><Search className="absolute left-4 top-3.5 text-ink/35" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search ingredients" className="field pl-11"/></label></div>
    {s.inventoryLoading?<div className="card grid min-h-44 place-items-center"><Loader2 className="animate-spin text-herb-600"/></div>:shown.length===0?<div className="card grid min-h-52 place-items-center text-center"><div><PackageCheck className="mx-auto text-herb-600" size={30}/><h3 className="mt-4 text-2xl">{query?'No matching ingredients':'Nothing listed yet'}</h3><p className="mt-2 text-sm text-ink/50">{query?'Try another search.':'Add anything you know is currently in your kitchen.'}</p></div></div>:<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shown.map(item=><article key={item.id} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-soft"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-herb-100 text-herb-700"><CheckCircle2 size={19}/></span><div className="min-w-0 flex-1"><p className="font-semibold">{item.name}</p><p className="text-xs text-ink/45">Available · {item.location}</p></div><button type="button" disabled={removing===item.id} onClick={()=>void remove(item.id,item.name)} aria-label={`Remove ${item.name}`} className="grid size-9 place-items-center rounded-full text-red-700 hover:bg-red-50 disabled:opacity-50">{removing===item.id?<Loader2 className="animate-spin" size={16}/>:<Trash2 size={16}/>}</button></article>)}</div>}
  </>;
}

function AddInventory({onClose}:{onClose:()=>void}){
  const s=useStore();
  const available=s.ingredientCatalog.filter(option=>!s.inventory.some(item=>item.ingredientId===option.id&&Number(item.quantity)>0));
  const [ingredientId,setIngredientId]=useState(available[0]?.id??'');
  const [location,setLocation]=useState('Pantry');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{if(!ingredientId&&available[0])setIngredientId(available[0].id)},[ingredientId,available]);
  const selected=s.ingredientCatalog.find(option=>option.id===ingredientId);
  const submit=async(event:React.FormEvent)=>{event.preventDefault();if(!selected)return;setError('');setSaving(true);try{await s.addInventory({ingredientId,quantity:'1',unit:selected.default_unit,location});onClose()}catch(reason){setError(reason instanceof Error?reason.message:'Could not add this ingredient.')}finally{setSaving(false)}};
  return <section className="card mb-8"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Presence only</p><h2 className="mt-2 text-3xl">What do you have?</h2><p className="mt-2 text-sm text-ink/50">You will never be asked how much.</p></div><button onClick={onClose} aria-label="Close add ingredient form" className="rounded-full p-2 hover:bg-black/5"><X/></button></div><form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-[1fr_180px_auto]"><label className="text-sm font-semibold">Ingredient<select required className="field mt-2" value={ingredientId} onChange={event=>setIngredientId(event.target.value)}><option value="">Select an ingredient</option>{available.map(option=><option key={option.id} value={option.id}>{option.name} · {option.category}</option>)}</select></label><label className="text-sm font-semibold">Stored in<select className="field mt-2" value={location} onChange={event=>setLocation(event.target.value)}><option>Pantry</option><option>Fridge</option><option>Freezer</option></select></label><div className="flex items-end"><button disabled={saving||!ingredientId} className="btn-primary w-full">{saving?<Loader2 className="animate-spin" size={17}/>:<Plus size={17}/>}Add</button></div>{error&&<p role="alert" className="text-sm text-red-700 sm:col-span-full">{error}</p>}</form></section>;
}
