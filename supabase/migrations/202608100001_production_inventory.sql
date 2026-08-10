-- Production-safe reference data. Personal/demo rows remain in seed.sql only.
insert into public.ingredients(slug,name,category,default_unit,perishable,default_shelf_days) values
('chicken','Chicken breast','Protein','lb',true,3),('salmon','Salmon fillet','Protein','oz',true,2),('ground-beef','Ground beef','Protein','lb',true,2),('eggs','Eggs','Dairy & eggs','count',true,21),('tilapia','Tilapia fillet','Protein','oz',true,2),('shrimp','Peeled shrimp','Protein','lb',true,2),('tuna','Yellowfin tuna','Protein','oz',true,1),('tofu','Extra-firm tofu','Protein','oz',true,5),('chickpeas','Chickpeas','Pantry','can',false,null),('lentils','Red lentils','Pantry','cup',false,null),('pasta','Pasta','Pantry','oz',false,null),('rice','Rice','Pantry','cup',false,null),('spinach','Baby spinach','Produce','oz',true,5),('broccoli','Broccoli','Produce','oz',true,6),('carrot','Carrots','Produce','count',true,21),('lemon','Lemon','Produce','count',true,14),('garlic','Garlic','Produce','count',false,30),('tomatoes','Crushed tomatoes','Pantry','can',false,null),('potato','Baby potatoes','Produce','lb',false,21),('green-beans','Green beans','Produce','oz',true,5),('bell-pepper','Bell pepper','Produce','count',true,7),('onion','Onion','Produce','count',false,30),('peas','Frozen peas','Frozen','cup',false,180),('soy','Soy sauce','Sauces','tbsp',false,365),('flour','Flour','Pantry','cup',false,180)
on conflict(slug) do update set name=excluded.name,category=excluded.category,default_unit=excluded.default_unit,perishable=excluded.perishable,default_shelf_days=excluded.default_shelf_days;

insert into public.ingredient_aliases(ingredient_id,alias)
select i.id,x.alias from public.ingredients i join (values
('chicken','boneless chicken breast'),('chicken','chicken breasts'),('chicken','boneless skinless chicken breast'),('tilapia','white fish'),('chickpeas','garbanzo beans')
) x(slug,alias) on i.slug=x.slug on conflict(alias) do nothing;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1),'Cook')) on conflict do nothing;
  insert into public.user_preferences(user_id) values(new.id) on conflict do nothing;
  insert into public.storage_locations(user_id,name) values(new.id,'Fridge'),(new.id,'Freezer'),(new.id,'Pantry') on conflict do nothing;
  return new;
end $$;

insert into public.storage_locations(user_id,name)
select p.id,l.name from public.profiles p cross join (values('Fridge'),('Freezer'),('Pantry')) l(name)
on conflict do nothing;

create or replace function public.api_add_inventory_item(
  p_user uuid,p_ingredient uuid,p_location text,p_quantity numeric,p_unit text,p_expiration date,p_idempotency text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_location uuid; v_item public.inventory_items; v_prior uuid;
begin
  if p_quantity <= 0 then raise exception 'quantity_must_be_positive'; end if;
  if not exists(select 1 from public.ingredients where id=p_ingredient) then raise exception 'ingredient_not_found'; end if;
  select inventory_item_id into v_prior from public.inventory_transactions where user_id=p_user and idempotency_key=p_idempotency;
  if v_prior is not null then select * into v_item from public.inventory_items where id=v_prior and user_id=p_user; return to_jsonb(v_item); end if;
  insert into public.storage_locations(user_id,name) values(p_user,p_location) on conflict(user_id,name) do update set name=excluded.name returning id into v_location;
  select * into v_item from public.inventory_items where user_id=p_user and ingredient_id=p_ingredient and storage_location_id=v_location and unit=p_unit for update;
  if v_item.id is null then
    insert into public.inventory_items(user_id,ingredient_id,storage_location_id,quantity,unit,confidence,source,estimated_expiration_date,last_confirmed_at)
    values(p_user,p_ingredient,v_location,p_quantity,p_unit,1,'manual',p_expiration,now()) returning * into v_item;
  else
    update public.inventory_items set quantity=quantity+p_quantity,confidence=1,estimated_expiration_date=coalesce(p_expiration,estimated_expiration_date),last_confirmed_at=now(),version=version+1,updated_at=now()
    where id=v_item.id returning * into v_item;
  end if;
  insert into public.inventory_transactions(user_id,inventory_item_id,kind,quantity_delta,unit,reason,idempotency_key)
  values(p_user,v_item.id,'manual',p_quantity,p_unit,'Added through Shua',p_idempotency);
  return to_jsonb(v_item);
end $$;

create or replace function public.api_adjust_inventory_quantity(
  p_user uuid,p_item uuid,p_delta numeric,p_reason text,p_idempotency text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_item public.inventory_items; v_prior uuid; v_before numeric;
begin
  select inventory_item_id into v_prior from public.inventory_transactions where user_id=p_user and idempotency_key=p_idempotency;
  if v_prior is not null then select * into v_item from public.inventory_items where id=v_prior and user_id=p_user; return to_jsonb(v_item); end if;
  select * into v_item from public.inventory_items where id=p_item and user_id=p_user for update;
  if v_item.id is null then raise exception 'inventory_item_not_found'; end if;
  v_before:=v_item.quantity;
  update public.inventory_items set quantity=greatest(0,quantity+p_delta),confidence=1,last_confirmed_at=now(),version=version+1,updated_at=now() where id=p_item returning * into v_item;
  insert into public.inventory_transactions(user_id,inventory_item_id,kind,quantity_delta,unit,reason,idempotency_key)
  values(p_user,p_item,case when p_reason='discarded' then 'discarded'::public.inventory_transaction_kind when p_reason='expired' then 'expired'::public.inventory_transaction_kind else 'manual'::public.inventory_transaction_kind end,v_item.quantity-v_before,v_item.unit,p_reason,p_idempotency);
  return to_jsonb(v_item);
end $$;

revoke all on function public.api_add_inventory_item(uuid,uuid,text,numeric,text,date,text) from public,anon,authenticated;
revoke all on function public.api_adjust_inventory_quantity(uuid,uuid,numeric,text,text) from public,anon,authenticated;
grant execute on function public.api_add_inventory_item(uuid,uuid,text,numeric,text,date,text) to service_role;
grant execute on function public.api_adjust_inventory_quantity(uuid,uuid,numeric,text,text) to service_role;
