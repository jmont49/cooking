import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { Dashboard } from './pages/Dashboard';
import { PlanWeek } from './pages/PlanWeek';
import { ThisWeek } from './pages/ThisWeek';
import { Kitchen } from './pages/Kitchen';
import { Recipes } from './pages/Recipes';
import { RecipeDetail } from './pages/RecipeDetail';
import { CookingMode } from './pages/CookingMode';
import { Groceries } from './pages/Groceries';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { GenerateRecipe } from './pages/GenerateRecipe';
import { ManualRecipe } from './pages/ManualRecipe';
import { SundayPrep } from './pages/SundayPrep';

export function App(){return <Routes><Route element={<Shell/>}><Route index element={<Dashboard/>}/><Route path="plan" element={<PlanWeek/>}/><Route path="week" element={<ThisWeek/>}/><Route path="prep" element={<SundayPrep/>}/><Route path="kitchen" element={<Kitchen/>}/><Route path="recipes" element={<Recipes/>}/><Route path="recipes/new" element={<ManualRecipe/>}/><Route path="recipes/generate" element={<GenerateRecipe/>}/><Route path="recipes/:id" element={<RecipeDetail/>}/><Route path="groceries" element={<Groceries/>}/><Route path="history" element={<History/>}/><Route path="settings" element={<Settings/>}/></Route><Route path="cook/:mealId" element={<CookingMode/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>}
