import { Bot, Check, ClipboardCopy, KeyRound, Loader2, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { PageTitle } from '../components/UI';
import { integrationApi, type CreatedIntegrationToken, type IntegrationScope } from '../lib/api';
import { demoMode } from '../lib/supabase';
import { useStore } from '../store';

const misoScopes:IntegrationScope[]=['inventory:read','inventory:write','recipes:read','recipes:write'];

export function Settings(){
  const s=useStore();
  const [saved,setSaved]=useState(false);
  const [ai,setAi]=useState(true);
  const [creating,setCreating]=useState(false);
  const [createdToken,setCreatedToken]=useState<CreatedIntegrationToken|null>(null);
  const [tokenError,setTokenError]=useState('');
  const [copied,setCopied]=useState(false);

  const createMisoToken=async()=>{
    setCreating(true);setTokenError('');setCreatedToken(null);
    try{setCreatedToken(await integrationApi.create('Miso cooking',misoScopes))}
    catch(error){setTokenError(error instanceof Error?error.message:'The Miso token could not be created.')}
    finally{setCreating(false)}
  };
  const copyToken=async()=>{if(!createdToken)return;await navigator.clipboard.writeText(createdToken.token);setCopied(true);window.setTimeout(()=>setCopied(false),1800)};

  return <>
    <PageTitle eyebrow="Editable defaults" title="Make Shua yours." description="Budget, staples, planning rhythm, preferences, AI, and integration access stay under your control." action={<button onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),1800)}} className="btn-primary"><Save size={17}/>{saved?'Saved':'Save settings'}</button>}/>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card"><h2 className="text-3xl">Planning & budget</h2><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">Monthly grocery target<input className="field mt-2" type="number" defaultValue="240"/></label><label className="text-sm font-semibold">Weekday time limit<select className="field mt-2" defaultValue="40"><option value="30">30 minutes</option><option value="40">40 minutes</option><option value="60">60 minutes</option></select></label></div><label className="mt-5 flex items-center gap-3 rounded-2xl bg-black/[.025] p-4"><input type="checkbox" className="size-5 accent-herb-600" defaultChecked/><span><span className="block font-semibold">Plan dinner as next-day lunch</span><span className="text-xs text-ink/45">Favor recipes that reheat well.</span></span></label><label className="mt-3 flex items-center gap-3 rounded-2xl bg-black/[.025] p-4"><input type="checkbox" className="size-5 accent-herb-600" defaultChecked/><span><span className="block font-semibold">Rice, pasta, oats & flour are covered staples</span><span className="text-xs text-ink/45">Still tracked, excluded from the default grocery budget.</span></span></label></section>
      <section className="card"><h2 className="text-3xl">Taste & exploration</h2><label className="mt-6 block text-sm font-semibold">Familiar ↔ exploratory<input type="range" min="0" max="100" defaultValue="40" className="mt-3 w-full accent-herb-600"/></label><div className="mt-2 flex justify-between text-xs text-ink/40"><span>Mostly favorites</span><span>Try new things</span></div><label className="mt-6 block text-sm font-semibold">Preferred proteins<input className="field mt-2" defaultValue="Chicken breast, salmon, ground beef, eggs, white fish"/></label><label className="mt-5 block text-sm font-semibold">Exclusions or notes<textarea className="field mt-2 min-h-24" defaultValue="Avoid shrimp that requires extensive prep. Chicken thighs can have an undesirable taste."/></label></section>
      <section className="card"><div className="flex items-center gap-3"><Bot className="text-herb-600"/><h2 className="text-3xl">Optional AI</h2></div><p className="mt-3 text-sm leading-6 text-ink/55">AI is used only after an explicit generate, adapt, interpret, explain, or receipt-scan action. Inventory and planning never depend on it.</p><label className="mt-5 flex items-center justify-between rounded-2xl bg-herb-50 p-4"><span><span className="block font-semibold">Enable AI features</span><span className="text-xs text-ink/45">Provider: Miso connection pending</span></span><input type="checkbox" checked={ai} onChange={e=>setAi(e.target.checked)} className="size-5 accent-herb-600"/></label></section>
      <section className="card">
        <div className="flex items-center gap-3"><ShieldCheck className="text-herb-600"/><h2 className="text-3xl">Miso integration</h2></div>
        <p className="mt-3 text-sm leading-6 text-ink/55">Create a limited token that lets Miso read and update inventory and work with recipe drafts. It cannot access the database directly.</p>
        <div className="mt-4 flex flex-wrap gap-2">{misoScopes.map(scope=><span key={scope} className="rounded-full bg-herb-50 px-3 py-1 text-xs font-semibold text-herb-700">{scope}</span>)}</div>
        {!demoMode&&<button className="btn-secondary mt-5" onClick={createMisoToken} disabled={creating}>{creating?<Loader2 className="animate-spin" size={16}/>:<KeyRound size={16}/>}Create Miso token</button>}
        {demoMode&&<p className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm text-orange-900">Token creation is available after connecting Shua to Supabase.</p>}
        {tokenError&&<p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{tokenError}</p>}
        {createdToken&&<div className="mt-5 rounded-2xl border border-tomato-200 bg-tomato-50 p-4"><p className="font-semibold text-tomato-900">Copy this token now</p><p className="mt-1 text-xs leading-5 text-tomato-800">It is shown once. Store it only in Miso's private configuration on the HP laptop.</p><code className="mt-3 block break-all rounded-xl bg-white p-3 text-xs text-ink">{createdToken.token}</code><button className="btn-secondary mt-3" onClick={copyToken}>{copied?<Check size={16}/>:<ClipboardCopy size={16}/>} {copied?'Copied':'Copy token'}</button></div>}
        {demoMode&&<div className="mt-6 border-t border-black/5 pt-5"><button onClick={()=>{if(confirm('Reset all local demo data?'))s.resetDemo()}} className="btn-secondary text-red-700"><RotateCcw size={16}/>Reset local demo</button></div>}
      </section>
    </div>
  </>;
}
