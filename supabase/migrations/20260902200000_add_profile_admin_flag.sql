-- Indique si ce compte est celui de Xavier (accès au panneau admin), sans
-- avoir à garder son email en clair dans le code source de la page : le
-- client interroge juste ce booléen sur son propre compte (déjà lisible via
-- la policy "Students can view their own profile" existante), ce qui ne
-- révèle rien sur les autres comptes.
alter table public.profiles add column is_admin boolean not null default false;

update public.profiles set is_admin = true
where user_id = (select id from auth.users where lower(email) = lower('gringo.na.gringa55@gmail.com'));
