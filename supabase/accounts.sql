-- ตังค์พอดี: บัญชีร่วม (รายรับรายจ่ายร่วมกัน) แยกจากกระปุกร่วม
-- รันหลัง schema.sql ใน Supabase > SQL Editor รันซ้ำได้

create table if not exists public.shared_accounts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  invite_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table if not exists public.account_members (
  account_id uuid not null references public.shared_accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create table if not exists public.account_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.shared_accounts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('in', 'out')),
  amount numeric not null check (amount > 0 and amount <= 100000000),
  category text not null default 'อื่น ๆ' check (char_length(category) <= 40),
  note text check (note is null or char_length(note) <= 120),
  transfer boolean not null default false,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists account_entries_idx on public.account_entries (account_id, entry_date desc);

create or replace function public.is_account_member(p_account uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.account_members where account_id = p_account and user_id = auth.uid());
$$;

create or replace function public.shares_account_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.account_members a join public.account_members b on a.account_id = b.account_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

create or replace function public.add_account_owner_as_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.account_members (account_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;
drop trigger if exists on_account_created on public.shared_accounts;
create trigger on_account_created after insert on public.shared_accounts
  for each row execute function public.add_account_owner_as_member();

create or replace function public.join_account(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_account uuid;
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  select id into v_account from public.shared_accounts where invite_code = upper(trim(p_code));
  if v_account is null then raise exception 'ไม่พบรหัสเชิญนี้'; end if;
  insert into public.account_members (account_id, user_id) values (v_account, auth.uid()) on conflict do nothing;
  return v_account;
end;
$$;
revoke all on function public.join_account(text) from public, anon;
grant execute on function public.join_account(text) to authenticated;

alter table public.shared_accounts enable row level security;
alter table public.account_members enable row level security;
alter table public.account_entries enable row level security;

-- ให้เห็นชื่อสมาชิกบัญชีร่วมด้วย (แทน policy เดิมใน schema.sql)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_jar_with(id) or public.shares_account_with(id));

drop policy if exists accounts_select on public.shared_accounts;
create policy accounts_select on public.shared_accounts for select to authenticated
  using (public.is_account_member(id));
drop policy if exists accounts_insert on public.shared_accounts;
create policy accounts_insert on public.shared_accounts for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists accounts_update on public.shared_accounts;
create policy accounts_update on public.shared_accounts for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists accounts_delete on public.shared_accounts;
create policy accounts_delete on public.shared_accounts for delete to authenticated
  using (owner_id = auth.uid());

-- ออกจากบัญชีเอง หรือเจ้าของเตะสมาชิก (เจ้าของออกเองไม่ได้ ต้องลบบัญชี)
drop policy if exists acc_members_select on public.account_members;
create policy acc_members_select on public.account_members for select to authenticated
  using (public.is_account_member(account_id));
drop policy if exists acc_members_delete on public.account_members;
create policy acc_members_delete on public.account_members for delete to authenticated
  using (
    (user_id = auth.uid() and role <> 'owner')
    or exists (select 1 from public.shared_accounts a where a.id = account_id and a.owner_id = auth.uid() and account_members.role <> 'owner')
  );

-- ทุกคนเพิ่มรายการได้ แก้/ลบได้เฉพาะของตัวเอง
drop policy if exists acc_entries_select on public.account_entries;
create policy acc_entries_select on public.account_entries for select to authenticated
  using (public.is_account_member(account_id));
drop policy if exists acc_entries_insert on public.account_entries;
create policy acc_entries_insert on public.account_entries for insert to authenticated
  with check (user_id = auth.uid() and public.is_account_member(account_id));
drop policy if exists acc_entries_update on public.account_entries;
create policy acc_entries_update on public.account_entries for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_account_member(account_id));
drop policy if exists acc_entries_delete on public.account_entries;
create policy acc_entries_delete on public.account_entries for delete to authenticated
  using (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.account_entries;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.account_members;
exception when duplicate_object then null; end $$;
