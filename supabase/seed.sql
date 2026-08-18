-- Deterministic local-development owner. The browser demo does not bypass production auth;
-- Local password login: cook@mise.local / mise-local-only.
insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
values ('00000000-0000-0000-0000-000000000000','11111111-1111-4111-8111-111111111111','authenticated','authenticated','cook@mise.local',crypt('mise-local-only',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"display_name":"Josh"}',now(),now(),'','','','') on conflict(id) do nothing;
insert into public.profiles(id,display_name) values('11111111-1111-4111-8111-111111111111','Josh') on conflict do nothing;
insert into public.user_preferences(user_id) values('11111111-1111-4111-8111-111111111111') on conflict do nothing;
insert into public.storage_locations(user_id,name) values('11111111-1111-4111-8111-111111111111','Fridge'),('11111111-1111-4111-8111-111111111111','Freezer'),('11111111-1111-4111-8111-111111111111','Pantry') on conflict do nothing;

insert into public.ingredients(slug,name,category,default_unit,perishable,default_shelf_days) values
('chicken','Chicken breast','Protein','lb',true,3),('salmon','Salmon fillet','Protein','oz',true,2),('ground-beef','Ground beef','Protein','lb',true,2),('eggs','Eggs','Dairy & eggs','count',true,21),('tilapia','Tilapia fillet','Protein','oz',true,2),('shrimp','Peeled shrimp','Protein','lb',true,2),('tuna','Yellowfin tuna','Protein','oz',true,1),('tofu','Extra-firm tofu','Protein','oz',true,5),('chickpeas','Chickpeas','Pantry','can',false,null),('lentils','Red lentils','Pantry','cup',false,null),('pasta','Pasta','Pantry','oz',false,null),('rice','Rice','Pantry','cup',false,null),('spinach','Baby spinach','Produce','oz',true,5),('broccoli','Broccoli','Produce','oz',true,6),('carrot','Carrots','Produce','count',true,21),('lemon','Lemon','Produce','count',true,14),('garlic','Garlic','Produce','count',false,30),('tomatoes','Crushed tomatoes','Pantry','can',false,null),('potato','Baby potatoes','Produce','lb',false,21),('green-beans','Green beans','Produce','oz',true,5),('bell-pepper','Bell pepper','Produce','count',true,7),('onion','Onion','Produce','count',false,30),('peas','Frozen peas','Frozen','cup',false,180),('soy','Soy sauce','Sauces','tbsp',false,365),('flour','Flour','Pantry','cup',false,180)
on conflict(slug) do nothing;
insert into public.ingredient_aliases(ingredient_id,alias) select id,x.alias from public.ingredients i join (values('chicken','boneless chicken breast'),('chicken','chicken breasts'),('chicken','boneless skinless chicken breast'),('tilapia','white fish'),('chickpeas','garbanzo beans')) x(slug,alias) on i.slug=x.slug on conflict do nothing;

insert into public.inventory_items(user_id,ingredient_id,storage_location_id,quantity,unit,confidence,source,purchase_date,estimated_expiration_date,last_confirmed_at)
select '11111111-1111-4111-8111-111111111111',i.id,l.id,x.quantity,x.unit,x.confidence,'seed',current_date-2,current_date+x.expires,now()-interval '4 days'
from (values('chicken',2.5::numeric,'lb',.82::numeric,2),('eggs',7,'count',.65,9),('spinach',5,'oz',.55,1),('broccoli',12,'oz',.9,4),('rice',8,'cup',.95,180),('pasta',24,'oz',.9,180),('chickpeas',2,'can',.95,365),('lemon',2,'count',.75,6)) x(slug,quantity,unit,confidence,expires)
join public.ingredients i on i.slug=x.slug join public.storage_locations l on l.user_id='11111111-1111-4111-8111-111111111111' and l.name=case when x.slug in ('rice','pasta','chickpeas') then 'Pantry' else 'Fridge' end
on conflict do nothing;
insert into public.inventory_transactions(user_id,inventory_item_id,kind,quantity_delta,unit,reason)
select user_id,id,'starting',quantity,unit,'Development seed' from public.inventory_items where user_id='11111111-1111-4111-8111-111111111111' and not exists(select 1 from public.inventory_transactions);

-- Presence-only pantry supplied by the cook. The numeric 1 is an internal
-- compatibility marker; the UI never asks the user to maintain quantities.
insert into public.inventory_items(user_id,ingredient_id,storage_location_id,quantity,reserved_quantity,unit,confidence,source,last_confirmed_at)
select '11111111-1111-4111-8111-111111111111',ingredient.id,location.id,1,0,ingredient.default_unit,1,'presence-seed',now()
from public.ingredients ingredient
join public.storage_locations location on location.user_id='11111111-1111-4111-8111-111111111111' and location.name=case when ingredient.slug in ('eggs','parmesan') then 'Fridge' when ingredient.slug='chicken' then 'Freezer' else 'Pantry' end
where ingredient.slug=any(array['chicken-broth','sugar','salt','pepper','slap-ya-mama','garlic-vodka-sauce','soy','yum-yum-sauce','garlic-salt','breadcrumbs','tapatio','teriyaki-sauce','red-pepper-flakes','onion-powder','thyme','lemon-pepper','curry-powder','cayenne','chipotle-seasoning','smoked-paprika','linguine','fettuccine','eggs','chicken','red-tomato-sauce','parmesan','chicken-bouillon','basmati-rice','minute-rice'])
on conflict(user_id,ingredient_id,storage_location_id,unit) do update set quantity=1,reserved_quantity=0,confidence=1,last_confirmed_at=now();
update public.inventory_items inventory set quantity=0,reserved_quantity=0 from public.ingredients ingredient where inventory.ingredient_id=ingredient.id and ingredient.slug='chicken' and inventory.unit<>'count';

insert into public.recipes(user_id,title,description) values
('11111111-1111-4111-8111-111111111111','Lemon garlic chicken pasta','Silky lemon sauce, tender chicken, and spinach.'),
('11111111-1111-4111-8111-111111111111','Ginger chicken rice bowls','Savory glazed chicken and crisp vegetables.'),
('11111111-1111-4111-8111-111111111111','Maple mustard salmon','Sheet-pan salmon, potatoes, and green beans.'),
('11111111-1111-4111-8111-111111111111','Beef & vegetable stir-fry','Fast beef and vegetables in a savory sauce.'),
('11111111-1111-4111-8111-111111111111','Chickpea tomato pasta','Jammy tomatoes and chickpeas.'),
('11111111-1111-4111-8111-111111111111','Crispy tilapia with herbed rice','Lightly crusted fish with peas.'),
('11111111-1111-4111-8111-111111111111','Spinach, pepper & feta frittata','A flexible egg dinner.'),
('11111111-1111-4111-8111-111111111111','Coconut tofu curry','Golden tofu and vegetables.'),
('11111111-1111-4111-8111-111111111111','Smoky red lentil soup','Low-cost cozy soup.'),
('11111111-1111-4111-8111-111111111111','Peppercorn steak with smashed potatoes','A bistro-style weekend dinner.'),
('11111111-1111-4111-8111-111111111111','Easy shrimp tacos','Quick shrimp and crunchy slaw.'),
('11111111-1111-4111-8111-111111111111','Sesame tuna crunch bowls','Seared tuna, cucumber, and rice.'),
('11111111-1111-4111-8111-111111111111','One-pan chicken fajita tacos','Smoky chicken and peppers.'),
('11111111-1111-4111-8111-111111111111','Creamy salmon & pea pasta','Practical pasta that stretches salmon.'),
('11111111-1111-4111-8111-111111111111','Weeknight beef ragu','Fast rich tomato sauce.'),
('11111111-1111-4111-8111-111111111111','Vegetable egg fried rice','A speedy use for cold rice.'),
('11111111-1111-4111-8111-111111111111','Lemony chicken orzo soup','Bright soup with spinach.'),
('11111111-1111-4111-8111-111111111111','Black bean & corn quesadillas','Crisp and pantry-friendly.'),
('11111111-1111-4111-8111-111111111111','Garlic butter tilapia & broccoli','Simple fish with lemon pan sauce.'),
('11111111-1111-4111-8111-111111111111','Skillet chicken biscuit pie','Creamy chicken under biscuits.')
on conflict do nothing;

insert into public.recipe_versions(recipe_id,version,servings,prep_minutes,cook_minutes,difficulty,estimated_cost,cuisine,protein,cleanup,leftover_quality,leftover_days,reheating,safety_notes,equipment)
select id,1,case when title like '%steak%' or title like '%tilapia%' or title like '%tuna%' then 2 else 4 end,15,case when title like '%soup%' or title like '%pie%' then 35 else 25 end,case when title like '%steak%' or title like '%pie%' then 'Ambitious' else 'Easy' end,case when title like '%steak%' then 24 else 12 end,'Globally inspired',case when title ilike '%chicken%' then 'Chicken' when title ilike '%salmon%' then 'Salmon' when title ilike '%beef%' or title ilike '%steak%' then 'Ground beef' when title ilike '%tilapia%' then 'White fish' when title ilike '%egg%' or title ilike '%frittata%' then 'Eggs' when title ilike '%tofu%' then 'Tofu' when title ilike '%lentil%' then 'Lentils' when title ilike '%chickpea%' then 'Chickpeas' else 'Seafood' end,2,4,3,'Reheat gently with a splash of water.',array['Cook animal proteins to a safe internal temperature.'],array['Large skillet','Cutting board']
from public.recipes where user_id='11111111-1111-4111-8111-111111111111' on conflict do nothing;
insert into public.recipe_ingredients(recipe_version_id,ingredient_id,quantity,unit,sort_order)
select v.id,i.id,case i.default_unit when 'lb' then 1.25 when 'oz' then 12 else 2 end,i.default_unit,1 from public.recipe_versions v join public.recipes r on r.id=v.recipe_id join public.ingredients i on i.slug=case when r.title ilike '%chicken%' then 'chicken' when r.title ilike '%salmon%' then 'salmon' when r.title ilike '%beef%' or r.title ilike '%steak%' then 'ground-beef' when r.title ilike '%tilapia%' then 'tilapia' when r.title ilike '%tofu%' then 'tofu' when r.title ilike '%lentil%' then 'lentils' when r.title ilike '%chickpea%' then 'chickpeas' when r.title ilike '%egg%' or r.title ilike '%frittata%' then 'eggs' when r.title ilike '%shrimp%' then 'shrimp' else 'tuna' end where r.user_id='11111111-1111-4111-8111-111111111111';
insert into public.recipe_steps(recipe_version_id,step_number,instruction) select id,1,'Prepare and season all ingredients before heating the pan.' from public.recipe_versions on conflict do nothing;
insert into public.recipe_steps(recipe_version_id,step_number,instruction) select id,2,'Cook the main ingredient and vegetables until tender and safely cooked.' from public.recipe_versions on conflict do nothing;
insert into public.recipe_steps(recipe_version_id,step_number,instruction) select id,3,'Taste, finish the sauce, portion, and cool any leftovers promptly.' from public.recipe_versions on conflict do nothing;

insert into public.weekly_plans(user_id,week_start,status) values('11111111-1111-4111-8111-111111111111',date_trunc('week',current_date)::date,'draft') on conflict do nothing;
insert into public.budget_periods(user_id,starts_on,ends_on,target) values('11111111-1111-4111-8111-111111111111',date_trunc('month',current_date)::date,(date_trunc('month',current_date)+interval '1 month'-interval '1 day')::date,240) on conflict do nothing;
