-- Wortschatz · step 1: accounts keep their own words, progress and settings.
--
-- Run once in the Supabase dashboard (SQL Editor → New query → paste → Run),
-- or with the Supabase CLI (`supabase db push`).
--
-- Built-in decks are not stored here: they ship with the app (one copy on the
-- CDN for everybody). A row in `cards` exists only for words a user has
-- studied, changed, deleted or created themselves.

-- ---------------------------------------------------------------------------
-- cards: one row per user and word
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id         text    not null check (char_length(id) between 1 and 64),

  -- text: only for the user's own words, or built-in words they edited
  deck       text    check (char_length(deck) <= 80),
  art        text    check (art in ('', 'der', 'die', 'das')),
  de         text    check (char_length(de) <= 200),
  en         text    check (char_length(en) <= 400),
  ex         text    check (char_length(ex) <= 600),
  ext        text    check (char_length(ext) <= 600),
  note       text    check (char_length(note) <= 400),

  -- spaced-repetition schedule (SM-2)
  phase      text    check (phase in ('new', 'learn', 'relearn', 'review')),
  ivl        double precision,
  ease       double precision,
  step       smallint,
  reps       integer not null default 0,
  lapses     integer not null default 0,
  due        bigint  not null default 0,      -- ms since epoch

  -- practice statistics
  seen       bigint,
  fails      integer not null default 0,
  wins       integer not null default 0,
  hard_pin   boolean not null default false,
  created    bigint,

  -- change stamps from the device (ms since epoch), used to merge two devices:
  -- mt = any change, st = last grading, et = last text edit
  mt         bigint  not null default 0,
  st         bigint  not null default 0,
  et         bigint  not null default 0,
  deleted    boolean not null default false,

  -- server clock: devices pull everything changed since their last pull
  updated_at timestamptz not null default clock_timestamp(),

  primary key (user_id, id)
);

create index if not exists cards_user_updated_idx on public.cards (user_id, updated_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before insert or update on public.cards
  for each row execute function public.set_updated_at();

alter table public.cards enable row level security;

drop policy if exists "Users read their own cards" on public.cards;
create policy "Users read their own cards"
  on public.cards for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users delete their own cards" on public.cards;
create policy "Users delete their own cards"
  on public.cards for delete to authenticated
  using (user_id = (select auth.uid()));

-- Writes only go through push_cards(), which merges instead of overwriting.
-- Rights are spelled out, so this works whatever the project's default privileges are.
revoke all on public.cards from anon;
revoke insert, update on public.cards from authenticated;
grant usage on schema public to authenticated;
grant select, delete on public.cards to authenticated;

-- ---------------------------------------------------------------------------
-- push_cards: save a batch of cards, merging each with what is already stored
-- ---------------------------------------------------------------------------
-- Two devices can change the same word. Each part of a card is taken from the
-- version that changed it last: the schedule from the latest grading (st), the
-- text from the latest edit (et), statistics and deletion from the latest
-- change of any kind (mt). So a quick practice round on the phone never
-- overwrites a real review done on the laptop.
create or replace function public.push_cards(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_n   integer;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 500 then
    raise exception 'send between 1 and 500 cards per call' using errcode = '22023';
  end if;

  insert into public.cards as c (
    user_id, id, deck, art, de, en, ex, ext, note,
    phase, ivl, ease, step, reps, lapses, due,
    seen, fails, wins, hard_pin, created, mt, st, et, deleted)
  select
    v_uid, r.id, r.deck, r.art, r.de, r.en, r.ex, r.ext, r.note,
    r.phase, r.ivl, r.ease, r.step, coalesce(r.reps, 0), coalesce(r.lapses, 0), coalesce(r.due, 0),
    r.seen, coalesce(r.fails, 0), coalesce(r.wins, 0), coalesce(r.hard_pin, false), r.created,
    coalesce(r.mt, 0), coalesce(r.st, 0), coalesce(r.et, 0), coalesce(r.deleted, false)
  from jsonb_to_recordset(p_rows) as r (
    id text, deck text, art text, de text, en text, ex text, ext text, note text,
    phase text, ivl double precision, ease double precision, step smallint, reps integer, lapses integer, due bigint,
    seen bigint, fails integer, wins integer, hard_pin boolean, created bigint,
    mt bigint, st bigint, et bigint, deleted boolean)
  on conflict (user_id, id) do update set
    -- statistics and deletion: latest change wins
    seen     = case when excluded.mt >= c.mt then excluded.seen     else c.seen     end,
    fails    = case when excluded.mt >= c.mt then excluded.fails    else c.fails    end,
    wins     = case when excluded.mt >= c.mt then excluded.wins     else c.wins     end,
    hard_pin = case when excluded.mt >= c.mt then excluded.hard_pin else c.hard_pin end,
    deleted  = case when excluded.mt >= c.mt then excluded.deleted  else c.deleted  end,
    -- schedule: latest grading wins, then more repetitions, then the later due date
    phase  = case when (excluded.st, excluded.reps, excluded.due) > (c.st, c.reps, c.due) then excluded.phase  else c.phase  end,
    ivl    = case when (excluded.st, excluded.reps, excluded.due) > (c.st, c.reps, c.due) then excluded.ivl    else c.ivl    end,
    ease   = case when (excluded.st, excluded.reps, excluded.due) > (c.st, c.reps, c.due) then excluded.ease   else c.ease   end,
    step   = case when (excluded.st, excluded.reps, excluded.due) > (c.st, c.reps, c.due) then excluded.step   else c.step   end,
    reps   = case when (excluded.st, excluded.reps, excluded.due) > (c.st, c.reps, c.due) then excluded.reps   else c.reps   end,
    lapses = case when (excluded.st, excluded.reps, excluded.due) > (c.st, c.reps, c.due) then excluded.lapses else c.lapses end,
    due    = case when (excluded.st, excluded.reps, excluded.due) > (c.st, c.reps, c.due) then excluded.due    else c.due    end,
    st     = greatest(c.st, excluded.st),
    -- text: latest edit wins
    deck = case when excluded.et > c.et then excluded.deck else c.deck end,
    art  = case when excluded.et > c.et then excluded.art  else c.art  end,
    de   = case when excluded.et > c.et then excluded.de   else c.de   end,
    en   = case when excluded.et > c.et then excluded.en   else c.en   end,
    ex   = case when excluded.et > c.et then excluded.ex   else c.ex   end,
    ext  = case when excluded.et > c.et then excluded.ext  else c.ext  end,
    note = case when excluded.et > c.et then excluded.note else c.note end,
    et   = greatest(c.et, excluded.et),
    created = coalesce(c.created, excluded.created),
    mt      = greatest(c.mt, excluded.mt);

  get diagnostics v_n = row_count;

  -- keep one account from filling the whole database
  if (select count(*) from public.cards where user_id = v_uid) > 25000 then
    raise exception 'card limit reached' using errcode = '54000';
  end if;

  return v_n;
end;
$$;

revoke all on function public.push_cards(jsonb) from public, anon;
grant execute on function public.push_cards(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- user_state: settings, streak and selections (one small row per user)
-- ---------------------------------------------------------------------------
create table if not exists public.user_state (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb  not null default '{}'::jsonb check (pg_column_size(data) <= 65536),
  mt         bigint not null default 0,
  updated_at timestamptz not null default clock_timestamp()
);

drop trigger if exists user_state_set_updated_at on public.user_state;
create trigger user_state_set_updated_at
  before insert or update on public.user_state
  for each row execute function public.set_updated_at();

alter table public.user_state enable row level security;

drop policy if exists "Users manage their own state" on public.user_state;
create policy "Users manage their own state"
  on public.user_state for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.user_state from anon;
grant select, insert, update, delete on public.user_state to authenticated;
