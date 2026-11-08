
create table if not exists public.staff_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default false,
  display_name text
);
create table if not exists public.support_tickets (
  id text primary key,
  owner_uid uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.support_appointments (
  id text primary key,
  owner_uid uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_owner_idx on public.support_tickets(owner_uid);
create index if not exists support_appointments_owner_idx on public.support_appointments(owner_uid);

alter table public.staff_accounts enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_appointments enable row level security;
revoke all on public.staff_accounts, public.support_tickets, public.support_appointments from public, anon, authenticated;
grant select on public.staff_accounts, public.support_tickets, public.support_appointments to authenticated;

create or replace function public.accessable_is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_accounts s where s.user_id = (select auth.uid()) and s.active = true);
$$;
revoke all on function public.accessable_is_staff() from public, anon;
grant execute on function public.accessable_is_staff() to authenticated;

DROP POLICY IF EXISTS "Staff accounts: only own role" ON public.staff_accounts;
CREATE POLICY "Staff accounts: only own role" ON public.staff_accounts FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "Support tickets: owner or staff reads" ON public.support_tickets;
CREATE POLICY "Support tickets: owner or staff reads" ON public.support_tickets FOR SELECT TO authenticated USING (owner_uid = (select auth.uid()) OR (select public.accessable_is_staff()));
DROP POLICY IF EXISTS "Appointments: owner or staff reads" ON public.support_appointments;
CREATE POLICY "Appointments: owner or staff reads" ON public.support_appointments FOR SELECT TO authenticated USING (owner_uid = (select auth.uid()) OR (select public.accessable_is_staff()));

create or replace function public.accessable_submit_ticket(p_ticket jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id text := p_ticket->>'id'; v_created text := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); v_data jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in as a student before submitting.'; end if;
  if v_id is null or v_id !~ '^AA-[A-Za-z0-9-]{5,50}$' then raise exception 'Invalid ticket reference'; end if;
  if length(trim(coalesce(p_ticket->>'name',''))) not between 1 and 70 or length(trim(coalesce(p_ticket->>'subject',''))) not between 1 and 110
    or length(trim(coalesce(p_ticket->>'description',''))) not between 12 and 1200 then raise exception 'Missing or invalid fields'; end if;
  if coalesce(p_ticket->>'category','') not in ('technical','academic','career','accessibility') then raise exception 'Invalid category'; end if;
  v_data := jsonb_build_object('id',v_id,'name',p_ticket->>'name','subject',p_ticket->>'subject','description',p_ticket->>'description',
    'category',p_ticket->>'category','priority',case when p_ticket->>'priority' in ('High','Normal','Low') then p_ticket->>'priority' else 'Normal' end,
    'preference',left(coalesce(p_ticket->>'preference','Guided resources'),100),'status','Pending','createdAt',v_created,'updatedAt',v_created,
    'history',jsonb_build_array(jsonb_build_object('at',v_created,'title','Support request submitted','message','Awaiting review by an authorized staff member.')));
  insert into public.support_tickets(id,owner_uid,data) values(v_id,auth.uid(),v_data);
  return v_data;
end;
$$;

create or replace function public.accessable_submit_appointment(p_appointment jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id text := p_appointment->>'id'; v_created text := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); v_data jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in as a student before submitting.'; end if;
  if v_id is null or v_id !~ '^APT-[A-Za-z0-9-]{5,50}$' then raise exception 'Invalid appointment reference'; end if;
  if length(trim(coalesce(p_appointment->>'name',''))) not between 1 and 70 or length(trim(coalesce(p_appointment->>'agenda',''))) not between 10 and 600 then raise exception 'Missing required fields'; end if;
  if coalesce(p_appointment->>'category','') not in ('technical','academic','career','accessibility') then raise exception 'Invalid category'; end if;
  if (p_appointment->>'date')::date < current_date or (p_appointment->>'date')::date > current_date + interval '365 days' then raise exception 'Choose a valid future date'; end if;
  v_data := jsonb_build_object('id',v_id,'name',p_appointment->>'name','category',p_appointment->>'category','agenda',p_appointment->>'agenda',
    'date',p_appointment->>'date','time',p_appointment->>'time','preferences',coalesce(p_appointment->'preferences','[]'::jsonb),
    'status','Requested','createdAt',v_created,'updatedAt',v_created);
  insert into public.support_appointments(id,owner_uid,data) values(v_id,auth.uid(),v_data);
  return v_data;
end;
$$;

create or replace function public.accessable_student_update_ticket(p_id text,p_action text,p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.support_tickets%rowtype; v_status text; v_message text; v_title text; v_time text := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); v_data jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_row from public.support_tickets where id=p_id and owner_uid=auth.uid() for update;
  if not found then raise exception 'Ticket not found or not owned by you'; end if;
  v_status := coalesce(v_row.data->>'status','Pending');
  if p_action='add-update' then
    if length(trim(coalesce(p_note,''))) not between 3 and 450 then raise exception 'Note must be 3 to 450 characters'; end if;
    if v_status='Cancelled' then raise exception 'Reopen the ticket before adding a note'; end if;
    v_title:='Student update'; v_message:=trim(p_note);
  elsif p_action='cancel-ticket' then
    if v_status='Cancelled' then raise exception 'Already cancelled'; end if;
    v_status:='Cancelled'; v_title:='Request cancelled'; v_message:='The student cancelled this request.';
  elsif p_action='reopen-ticket' then
    if v_status<>'Cancelled' then raise exception 'Only cancelled requests may be reopened'; end if;
    v_status:='Pending'; v_title:='Request reopened'; v_message:='Returned to pending for staff review.';
  else raise exception 'Action not allowed'; end if;
  v_data := v_row.data || jsonb_build_object('status',v_status,'updatedAt',v_time,'history',coalesce(v_row.data->'history','[]'::jsonb) || jsonb_build_array(jsonb_build_object('at',v_time,'title',v_title,'message',v_message)));
  update public.support_tickets set data=v_data,updated_at=now() where id=p_id;
  return v_data;
end;
$$;

create or replace function public.accessable_staff_update_ticket(p_id text,p_status text,p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.support_tickets%rowtype; v_time text := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); v_data jsonb;
begin
  if not public.accessable_is_staff() then raise exception 'Access denied: staff role required'; end if;
  if p_status not in ('Pending','In progress','Resolved','Cancelled') then raise exception 'Invalid status'; end if;
  if length(coalesce(p_note,'')) > 1200 then raise exception 'Note is too long'; end if;
  select * into v_row from public.support_tickets where id=p_id for update;
  if not found then raise exception 'Ticket not found'; end if;
  v_data := v_row.data || jsonb_build_object('status',p_status,'updatedAt',v_time,'assignedTo',coalesce(auth.jwt()->>'email','Staff'),
    'history',coalesce(v_row.data->'history','[]'::jsonb) || jsonb_build_array(jsonb_build_object('at',v_time,'title','Staff update','message',case when trim(coalesce(p_note,''))<>'' then trim(p_note) else 'Status changed to ' || p_status end)));
  update public.support_tickets set data=v_data,updated_at=now() where id=p_id;
  return v_data;
end;
$$;

create or replace function public.accessable_student_cancel_appointment(p_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.support_appointments%rowtype; v_time text := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); v_data jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_row from public.support_appointments where id=p_id and owner_uid=auth.uid() for update;
  if not found then raise exception 'Appointment not found'; end if;
  v_data:=v_row.data || jsonb_build_object('status','Cancelled','updatedAt',v_time);
  update public.support_appointments set data=v_data,updated_at=now() where id=p_id;
  return v_data;
end;
$$;

create or replace function public.accessable_staff_update_appointment(p_id text,p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.support_appointments%rowtype; v_time text := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); v_data jsonb;
begin
  if not public.accessable_is_staff() then raise exception 'Access denied: staff role required'; end if;
  if p_status not in ('Under review','Accepted','Declined','Cancelled') then raise exception 'Invalid appointment status'; end if;
  select * into v_row from public.support_appointments where id=p_id for update;
  if not found then raise exception 'Appointment not found'; end if;
  v_data:=v_row.data || jsonb_build_object('status',p_status,'updatedAt',v_time,'reviewedBy',coalesce(auth.jwt()->>'email','Staff'));
  update public.support_appointments set data=v_data,updated_at=now() where id=p_id;
  return v_data;
end;
$$;

revoke all on function public.accessable_submit_ticket(jsonb), public.accessable_submit_appointment(jsonb),
 public.accessable_student_update_ticket(text,text,text), public.accessable_staff_update_ticket(text,text,text),
 public.accessable_student_cancel_appointment(text), public.accessable_staff_update_appointment(text,text) from public,anon;
grant execute on function public.accessable_submit_ticket(jsonb), public.accessable_submit_appointment(jsonb),
 public.accessable_student_update_ticket(text,text,text), public.accessable_staff_update_ticket(text,text,text),
 public.accessable_student_cancel_appointment(text), public.accessable_staff_update_appointment(text,text) to authenticated;

