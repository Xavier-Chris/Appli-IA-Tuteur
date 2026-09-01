-- Statut de chaque élève : "trial" (essai gratuit limité), "student" (élève
-- de Xavier, exempté de la limite), "active" (abonné payant, exempté aussi).
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'trial' check (plan in ('trial', 'student', 'active')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Un élève peut lire son propre statut (pour l'affichage), mais ne peut
-- jamais le modifier lui-même : seules les fonctions serveur (ai-chat pour
-- la création automatique, admin-set-status, stripe-webhook), qui utilisent
-- la clé service_role et contournent donc RLS, ont le droit d'écrire ici.
create policy "Students can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = user_id);

-- Temps de conversation cumulé par élève et par jour, utilisé pour
-- appliquer la limite de 10 minutes/jour des comptes en "trial". Un élève
-- peut voir son propre compteur (pour lui afficher le temps restant), mais
-- ne peut jamais l'modifier lui-même, pour la même raison que ci-dessus.
create table if not exists public.usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  seconds_used integer not null default 0,
  primary key (user_id, day)
);

alter table public.usage_daily enable row level security;

create policy "Students can view their own usage"
  on public.usage_daily for select
  to authenticated
  using (auth.uid() = user_id);

-- Crée automatiquement une ligne "profiles" (statut "trial" par défaut) dès
-- qu'un nouveau compte élève est créé, pour ne jamais avoir à le faire à la
-- main ni à gérer une absence de ligne côté fonctions serveur.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Le trigger ci-dessus ne couvre que les FUTURS comptes : cette ligne crée
-- le statut "trial" par défaut pour les comptes déjà existants au moment de
-- cette migration (dont celui de Xavier), pour qu'aucun compte ne se
-- retrouve sans ligne profiles.
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Retrouve l'identifiant d'un compte à partir de son email, utilisé par la
-- fonction serveur admin-set-status (panneau admin de Xavier) pour marquer
-- un élève comme exempté. Volontairement réservée au rôle service_role
-- (jamais exposée à un élève connecté) : elle permettrait sinon de vérifier
-- si un email donné a un compte sur l'appli.
create function public.get_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(lookup_email) limit 1;
$$;

revoke execute on function public.get_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;
