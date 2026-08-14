alter table public.recipe_versions
  add column if not exists calories_per_serving integer,
  add column if not exists protein_grams_per_serving numeric(8,1);

update public.recipe_versions
set calories_per_serving=coalesce(calories_per_serving,
      case when protein in ('Chicken','Chicken breast','Salmon','Ground beef','Beef','White fish','Shrimp','Tuna') then 620 else 520 end),
    protein_grams_per_serving=coalesce(protein_grams_per_serving,
      case
        when protein in ('Chicken','Chicken breast') then 43
        when protein in ('Salmon','Tuna','Beef','Ground beef') then 38
        when protein in ('White fish','Shrimp') then 35
        when protein='Eggs' then 25
        when protein in ('Beans','Chickpeas','Lentils','Tofu') then 20
        else 24
      end)
where calories_per_serving is null or protein_grams_per_serving is null;

alter table public.recipe_versions
  alter column calories_per_serving set default 600,
  alter column calories_per_serving set not null,
  alter column protein_grams_per_serving set default 30,
  alter column protein_grams_per_serving set not null;

alter table public.recipe_versions
  add constraint recipe_versions_calories_range check(calories_per_serving between 50 and 3000),
  add constraint recipe_versions_protein_range check(protein_grams_per_serving between 0 and 300);

update public.user_preferences
set preferred_proteins=array['Chicken breast','Salmon','White fish','Ground beef','Steak','Eggs','Shrimp'],
    exclusions=array['STRICT ALLERGY: no peanuts, tree nuts, or nut-derived pesto/sauces. No pork. Avoid fatty pieces, bones, cartilage, gristle, wraps, pickled onions, mustard-forward sauces, and labor-intensive shrimp prep.'],
    exploration_mix='{"familiar":0.7,"variation":0.2,"exploratory":0.1}'::jsonb,
    settings=coalesce(settings,'{}'::jsonb)||jsonb_build_object(
      'weekdayLimit',40,
      'planLunch',true,
      'coveredStaples',true,
      'exploration',30,
      'tasteProfile','Favor chicken breast first; then salmon, boneless white fish, ground beef, burgers, steak, eggs, and easy-prep shrimp. Ground turkey is low priority; chicken thighs, tuna, tofu, beans, chickpeas, and lentils are occasional variety. Prefer cooked vegetables. Build a complete, nicely plated meal with the protein plus rice, pasta, potatoes, and/or vegetables. Make exactly 2 servings: dinner now and lunch tomorrow, with only one day of leftovers. Favor Latin American, Italian, Mediterranean, American, Middle Eastern, Filipino, and Chinese flavors. Tangy lemon/lime/vinegar, garlic, cilantro, parsley, basil, rosemary, mint, cumin, smoked paprika, curry spices, hot honey, soy, teriyaki, chimichurri, nut-free pesto, tomato sauce, Alfredo, hot sauce, fresh-style salsa verde, yogurt sauces, cream, cheese, and coconut milk are welcome. Keep meatless recommendations to about one meal per week. Prefer recipes around 35 minutes using an oven, stove, microwave, air fryer, blender, rice cooker, or cast-iron pan.'
    ),
    updated_at=now();

alter table public.user_preferences
  alter column preferred_proteins set default array['Chicken breast','Salmon','White fish','Ground beef','Steak','Eggs','Shrimp'],
  alter column exclusions set default array['STRICT ALLERGY: no peanuts, tree nuts, or nut-derived pesto/sauces. No pork.'];
