create or replace function public.save_manual_recipe(p_user uuid,p_recipe jsonb)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_recipe_id uuid;
  v_version_id uuid;
  v_ingredient uuid;
  v_item jsonb;
  v_step text;
  v_tag text;
  v_sort integer:=0;
begin
  insert into public.recipes(user_id,title,description)
  values(p_user,p_recipe->>'title',coalesce(p_recipe->>'description',''))
  returning id into v_recipe_id;

  insert into public.recipe_versions(recipe_id,version,servings,prep_minutes,cook_minutes,difficulty,estimated_cost,cuisine,protein,cleanup,leftover_quality,leftover_days,reheating,safety_notes,equipment,substitutions,version_notes)
  values(v_recipe_id,1,(p_recipe->>'servings')::numeric,(p_recipe->>'prepMinutes')::integer,(p_recipe->>'cookMinutes')::integer,p_recipe->>'difficulty',(p_recipe->>'estimatedCost')::numeric,p_recipe->>'cuisine',p_recipe->>'protein',coalesce((p_recipe->>'cleanup')::integer,2),coalesce((p_recipe->>'leftoverQuality')::integer,3),coalesce((p_recipe->>'leftoverDays')::integer,3),coalesce(p_recipe->>'reheating','Reheat until steaming hot.'),array(select jsonb_array_elements_text(coalesce(p_recipe->'safetyNotes','[]'))),array(select jsonb_array_elements_text(coalesce(p_recipe->'equipment','[]'))),array(select jsonb_array_elements_text(coalesce(p_recipe->'substitutions','[]'))),'Entered manually in Shua')
  returning id into v_version_id;

  for v_item in select * from jsonb_array_elements(p_recipe->'ingredients') loop
    v_sort:=v_sort+1;v_ingredient:=null;
    begin v_ingredient:=nullif(v_item->>'ingredientId','')::uuid; exception when invalid_text_representation then v_ingredient:=null; end;
    if v_ingredient is not null and not exists(select 1 from public.ingredients where id=v_ingredient) then v_ingredient:=null; end if;
    if v_ingredient is null then select i.id into v_ingredient from public.ingredients i left join public.ingredient_aliases a on a.ingredient_id=i.id where lower(i.name)=lower(v_item->>'name') or lower(a.alias)=lower(v_item->>'name') limit 1; end if;
    insert into public.recipe_ingredients(recipe_version_id,ingredient_id,unresolved_name,quantity,unit,optional,sort_order)
    values(v_version_id,v_ingredient,case when v_ingredient is null then v_item->>'name' end,(v_item->>'quantity')::numeric,v_item->>'unit',coalesce((v_item->>'optional')::boolean,false),v_sort);
  end loop;

  v_sort:=0;
  for v_step in select * from jsonb_array_elements_text(p_recipe->'steps') loop v_sort:=v_sort+1;insert into public.recipe_steps(recipe_version_id,step_number,instruction) values(v_version_id,v_sort,v_step);end loop;
  for v_tag in select * from jsonb_array_elements_text(coalesce(p_recipe->'tags','[]')) loop insert into public.recipe_tags(recipe_id,tag) values(v_recipe_id,left(v_tag,80)) on conflict do nothing;end loop;
  return jsonb_build_object('recipeId',v_recipe_id,'recipeVersionId',v_version_id);
end $$;

revoke all on function public.save_manual_recipe(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_manual_recipe(uuid,jsonb) to service_role;
