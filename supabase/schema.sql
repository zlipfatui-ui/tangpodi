-- ตังค์พอดี: กระปุกออมเงินกับเพื่อน (รัน 1 ครั้งใน Supabase > SQL Editor)
-- ข้อมูลส่วนตัว (รายรับจ่าย บิล หนี้) ไม่อยู่ที่นี่ มีเฉพาะกระปุกร่วม

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'เพื่อน'
);

create table if not exists public.shared_jars (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  target numeric not null check (target > 0),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  invite_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table if not exists public.jar_members (
  jar_id uuid not null references public.shared_jars (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (jar_id, user_id)
);

create table if not exists public.jar_entries (
  id uuid primary key default gen_random_uuid(),
  jar_id uuid not null references public.shared_jars (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('in', 'out')),
  amount numeric not null check (amount > 0 and amount <= 100000000),
  note text check (note is null or char_length(note) <= 120),
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists jar_entries_jar_idx on public.jar_entries (jar_id, entry_date desc);

-- ฟังก์ชันช่วยตรวจสิทธิ์ (security definer เพื่อไม่ให้ policy เรียกตัวเองวนซ้ำ)
create or replace function public.is_jar_member(p_jar uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.jar_members where jar_id = p_jar and user_id = auth.uid());
$$;

create or replace function public.shares_jar_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.jar_members a join public.jar_members b on a.jar_id = b.jar_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

-- สร้างโปรไฟล์อัตโนมัติเมื่อสมัคร
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- เจ้าของกระปุกเป็นสมาชิกอัตโนมัติ
create or replace function public.add_owner_as_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.jar_members (jar_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;
drop trigger if exists on_jar_created on public.shared_jars;
create trigger on_jar_created after insert on public.shared_jars
  for each row execute function public.add_owner_as_member();

-- เข้าร่วมด้วยรหัสเชิญ (ทางเดียวที่เพิ่มสมาชิกได้ ไม่เปิดให้ select ตารางกระปุกด้วยรหัส)
create or replace function public.join_jar(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_jar uuid;
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  select id into v_jar from public.shared_jars where invite_code = upper(trim(p_code));
  if v_jar is null then raise exception 'ไม่พบรหัสเชิญนี้'; end if;
  insert into public.jar_members (jar_id, user_id) values (v_jar, auth.uid()) on conflict do nothing;
  return v_jar;
end;
$$;
revoke all on function public.join_jar(text) from public, anon;
grant execute on function public.join_jar(text) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.shared_jars enable row level security;
alter table public.jar_members enable row level security;
alter table public.jar_entries enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_jar_with(id));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists jars_select on public.shared_jars;
create policy jars_select on public.shared_jars for select to authenticated
  using (public.is_jar_member(id));
drop policy if exists jars_insert on public.shared_jars;
create policy jars_insert on public.shared_jars for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists jars_update on public.shared_jars;
create policy jars_update on public.shared_jars for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists jars_delete on public.shared_jars;
create policy jars_delete on public.shared_jars for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists members_select on public.jar_members;
create policy members_select on public.jar_members for select to authenticated
  using (public.is_jar_member(jar_id));
-- ออกจากกระปุกเอง หรือเจ้าของเตะสมาชิก (เจ้าของออกเองไม่ได้ ต้องลบกระปุก)
drop policy if exists members_delete on public.jar_members;
create policy members_delete on public.jar_members for delete to authenticated
  using (
    (user_id = auth.uid() and role <> 'owner')
    or exists (select 1 from public.shared_jars j where j.id = jar_id and j.owner_id = auth.uid() and jar_members.role <> 'owner')
  );

drop policy if exists entries_select on public.jar_entries;
create policy entries_select on public.jar_entries for select to authenticated
  using (public.is_jar_member(jar_id));
drop policy if exists entries_insert on public.jar_entries;
create policy entries_insert on public.jar_entries for insert to authenticated
  with check (user_id = auth.uid() and public.is_jar_member(jar_id));
drop policy if exists entries_update on public.jar_entries;
create policy entries_update on public.jar_entries for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_jar_member(jar_id));
drop policy if exists entries_delete on public.jar_entries;
create policy entries_delete on public.jar_entries for delete to authenticated
  using (user_id = auth.uid());

-- เรียลไทม์
do $$ begin
  alter publication supabase_realtime add table public.jar_entries;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.jar_members;
exception when duplicate_object then null; end $$;
