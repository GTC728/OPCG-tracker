-- V5.6.3: lobby join/kick/link fixes
-- Run in the Supabase SQL editor after v5.0 + v5.6 lobby scripts.
--
-- Also in Authentication → URL Configuration, add Redirect URLs:
--   https://opcg-tracker-v2.pages.dev/auth/callback
--   http://localhost:5173/auth/callback
-- Email template should include the 6-digit {{ .Token }} and {{ .ConfirmationURL }}.
-- Opening the email link only signs in that browser; the installed app needs the code.

-- 1) Banned members are not treated as active members (blocks "already joined" dead-end).
create or replace function public.user_is_group_member(p_group_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_key = p_group_key
      and user_id = auth.uid()
      and banned_at is null
  );
$$;

-- 2) Open join: banned users stay blocked; leftover rows without ban can re-join.
create or replace function public.join_group_open(
  p_group_key text,
  p_display_name text default 'Member'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_count int;
  v_banned timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role, banned_at into v_role, v_banned
  from public.group_members
  where group_key = p_group_key and user_id = auth.uid();

  if v_role is not null then
    if v_banned is not null then
      raise exception 'banned';
    end if;
    return v_role;
  end if;

  select count(*) into v_count from public.group_members where group_key = p_group_key;
  v_role := case when v_count = 0 then 'owner' else 'member' end;

  insert into public.group_members (group_key, user_id, display_name, role)
  values (p_group_key, auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Member'), v_role);

  return v_role;
end;
$$;

-- 3) Re-apply after kick: treat banned separately; recycle prior join-request rows.
create or replace function public.join_group_with_policy(
  p_lookup text,
  p_message text default null,
  p_invite_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups%rowtype;
  v_storage text;
  v_role text;
  v_display text;
  v_pending_id uuid;
  v_link public.group_invite_links%rowtype;
  v_banned timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select g.* into v_group
  from public.resolve_group_lookup(p_lookup) r
  join public.groups g on g.group_key = r.group_key
  limit 1;

  if v_group.group_key is null then
    select g.* into v_group
    from public.groups g
    where lower(g.settings->>'storage_code') = lower(trim(p_lookup))
    limit 1;
  end if;

  if v_group.group_key is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_storage := coalesce(v_group.settings->>'storage_code', '');

  select banned_at, role into v_banned, v_role
  from public.group_members
  where group_key = v_group.group_key and user_id = auth.uid();

  if v_banned is not null then
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;

  if v_role is not null then
    return jsonb_build_object('ok', true, 'joined', true, 'storageCode', v_storage, 'role', v_role);
  end if;

  if v_group.join_policy = 'invite_only' then
    if p_invite_token is null then
      return jsonb_build_object('ok', false, 'error', 'invite_required');
    end if;
    select * into v_link from public.group_invite_links
    where token = p_invite_token and group_key = v_group.group_key;
    if v_link.id is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_invite');
    end if;
    if v_link.expires_at is not null and v_link.expires_at < now() then
      return jsonb_build_object('ok', false, 'error', 'invite_expired');
    end if;
    if v_link.max_uses is not null and v_link.use_count >= v_link.max_uses then
      return jsonb_build_object('ok', false, 'error', 'invite_exhausted');
    end if;
    update public.group_invite_links set use_count = use_count + 1 where id = v_link.id;
  end if;

  v_display := coalesce(
    nullif(trim(p_message), ''),
    (select display_name from public.group_members where user_id = auth.uid() and banned_at is null order by joined_at desc limit 1),
    (select coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)) from auth.users where id = auth.uid()),
    'Member'
  );

  if v_group.join_policy = 'request' then
    if exists (
      select 1 from public.group_join_requests
      where group_key = v_group.group_key and user_id = auth.uid() and status = 'pending'
    ) then
      return jsonb_build_object('ok', true, 'joined', false, 'pending', true, 'storageCode', v_storage);
    end if;

    delete from public.group_join_requests
    where group_key = v_group.group_key
      and user_id = auth.uid()
      and status <> 'pending';

    insert into public.group_join_requests (group_key, user_id, message)
    values (v_group.group_key, auth.uid(), nullif(trim(p_message), ''))
    returning id into v_pending_id;
    return jsonb_build_object('ok', true, 'joined', false, 'pending', true, 'requestId', v_pending_id, 'storageCode', v_storage);
  end if;

  v_role := public.join_group_open(v_group.group_key, v_display);
  perform public.refresh_group_stats_snapshot(v_group.group_key);
  return jsonb_build_object('ok', true, 'joined', true, 'storageCode', v_storage, 'role', v_role);
end;
$$;

-- 4) Applicant name from auth metadata (they are not members yet).
create or replace function public.list_group_join_requests(p_group_key text)
returns table (
  id uuid,
  user_id uuid,
  display_name text,
  message text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    jr.id,
    jr.user_id,
    coalesce(
      nullif(u.raw_user_meta_data->>'display_name', ''),
      nullif(u.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(u.email, '@', 1), ''),
      u.email,
      'User'
    ) as display_name,
    jr.message,
    jr.status,
    jr.created_at
  from public.group_join_requests jr
  left join auth.users u on u.id = jr.user_id
  where jr.group_key = p_group_key
    and jr.status = 'pending'
    and public.user_can_manage_group(p_group_key)
  order by jr.created_at asc;
$$;

-- 5) Join a specific user (admin approve must not use auth.uid()).
create or replace function public.join_group_for_user(
  p_group_key text,
  p_user_id uuid,
  p_display_name text default 'Member'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_count int;
  v_banned timestamptz;
begin
  if p_user_id is null then
    raise exception 'user required';
  end if;

  select role, banned_at into v_role, v_banned
  from public.group_members
  where group_key = p_group_key and user_id = p_user_id;

  if v_banned is not null then
    update public.group_members
    set banned_at = null,
        display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
        role = case when role = 'owner' then role else 'member' end
    where group_key = p_group_key and user_id = p_user_id;
    return 'member';
  end if;

  if v_role is not null then
    return v_role;
  end if;

  select count(*) into v_count from public.group_members where group_key = p_group_key;
  v_role := case when v_count = 0 then 'owner' else 'member' end;

  insert into public.group_members (group_key, user_id, display_name, role)
  values (p_group_key, p_user_id, coalesce(nullif(trim(p_display_name), ''), 'Member'), v_role);

  return v_role;
end;
$$;

grant execute on function public.join_group_for_user(text, uuid, text) to authenticated;

-- 6) Approve adds the *applicant*, not the reviewing admin.
--    Delete older request rows so kicked users can be approved again.
create or replace function public.review_join_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.group_join_requests%rowtype;
  v_role text;
  v_storage text;
  v_display text;
begin
  select * into v_req from public.group_join_requests where id = p_request_id;
  if v_req.id is null or v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.user_can_manage_group(v_req.group_key) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  delete from public.group_join_requests
  where group_key = v_req.group_key
    and user_id = v_req.user_id
    and id <> p_request_id;

  if p_approve then
    select coalesce(
      nullif(u.raw_user_meta_data->>'display_name', ''),
      nullif(u.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(u.email, '@', 1), ''),
      'Member'
    )
    into v_display
    from auth.users u
    where u.id = v_req.user_id;

    v_role := public.join_group_for_user(v_req.group_key, v_req.user_id, coalesce(v_display, 'Member'));
    update public.group_join_requests
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_request_id;
    perform public.refresh_group_stats_snapshot(v_req.group_key);
    select settings->>'storage_code' into v_storage from public.groups where group_key = v_req.group_key;
    return jsonb_build_object(
      'ok', true,
      'approved', true,
      'role', v_role,
      'storageCode', v_storage,
      'userId', v_req.user_id,
      'displayName', coalesce(v_display, 'Member')
    );
  end if;

  update public.group_join_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
      message = coalesce(nullif(trim(p_note), ''), message)
  where id = p_request_id;
  return jsonb_build_object('ok', true, 'approved', false);
end;
$$;

-- 6) Kick: delete membership, clear roster links, allow a later re-apply.
create or replace function public.kick_group_member(
  p_group_key text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'cannot_kick_self');
  end if;
  if not public.user_can_manage_group(p_group_key) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  delete from public.group_members
  where group_key = p_group_key and user_id = p_user_id;

  update public.sync_players
  set linked_user_id = null, updated_at = now(), updated_by = auth.uid()
  where group_key = p_group_key and linked_user_id = p_user_id;

  delete from public.group_join_requests
  where group_key = p_group_key and user_id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.kick_group_member(text, uuid) to authenticated;

-- 7) Admin unlink a roster player from any account.
create or replace function public.admin_unlink_player(
  p_group_key text,
  p_player_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.user_can_manage_group(p_group_key) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.sync_players
  set linked_user_id = null, updated_at = now(), updated_by = auth.uid()
  where group_key = p_group_key and id = p_player_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_unlink_player(text, text) to authenticated;

-- 8) One cloud account per roster player in a group.
-- Keep the newest link if duplicates already exist, then create the unique index.
update public.sync_players p
set linked_user_id = null,
    updated_at = now()
where p.linked_user_id is not null
  and exists (
    select 1
    from public.sync_players newer
    where newer.group_key = p.group_key
      and newer.linked_user_id = p.linked_user_id
      and (
        newer.updated_at > p.updated_at
        or (newer.updated_at = p.updated_at and newer.id > p.id)
      )
  );

create unique index if not exists sync_players_linked_user_uidx
  on public.sync_players (group_key, linked_user_id)
  where linked_user_id is not null;

grant execute on function public.list_group_join_requests(text) to authenticated;
grant execute on function public.join_group_with_policy(text, text, text) to authenticated;
grant execute on function public.join_group_for_user(text, uuid, text) to authenticated;
grant execute on function public.review_join_request(uuid, boolean, text) to authenticated;
