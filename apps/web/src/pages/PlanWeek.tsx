import { Check, ChevronLeft, ChevronRight, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PageTitle, RecipeCard } from '../components/UI';
import { useStore } from '../store';

function currentMonday(){const date=new Date();const daysSinceMonday=(date.getDay()+6)%7;date.setDate(date.getDate()-daysSinceMonday);date.setHours(12,0,0,0);return date}
function weekDates(offset:number){const start=currentMonday();start.setDate(start.getDate()+offset*7);return Array.from({length:7},(_,index)=>{const date=new Date(start);date.setDate(start.getDate()+index);return date})}
function dateKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function weekLabel(dates:Date[]){const first=dates[0]!,last=dates[6]!;const firstLabel=first.toLocaleDateString(undefined,{month:'short',day:'numeric'});const lastLabel=last.toLocaleDateString(undefined,{month:first.getMonth()===last.getMonth()?undefined:'short',day:'numeric',year:first.getFullYear()===last.getFullYear()?undefined:'numeric'});return `${firstLabel} – ${lastLabel}`}

export function PlanWeek(){
  const s=useStore();
  const location=useLocation();
  const incoming=location.state as {recipeId?:string;servings?:number;caloriesPerServing?:number}|null;
  const incomingRecipe=s.recipes.find(recipe=>recipe.id===incoming?.recipeId);
  const [weekOffset,setWeekOffset]=useState(0);
  const dates=useMemo(()=>weekDates(weekOffset),[weekOffset]);
  const [selected,setSelected]=useState(()=>{const current=weekDates(0);return dateKey(current.find(date=>!s.meals.some(meal=>meal.date===dateKey(date)&&meal.status==='planned'))??current[0]!)});
  const meal=s.meals.find(item=>item.date===selected&&item.status==='planned');
  const picks=useMemo(()=>s.recommendations.filter(item=>item.recipe.id!==meal?.recipeId&&item.recipe.id!==incomingRecipe?.id).slice(0,6),[s.recommendations,meal,incomingRecipe]);
  const showWeek=(offset:number)=>{const nextDates=weekDates(offset);const firstOpen=nextDates.find(date=>!s.meals.some(item=>item.date===dateKey(date)&&item.status==='planned'))??nextDates[0]!;setWeekOffset(offset);setSelected(dateKey(firstOpen))};

  return <>
    <PageTitle eyebrow="Weekly meal planner" title="Plan one good day at a time." description="Choose a date and recipe. Your kitchen list is presence-only, so planning never deducts ingredient amounts." action={<div className="flex items-center gap-2"><button disabled={weekOffset===0} onClick={()=>showWeek(0)} className="btn-secondary disabled:opacity-35" aria-label="Show current week"><ChevronLeft size={17}/></button><span className="min-w-36 text-center text-sm font-semibold"><span className="block text-xs uppercase tracking-wider text-ink/40">{weekOffset===0?'Current week':'Next week'}</span>{weekLabel(dates)}</span><button disabled={weekOffset===1} onClick={()=>showWeek(1)} className="btn-secondary disabled:opacity-35" aria-label="Show next week"><ChevronRight size={17}/></button></div>}/>
    <div className="grid gap-3 sm:grid-cols-7">{dates.map(date=>{const key=dateKey(date),planned=s.meals.find(item=>item.date===key&&item.status==='planned');return <button key={key} onClick={()=>setSelected(key)} className={`min-h-28 rounded-3xl border p-3 text-left transition ${selected===key?'border-herb-600 bg-herb-600 text-white shadow-soft':'border-black/5 bg-white hover:border-herb-500'}`}><span className={`text-xs font-semibold uppercase ${selected===key?'text-white/65':'text-ink/40'}`}>{date.toLocaleDateString(undefined,{weekday:'short'})}</span><span className="mt-1 block font-display text-2xl">{date.getDate()}</span><span className={`mt-3 line-clamp-2 text-xs ${selected===key?'text-white/80':'text-ink/55'}`}>{planned?<><Check className="mr-1 inline" size={12}/>{planned.title}</>:'Open dinner'}</span></button>})}</div>
    {incomingRecipe&&<div className="mt-5 flex flex-col gap-4 rounded-3xl bg-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Ready for {new Date(selected+'T12:00').toLocaleDateString(undefined,{weekday:'long'})}</p><p className="mt-1 font-display text-2xl">{incomingRecipe.title}</p><p className="mt-1 text-sm text-ink/55">{incoming?.servings??incomingRecipe.servings} servings · about {incoming?.caloriesPerServing??incomingRecipe.caloriesPerServing} calories each</p></div><button className="btn-primary" onClick={()=>s.planMeal(selected,incomingRecipe.id,incoming?.servings,incoming?.caloriesPerServing)}><Plus size={16}/>Add to this day</button></div>}
    {meal&&<div className="mt-5 flex flex-col gap-4 rounded-3xl bg-herb-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Planned for {new Date(selected+'T12:00').toLocaleDateString(undefined,{weekday:'long'})}</p><p className="mt-1 font-display text-2xl">{meal.title}</p><p className="mt-1 text-sm text-ink/55">{meal.servings} servings · about {meal.caloriesPerServing??s.recipes.find(recipe=>recipe.id===meal.recipeId)?.caloriesPerServing} calories each</p></div><button className="btn-secondary" onClick={()=>s.removeMeal(meal.id)}><RotateCcw size={16}/>Clear and choose again</button></div>}
    <div className="mt-9 flex items-end justify-between"><div><p className="eyebrow"><Sparkles className="mr-1 inline" size={13}/>Recalculated now</p><h2 className="mt-1 text-3xl">Best for {new Date(selected+'T12:00').toLocaleDateString(undefined,{weekday:'long'})}</h2></div><div className="hidden text-right text-xs text-ink/45 sm:block">{s.inventory.filter(item=>Number(item.quantity)>0).length} ingredients marked available<br/>{s.grocery.length} grocery items projected</div></div>
    <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{picks.map(item=><div key={item.recipe.id} className="relative"><RecipeCard recipe={item.recipe} reason={item.score.reasons[0]??`Strong ${Math.round(item.score.totalScore*100)}% fit for this week`}/><button onClick={()=>s.planMeal(selected,item.recipe.id)} className="btn-primary absolute bottom-5 right-5 z-10"><Plus size={16}/>Plan</button></div>)}</div>
  </>;
}
