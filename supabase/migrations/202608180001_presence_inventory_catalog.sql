-- Presence-only kitchen catalog and piece-based proteins.
insert into public.ingredients(slug,name,category,default_unit,perishable,default_shelf_days) values
('chicken-broth','Chicken broth','Pantry','package',false,null),
('sugar','Sugar','Pantry','bag',false,null),
('salt','Salt','Spices','package',false,null),
('pepper','Black pepper','Spices','package',false,null),
('slap-ya-mama','Slap Ya Mama seasoning','Spices','bottle',false,null),
('garlic-vodka-sauce','Garlic vodka tomato sauce','Sauces','bottle',false,null),
('yum-yum-sauce','Yum yum sauce','Sauces','bottle',false,null),
('garlic-salt','Garlic salt','Spices','bottle',false,null),
('breadcrumbs','Garlic & herb Progresso bread crumbs','Pantry','package',false,null),
('tapatio','Tapatío hot sauce','Sauces','bottle',false,null),
('teriyaki-sauce','Teriyaki sauce','Sauces','bottle',false,null),
('red-pepper-flakes','Red chili pepper flakes','Spices','bottle',false,null),
('onion-powder','Onion powder','Spices','bottle',false,null),
('thyme','Thyme leaves','Spices','bottle',false,null),
('lemon-pepper','Lemon & pepper seasoning','Spices','bottle',false,null),
('curry-powder','Curry powder','Spices','bottle',false,null),
('cayenne','Cayenne pepper','Spices','bottle',false,null),
('chipotle-seasoning','Chipotle chili pepper seasoning','Spices','bottle',false,null),
('smoked-paprika','Smoked paprika','Spices','bottle',false,null),
('linguine','Linguine','Pantry','package',false,null),
('fettuccine','Fettuccine','Pantry','package',false,null),
('red-tomato-sauce','Red tomato sauce','Sauces','bottle',false,null),
('parmesan','Parmesan','Dairy & eggs','package',true,30),
('chicken-bouillon','Chicken bouillon','Pantry','package',false,null),
('basmati-rice','Basmati rice','Pantry','bag',false,null),
('minute-rice','Minute Rice','Pantry','package',false,null),
('filet-mignon','Filet mignon','Protein','count',true,2),
('frozen-vegetables','Frozen peas and carrots','Frozen','bag',false,180),
('corn','Frozen corn','Frozen','bag',false,180)
on conflict(slug) do update set name=excluded.name,category=excluded.category,default_unit=excluded.default_unit,perishable=excluded.perishable,default_shelf_days=excluded.default_shelf_days;

update public.ingredients set default_unit='count',name='Chicken breast' where slug='chicken';
update public.ingredients set default_unit='count',name='Boneless salmon fillet' where slug='salmon';
update public.ingredients set default_unit='count',name='Tilapia fillet' where slug='tilapia';

-- This is a single-cook application: initialize the pantry the cook supplied for
-- every existing profile. Quantity is only a compatibility marker for “present.”
insert into public.storage_locations(user_id,name)
select profiles.id, locations.name from public.profiles profiles cross join (values('Pantry'),('Fridge'),('Freezer')) locations(name)
on conflict(user_id,name) do nothing;

update public.inventory_items inventory
set quantity=0,reserved_quantity=0,updated_at=now()
from public.ingredients ingredient
where inventory.ingredient_id=ingredient.id and ingredient.slug='chicken' and inventory.unit<>'count';

insert into public.inventory_items(user_id,ingredient_id,storage_location_id,quantity,reserved_quantity,unit,confidence,source,last_confirmed_at)
select profile.id, ingredient.id, location.id, 1, 0, ingredient.default_unit, 1, 'presence-seed', now()
from public.profiles profile
join public.ingredients ingredient on ingredient.slug=any(array[
  'chicken-broth','sugar','salt','pepper','slap-ya-mama','garlic-vodka-sauce','soy','yum-yum-sauce','garlic-salt','breadcrumbs','tapatio','teriyaki-sauce','red-pepper-flakes','onion-powder','thyme','lemon-pepper','curry-powder','cayenne','chipotle-seasoning','smoked-paprika','linguine','fettuccine','eggs','chicken','red-tomato-sauce','parmesan','chicken-bouillon','basmati-rice','minute-rice'
])
join public.storage_locations location on location.user_id=profile.id and location.name=case when ingredient.slug in ('eggs','parmesan') then 'Fridge' when ingredient.slug='chicken' then 'Freezer' else 'Pantry' end
on conflict(user_id,ingredient_id,storage_location_id,unit) do update set quantity=1,reserved_quantity=0,confidence=1,last_confirmed_at=now(),updated_at=now();
