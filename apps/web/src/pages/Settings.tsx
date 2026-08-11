import { Bot, Check, ClipboardCopy, Info, KeyRound, Loader2, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageTitle } from '../components/UI';
import { integrationApi, type CreatedIntegrationToken, type IntegrationScope } from '../lib/api';
import { demoMode } from '../lib/supabase';
import { useStore } from '../store';

const misoScopes:IntegrationScope[]=['inventory:read','inventory:write','recipes:read','recipes:write','plans:read','plans:write'];

export function Settings(){
  const s=useStore();
  const [saved,setSaved]=useState(false);
  const [savingSettings,setSavingSettings]=useState(false);
  const [settings,setSettings]=useState(s.settings);
  const [settingsError,setSettingsError]=useState('');
  const [ai,setAi]=useState(true);
  const [creating,setCreating]=useState(false);
  const [createdToken,setCreatedToken]=useState<CreatedIntegrationToken|null>(null);
  const [tokenError,setTokenError]=useState('');
  const [copied,setCopied]=useState(false);
  useEffect(()=>setSettings(s.settings),[s.settings]);

  const createMisoToken=async()=>{
    setCreating(true);setTokenError('');setCreatedToken(null);
    try{setCreatedToken(await integrationApi.create('Miso cooking',misoScopes))}
    catch(error){setTokenError(error instanceof Error?error.message:'The Miso token could not be created.')}
    finally{setCreating(false)}
  };
  const copyToken=async()=>{if(!createdToken)return;await navigator.clipboard.writeText(createdToken.token);setCopied(true);window.setTimeout(()=>setCopied(false),1800)};
  const save=async()=>{setSettingsError('');if(!Number.isFinite(Number(settings.monthlyBudget))||Number(settings.monthlyBudget)<0){setSettingsError('Enter a valid non-negative monthly grocery target.');return}setSavingSettings(true);try{await s.saveSettings(settings);setSaved(true);window.setTimeout(()=>setSaved(false),1800)}catch(error){setSettingsError(error instanceof Error?error.message:'Settings could not be saved.')}finally{setSavingSettings(false)}};

  return <>
    <PageTitle eyebrow="Editable defaults" title="Make Shua yours." description="Budget, staples, planning rhythm, preferences, AI, and integration access stay under your control." action={<button onClick={()=>void save()} disabled={savingSettings} className="btn-primary">{savingSettings?<Loader2 className="animate-spin" size={17}/>:saved?<Check size={17}/>:<Save size={17}/>} {saved?'Saved':'Save settings'}</button>}/>
    {settingsError&&<p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{settingsError}</p>}
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card"><h2 className="text-3xl">Planning & budget</h2><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">Monthly grocery target<input className="field mt-2" min="0" step="1" type="number" value={settings.monthlyBudget} onChange={e=>setSettings({...settings,monthlyBudget:e.target.value})}/></label><label className="text-sm font-semibold">Weekday time limit<select className="field mt-2" value={settings.weekdayLimit} onChange={e=>setSettings({...settings,weekdayLimit:Number(e.target.value)})}><option value="30">30 minutes</option><option value="40">40 minutes</option><option value="60">60 minutes</option></select></label></div><label className="mt-5 flex items-center gap-3 rounded-2xl bg-black/[.025] p-4"><input type="checkbox" className="size-5 accent-herb-600" checked={settings.planLunch} onChange={e=>setSettings({...settings,planLunch:e.target.checked})}/><span><span className="block font-semibold">Plan dinner as next-day lunch</span><span className="text-xs text-ink/45">Favor recipes that reheat well.</span></span></label><label className="mt-3 flex items-center gap-3 rounded-2xl bg-black/[.025] p-4"><input type="checkbox" className="size-5 accent-herb-600" checked={settings.coveredStaples} onChange={e=>setSettings({...settings,coveredStaples:e.target.checked})}/><span><span className="block font-semibold">Rice, pasta, oats & flour are covered staples</span><span className="text-xs text-ink/45">Saved for grocery-cost handling as that integration is expanded.</span></span></label></section>
      <section className="card"><h2 className="text-3xl">Taste & exploration</h2><label className="mt-6 block text-sm font-semibold">Familiar ↔ exploratory <span className="ml-2 text-herb-700">{settings.exploration}%</span><input type="range" min="0" max="100" value={settings.exploration} onChange={e=>setSettings({...settings,exploration:Number(e.target.value)})} className="mt-3 w-full accent-herb-600"/></label><div className="mt-2 flex justify-between text-xs text-ink/40"><span>Mostly favorites</span><span>Try new things</span></div><div className="mt-5 flex gap-3 rounded-2xl bg-herb-50 p-4 text-sm leading-6 text-ink/65"><Info className="mt-0.5 shrink-0 text-herb-600" size={18}/><p>This changes recommendation scoring immediately after you save. Moving right gives more weight to unfamiliar proteins and variety; moving left gives more weight to your preferred proteins and positively rated meals. It never blocks a recipe from appearing.</p></div><label className="mt-6 block text-sm font-semibold">Preferred proteins<input className="field mt-2" value={settings.preferredProteins} onChange={e=>setSettings({...settings,preferredProteins:e.target.value})}/></label><label className="mt-5 block text-sm font-semibold">Exclusions or notes<textarea className="field mt-2 min-h-24" value={settings.exclusions} onChange={e=>setSettings({...settings,exclusions:e.target.value})}/></label></section>
      <section className="card"><div className="flex items-center gap-3"><Bot className="text-herb-600"/><h2 className="text-3xl">Optional AI</h2></div><p className="mt-3 text-sm leading-6 text-ink/55">AI is used only after an explicit recipe, weekly prep, feedback, explanation, or receipt-scan request. Inventory changes never depend on it.</p><label className="mt-5 flex items-center justify-between rounded-2xl bg-herb-50 p-4"><span><span className="block font-semibold">Enable AI features</span><span className="text-xs text-ink/45">Provider: Miso connection pending</span></span><input type="checkbox" checked={ai} onChange={e=>setAi(e.target.checked)} className="size-5 accent-herb-600"/></label></section>
      <section className="card">
        <div className="flex items-center gap-3"><ShieldCheck className="text-herb-600"/><h2 className="text-3xl">Miso integration</h2></div>
        <p className="mt-3 text-sm leading-6 text-ink/55">Create a limited token that lets Miso work with inventory, recipe drafts, and weekly prep drafts. Shua validates combined quantities before accepting a prep plan, and Miso cannot access the database directly.</p>
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
