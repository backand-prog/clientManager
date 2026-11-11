// Adatbázis-tesztek: csomaglimitek, várólista, jogosultságok, stúdió RLS.
// Futtatás: node tests/db-tests.mjs  (a TESZT Supabase projekten; élesen nem fut)
// Szükséges: SUPABASE_ACCESS_TOKEN (környezeti változó vagy .env.test), séma előzetesen feltöltve a teszt projektre.
// Minden forgatókönyv egy tranzakcióban fut, a végén szándékosan visszagördül, így nem marad tesztadat.
import { readFileSync, existsSync } from "node:fs";

const PROD_REF = "yrzeuixuigsnopglbcuc";
const ref = process.env.TEST_PROJECT_REF || "pkwrapajqguwbjztxrxd";
if (ref === PROD_REF) {
  console.error("Az éles projekten nem futtathatók a tesztek.");
  process.exit(2);
}

function accessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  if (existsSync(".env.test")) {
    const line = readFileSync(".env.test", "utf8").split(/\r?\n/).find((l) => l.startsWith("SUPABASE_ACCESS_TOKEN="));
    if (line) return line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
  }
  console.error("Hiányzik a SUPABASE_ACCESS_TOKEN.");
  process.exit(2);
}

const prelude = `
create or replace function pg_temp.mk(r text, tag text) returns uuid language plpgsql as $f$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data, instance_id, aud, role)
  values (u, tag || '@t.test', jsonb_build_object('role', 'client', 'full_name', tag), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  if r = 'trainer' then
    update public.profiles set role = 'trainer', trainer_application_status = 'approved' where id = u;
  end if;
  return u;
end $f$;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $f$;
create or replace function pg_temp.try(q text) returns text language plpgsql as $f$
begin execute q; return 'OK'; exception when others then return sqlerrm; end $f$;
create or replace function pg_temp.chk(name text, ok boolean) returns text language sql as $f$
  select case when coalesce(ok, false) then 'PASS ' else 'FAIL ' end || name || E'\\n' $f$;
`;

const scenarios = {
  "csomaglimitek értékei": `
    do $$ declare res text := ''; begin
      res := res || pg_temp.chk('free: 5 kliens', public.plan_limit('free','clients') = 5);
      res := res || pg_temp.chk('free: 8 fős csoport', public.plan_limit('free','group_capacity') = 8);
      res := res || pg_temp.chk('free: 2 edzésterv', public.plan_limit('free','training_plans') = 2);
      res := res || pg_temp.chk('pro: 30 kliens', public.plan_limit('pro','clients') = 30);
      res := res || pg_temp.chk('pro: 20 fős csoport', public.plan_limit('pro','group_capacity') = 20);
      res := res || pg_temp.chk('pro: korlátlan edzésterv', public.plan_limit('pro','training_plans') is null);
      res := res || pg_temp.chk('studio: korlátlan', public.plan_limit('studio','clients') is null and public.plan_limit('studio','group_capacity') is null and public.plan_limit('studio','training_plans') is null);
      raise exception 'RESULT:%', res;
    end $$;`,

  "jogosultság-emelés tiltva": `
    do $$ declare res text := ''; c uuid := pg_temp.mk('client','esc'); r text; begin
      perform pg_temp.as_user(c);
      r := pg_temp.try('update public.profiles set role = ''admin'' where id = ''' || c || '''');
      res := res || pg_temp.chk('kliens nem teheti magát adminná', r <> 'OK');
      r := pg_temp.try('update public.profiles set parent_studio_id = ''' || c || ''' where id = ''' || c || '''');
      res := res || pg_temp.chk('parent_studio_id nem írható', r <> 'OK');
      r := pg_temp.try('update public.subscriptions set plan = ''studio'' where user_id = ''' || c || '''');
      res := res || pg_temp.chk('csomag nem módosítható', r <> 'OK');
      r := pg_temp.try('insert into public.subscriptions (user_id, plan) values (gen_random_uuid(), ''studio'')');
      res := res || pg_temp.chk('előfizetés nem szúrható be', r <> 'OK');
      res := res || pg_temp.chk('kliens csomagja free', public.current_plan() = 'free');
      raise exception 'RESULT:%', res;
    end $$;`,

  "csoportos edzés létszám és várólista": `
    do $$ declare res text := ''; t uuid := pg_temp.mk('trainer','gt'); c1 uuid := pg_temp.mk('client','g1'); c2 uuid := pg_temp.mk('client','g2'); c3 uuid := pg_temp.mk('client','g3'); w uuid; r text; s text;
    begin
      insert into public.client_trainers (client_id, trainer_id) values (c1, t), (c2, t), (c3, t);
      perform pg_temp.as_user(t);
      r := pg_temp.try('select public.create_group_workout(''X'', '''', now() + interval ''2 days'', 60, 9)');
      res := res || pg_temp.chk('free: 9 fős csoport tiltva', r <> 'OK');
      select public.create_group_workout('Y', '', now() + interval '2 days', 60, 2, 'A terem') into w;
      res := res || pg_temp.chk('free: 2 fős csoport létrejön', w is not null);
      reset role; update public.subscriptions set plan = 'pro' where user_id = t; perform pg_temp.as_user(t);
      r := pg_temp.try('select public.create_group_workout(''Z'', '''', now() + interval ''2 days'', 60, 21)');
      res := res || pg_temp.chk('pro: 21 fős csoport tiltva', r <> 'OK');
      r := pg_temp.try('select public.create_group_workout(''Z'', '''', now() + interval ''2 days'', 60, 20)');
      res := res || pg_temp.chk('pro: 20 fős csoport engedett', r = 'OK');
      reset role;
      perform pg_temp.as_user(c1); perform public.join_group_workout(w);
      reset role; perform pg_temp.as_user(c2); perform public.join_group_workout(w);
      reset role; perform pg_temp.as_user(c3); perform public.join_group_workout(w);
      reset role;
      select status into s from public.group_workout_registrations where group_workout_id = w and client_id = c3;
      res := res || pg_temp.chk('harmadik jelentkező várólistára kerül', s = 'waitlisted');
      perform pg_temp.as_user(c1); perform public.leave_group_workout(w); reset role;
      select status into s from public.group_workout_registrations where group_workout_id = w and client_id = c3;
      res := res || pg_temp.chk('lemondás után a várólistás előlép', s = 'registered');
      raise exception 'RESULT:%', res;
    end $$;`,

  "kliensszám-limit": `
    do $$ declare res text := ''; t uuid := pg_temp.mk('trainer','lt'); extra uuid := pg_temp.mk('client','lx'); req uuid; r text; i int; cc uuid;
    begin
      for i in 1..5 loop
        cc := pg_temp.mk('client','lc' || i);
        insert into public.client_trainers (client_id, trainer_id) values (cc, t);
      end loop;
      perform pg_temp.as_user(extra);
      select public.create_connection_request_by_id(t) into req;
      reset role; perform pg_temp.as_user(t);
      r := pg_temp.try('select public.respond_connection_request(''' || req || ''', ''approved'')');
      res := res || pg_temp.chk('free: a 6. kliens elutasítva', r <> 'OK');
      reset role; update public.subscriptions set plan = 'pro' where user_id = t; perform pg_temp.as_user(t);
      r := pg_temp.try('select public.respond_connection_request(''' || req || ''', ''approved'')');
      res := res || pg_temp.chk('pro: a 6. kliens engedett', r = 'OK');
      raise exception 'RESULT:%', res;
    end $$;`,

  "edzés-hozzárendelés védelem": `
    do $$ declare res text := ''; c1 uuid := pg_temp.mk('client','wc1'); c2 uuid := pg_temp.mk('client','wc2'); t1 uuid := pg_temp.mk('trainer','wt1'); t2 uuid := pg_temp.mk('trainer','wt2'); w uuid; r text;
    begin
      insert into public.client_trainers (client_id, trainer_id) values (c1, t1), (c2, t2);
      insert into public.workouts (client_id, trainer_id, workout_date, workout_time, workout_type, duration_minutes, status) values (c1, t1, current_date, '10:00', 'x', 30, 'Beütemezve') returning id into w;
      perform pg_temp.as_user(c1);
      r := pg_temp.try('insert into public.workouts (client_id, trainer_id, workout_date, workout_time, workout_type, duration_minutes, status) values (''' || c1 || ''', ''' || t2 || ''', current_date, ''10:00'', ''x'', 30, ''Beütemezve'')');
      res := res || pg_temp.chk('kliens nem írhat idegen edző nevére', r <> 'OK');
      r := pg_temp.try('insert into public.workouts (client_id, workout_date, workout_time, workout_type, duration_minutes, status) values (''' || c1 || ''', current_date, ''11:00'', ''solo'', 30, ''Beütemezve'')');
      res := res || pg_temp.chk('egyéni edzés engedett', r = 'OK');
      reset role; perform pg_temp.as_user(t1);
      r := pg_temp.try('update public.workouts set client_id = ''' || c2 || ''' where id = ''' || w || '''');
      res := res || pg_temp.chk('edző nem tehet át edzést idegen kliensre', r <> 'OK');
      r := pg_temp.try('update public.workouts set notes = ''n'' where id = ''' || w || '''');
      res := res || pg_temp.chk('normál módosítás engedett', r = 'OK');
      raise exception 'RESULT:%', res;
    end $$;`,

  "edző-választás és kliens-korlát": `
    do $$ declare res text := ''; c uuid := pg_temp.mk('client','dc'); t1 uuid := pg_temp.mk('trainer','dt1'); t2 uuid := pg_temp.mk('trainer','dt2'); t3 uuid := pg_temp.mk('trainer','dt3'); w uuid; r text; n int;
    begin
      insert into public.client_trainers (client_id, trainer_id) values (c, t1), (c, t2);
      insert into public.workouts (client_id, trainer_id, workout_date, workout_time, workout_type, duration_minutes, status) values (c, t1, current_date, '10:00', 'x', 30, 'Beütemezve') returning id into w;
      perform pg_temp.as_user(c);
      r := pg_temp.try('insert into public.workouts (client_id, trainer_id, workout_date, workout_time, workout_type, duration_minutes, status) values (''' || c || ''', ''' || t1 || ''', current_date, ''12:00'', ''k'', 30, ''Beütemezve'')');
      res := res || pg_temp.chk('kliens a saját edzőjét sem adhatja meg új edzésnél', r <> 'OK');
      r := pg_temp.try('update public.workouts set trainer_id = null where id = ''' || w || '''');
      res := res || pg_temp.chk('kliens nem törölheti az edzés edzőjét', r <> 'OK');
      r := pg_temp.try('update public.workouts set trainer_id = ''' || t2 || ''' where id = ''' || w || '''');
      res := res || pg_temp.chk('kliens nem cserélheti az edzés edzőjét', r <> 'OK');
      r := pg_temp.try('insert into public.workouts (client_id, workout_date, workout_time, workout_type, duration_minutes, status) values (''' || c || ''', current_date, ''13:00'', ''solo'', 30, ''Beütemezve'')');
      res := res || pg_temp.chk('kliens felvehet egyéni edzést edző nélkül', r = 'OK');
      select count(*) into n from public.get_client_trainer_directory();
      res := res || pg_temp.chk('kliens látja a hozzá rendelt edzők nevét', n = 2);
      reset role; perform pg_temp.as_user(t1);
      r := pg_temp.try('insert into public.workouts (client_id, trainer_id, workout_date, workout_time, workout_type, duration_minutes, status) values (''' || c || ''', ''' || t1 || ''', current_date, ''14:00'', ''own'', 30, ''Beütemezve'')');
      res := res || pg_temp.chk('edző felvehet edzést saját magával', r = 'OK');
      r := pg_temp.try('insert into public.workouts (client_id, trainer_id, workout_date, workout_time, workout_type, duration_minutes, status) values (''' || c || ''', ''' || t2 || ''', current_date, ''15:00'', ''other'', 30, ''Beütemezve'')');
      res := res || pg_temp.chk('edző megadhat másik, a klienshez rendelt edzőt', r = 'OK');
      r := pg_temp.try('insert into public.workouts (client_id, trainer_id, workout_date, workout_time, workout_type, duration_minutes, status) values (''' || c || ''', ''' || t3 || ''', current_date, ''16:00'', ''bad'', 30, ''Beütemezve'')');
      res := res || pg_temp.chk('edző nem adhat meg a klienshez nem rendelt edzőt', r <> 'OK');
      r := pg_temp.try('update public.workouts set trainer_id = ''' || t2 || ''' where id = ''' || w || '''');
      res := res || pg_temp.chk('edző átadhatja az edzést a klienshez rendelt társának', r = 'OK');
      select count(*) into n from public.get_client_trainer_directory();
      res := res || pg_temp.chk('edző látja a kliens összes edzőjét', n = 2);
      raise exception 'RESULT:%', res;
    end $$;`,

  "edzésterv módosítása: teljesített edzések érintetlenek": `
    do $$ declare res text := ''; t uuid := pg_temp.mk('trainer','pt'); c uuid := pg_temp.mk('client','pc'); p uuid; d1 uuid; d2 uuid; wd uuid; wp uuid; wd2 uuid; r text; n int; nd uuid; ttl text;
    begin
      insert into public.client_trainers (client_id, trainer_id) values (c, t);
      perform pg_temp.as_user(t);
      p := public.save_training_plan(jsonb_build_object('title','T','description','','isPublic',false,'clientIds',jsonb_build_array(c),
        'days', jsonb_build_array(
          jsonb_build_object('title','A','notes','','exercises',jsonb_build_array(jsonb_build_object('name','Guggolás','sets',3,'reps','10','restSeconds',60,'notes',''))),
          jsonb_build_object('title','B','notes','','exercises',jsonb_build_array(jsonb_build_object('name','Húzódzkodás','sets',3,'reps','5','restSeconds',null,'notes',''))))));
      select id into d1 from public.training_plan_days where plan_id = p and title = 'A';
      select id into d2 from public.training_plan_days where plan_id = p and title = 'B';
      insert into public.workouts (client_id, trainer_id, workout_date, workout_time, workout_type, duration_minutes, status, training_plan_day_id) values (c, t, current_date - 3, '10:00', 'x', 30, 'Teljesítve', d1) returning id into wd;
      insert into public.workouts (client_id, trainer_id, workout_date, workout_time, workout_type, duration_minutes, status, training_plan_day_id) values (c, t, current_date + 3, '10:00', 'x', 30, 'Beütemezve', d1) returning id into wp;
      insert into public.workouts (client_id, trainer_id, workout_date, workout_time, workout_type, duration_minutes, status, training_plan_day_id) values (c, t, current_date - 2, '10:00', 'x', 30, 'Teljesítve', d2) returning id into wd2;
      -- A módosítása, B változatlan
      perform public.save_training_plan(jsonb_build_object('id',p,'title','T','description','','isPublic',false,'clientIds',jsonb_build_array(c),
        'days', jsonb_build_array(
          jsonb_build_object('id',d1,'title','A2','notes','','exercises',jsonb_build_array(jsonb_build_object('name','Felhúzás','sets',5,'reps','5','restSeconds',90,'notes',''))),
          jsonb_build_object('id',d2,'title','B','notes','','exercises',jsonb_build_array(jsonb_build_object('name','Húzódzkodás','sets',3,'reps','5','restSeconds',null,'notes',''))))));
      select title into ttl from public.training_plan_days where id = d1;
      res := res || pg_temp.chk('a teljesített edzés napja változatlan marad', ttl = 'A' and (select training_plan_day_id from public.workouts where id = wd) = d1);
      select count(*) into n from public.training_plan_exercises where day_id = d1 and name = 'Guggolás';
      res := res || pg_temp.chk('a régi gyakorlatok megmaradnak', n = 1);
      select training_plan_day_id into nd from public.workouts where id = wp;
      res := res || pg_temp.chk('a még el nem végzett edzés az új verzióra mutat', nd <> d1 and (select title from public.training_plan_days where id = nd) = 'A2' and (select archived_at from public.training_plan_days where id = d1) is not null);
      res := res || pg_temp.chk('a változatlan nap nem archiválódik', (select archived_at from public.training_plan_days where id = d2) is null and (select training_plan_day_id from public.workouts where id = wd2) = d2);
      -- B napot töröljük
      perform public.save_training_plan(jsonb_build_object('id',p,'title','T','description','','isPublic',false,'clientIds',jsonb_build_array(c),
        'days', jsonb_build_array(
          jsonb_build_object('id',nd,'title','A2','notes','','exercises',jsonb_build_array(jsonb_build_object('name','Felhúzás','sets',5,'reps','5','restSeconds',90,'notes',''))))));
      res := res || pg_temp.chk('törölt napot teljesített edzés miatt megőrzi (archiválva)', (select archived_at from public.training_plan_days where id = d2) is not null and (select training_plan_day_id from public.workouts where id = wd2) = d2);
      select count(*) into n from public.training_plan_days where plan_id = p and archived_at is null;
      res := res || pg_temp.chk('egy aktív nap maradt', n = 1);
      raise exception 'RESULT:%', res;
    end $$;`,

  "stúdió RLS és csomag-öröklés": `
    do $$ declare res text := ''; h uuid := pg_temp.mk('trainer','sh'); s uuid := pg_temp.mk('trainer','ss'); o uuid := pg_temp.mk('trainer','so');
      cs uuid := pg_temp.mk('client','scs'); co uuid := pg_temp.mk('client','sco'); ch uuid := pg_temp.mk('client','sch'); n int;
    begin
      update public.subscriptions set plan = 'studio' where user_id = h;
      update public.profiles set parent_studio_id = h where id = s;
      insert into public.client_trainers (client_id, trainer_id) values (cs, s), (co, o), (ch, h);
      insert into public.workouts (client_id, trainer_id, workout_date, workout_time, workout_type, duration_minutes, status) values
        (cs, s, current_date, '10:00', 'sub', 30, 'Beütemezve'), (co, o, current_date, '10:00', 'other', 30, 'Beütemezve'), (ch, h, current_date, '10:00', 'head', 30, 'Beütemezve');

      perform pg_temp.as_user(h);
      select count(*) into n from public.workouts where workout_type = 'sub';
      res := res || pg_temp.chk('vezető látja az al-edző edzéseit', n = 1);
      select count(*) into n from public.workouts where workout_type = 'other';
      res := res || pg_temp.chk('vezető nem látja idegen edző edzéseit', n = 0);
      select count(*) into n from public.profiles where id = cs;
      res := res || pg_temp.chk('vezető látja az al-edző kliensprofilját', n = 1);

      reset role; perform pg_temp.as_user(s);
      select count(*) into n from public.workouts where workout_type = 'head';
      res := res || pg_temp.chk('al-edző nem látja a vezető klienseit', n = 0);
      select count(*) into n from public.workouts where workout_type = 'sub';
      res := res || pg_temp.chk('al-edző látja a sajátját', n = 1);
      res := res || pg_temp.chk('al-edző NEM örökli a Studio csomagot', public.current_plan() = 'free');

      reset role; update public.subscriptions set status = 'canceled' where user_id = h; perform pg_temp.as_user(h);
      select count(*) into n from public.workouts where workout_type = 'sub';
      res := res || pg_temp.chk('lemondott Studio csomagnál megszűnik a hozzáférés', n = 0);
      raise exception 'RESULT:%', res;
    end $$;`
};

async function run(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql })
  });
  return response.text();
}

let failed = 0;
for (const [name, body] of Object.entries(scenarios)) {
  const text = await run(prelude + body);
  let message = text;
  try { message = JSON.parse(text).message ?? text; } catch { /* nyers szöveg marad */ }
  const match = String(message).match(/RESULT:([\s\S]*?)(?:\nCONTEXT:|$)/);
  console.log(`\n■ ${name}`);
  if (!match) {
    failed += 1;
    console.log(`FAIL a forgatókönyv hibával leállt: ${String(message).slice(0, 500)}`);
    continue;
  }
  for (const line of match[1].split("\n").filter(Boolean)) {
    if (line.startsWith("FAIL")) failed += 1;
    console.log(line);
  }
}
console.log(failed ? `\n${failed} hiba.` : "\nMinden teszt sikeres.");
process.exit(failed ? 1 : 0);
