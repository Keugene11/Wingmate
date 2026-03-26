-- Generate fun random usernames like "BoldFalcon42" instead of "user_a1b2c3"

create or replace function public.generate_username()
returns text as $$
declare
  adjectives text[] := array[
    'Bold','Brave','Chill','Cool','Daring','Epic','Fierce','Grand',
    'Happy','Keen','Lucky','Mighty','Noble','Quick','Sharp','Slick',
    'Smart','Smooth','Solid','Steady','Swift','Calm','Bright','Witty',
    'Clutch','Prime','Based','Alpha','Crisp','Fresh','Hype','Lit',
    'Ace','Chief','Raw','Real','Zen','True','Peak','Woke'
  ];
  animals text[] := array[
    'Falcon','Tiger','Wolf','Eagle','Hawk','Lion','Bear','Fox',
    'Shark','Panther','Cobra','Raven','Jaguar','Phoenix','Viper','Otter',
    'Lynx','Puma','Stallion','Mantis','Raptor','Bison','Crane','Drake',
    'Hound','Marlin','Osprey','Rhino','Condor','Gecko','Moose','Oryx'
  ];
begin
  return adjectives[1 + floor(random() * array_length(adjectives, 1))::int]
      || animals[1 + floor(random() * array_length(animals, 1))::int]
      || floor(random() * 100)::int::text;
end;
$$ language plpgsql;

-- Update the trigger to use the new generator
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    generate_username()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Re-generate existing ugly "user_" usernames
update profiles
set username = generate_username(),
    updated_at = now()
where username like 'user_%';

-- Update community posts/comments to match
update posts
set author_name = (
  select username from profiles where profiles.id = posts.user_id
)
where exists (select 1 from profiles where profiles.id = posts.user_id);

update comments
set author_name = (
  select username from profiles where profiles.id = comments.user_id
)
where exists (select 1 from profiles where profiles.id = comments.user_id);
