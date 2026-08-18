insert into public.ingredients(slug,name,category,default_unit,perishable,default_shelf_days) values
('canola-oil','Canola oil','Pantry','bottle',false,null),
('olive-oil','Extra virgin olive oil','Pantry','bottle',false,null)
on conflict(slug) do update set name=excluded.name,category=excluded.category,default_unit=excluded.default_unit,perishable=excluded.perishable,default_shelf_days=excluded.default_shelf_days;

insert into public.storage_locations(user_id,name)
select profile.id,'Pantry' from public.profiles profile
on conflict(user_id,name) do nothing;

insert into public.inventory_items(user_id,ingredient_id,storage_location_id,quantity,reserved_quantity,unit,confidence,source,last_confirmed_at)
select profile.id,ingredient.id,location.id,1,0,'bottle',1,'presence-seed',now()
from public.profiles profile
join public.storage_locations location on location.user_id=profile.id and location.name='Pantry'
join public.ingredients ingredient on ingredient.slug in ('canola-oil','olive-oil')
on conflict(user_id,ingredient_id,storage_location_id,unit) do update set quantity=1,reserved_quantity=0,confidence=1,last_confirmed_at=now(),updated_at=now();
