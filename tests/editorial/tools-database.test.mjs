import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const users = {
  alice: "00000000-0000-4000-8000-000000000001",
  bob: "00000000-0000-4000-8000-000000000002",
  admin: "00000000-0000-4000-8000-000000000003",
};
async function role(db, name) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    users[name] || "",
  ]);
  await db.exec("set role " + (name === "anon" ? "anon" : "authenticated"));
}
async function save(db, id = "00000000-0000-4000-8000-000000000101") {
  return (
    await db.query(
      "select public.save_tool_run($1,'claro',1,'Meu resultado',$2,$3,now(),$1,'{}') as id",
      [
        id,
        { context: "PRIVATE_ALICE_ANSWER" },
        { title: "Resultado", lines: ["PRIVATE_ALICE_RESULT"] },
      ],
    )
  ).rows[0].id;
}
test("Tools database: ownership, RLS, consent isolation, idempotency, bounds and retention", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,private to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table public.site_staff(user_id uuid primary key,role text);alter table public.site_staff enable row level security;grant select on public.site_staff to authenticated;
 create policy self on public.site_staff for select to authenticated using(user_id=(select auth.uid()));
 alter default privileges in schema public grant all on tables to anon,authenticated;`);
  for (const id of Object.values(users))
    await db.query("insert into auth.users values($1)", [id]);
  await db.query("insert into public.site_staff values($1,'admin')", [
    users.admin,
  ]);
  await db.exec(
    await readFile(
      "supabase/migrations/20261012214913_portal_tools_platform_foundation.sql",
      "utf8",
    ),
  );
  await t.test(
    "anonymous catalog/versions readable; private history and saving require auth",
    async () => {
      await role(db, "anon");
      assert.equal(
        (await db.query("select * from public.tools")).rows.length,
        4,
      );
      assert.equal(
        (await db.query("select * from public.tool_versions")).rows.length,
        4,
      );
      for (const table of [
        "tool_runs",
        "tool_consents",
        "tool_exports",
        "tool_events",
        "tool_admin_audit",
      ])
        await assert.rejects(
          db.query("select * from public." + table),
          /permission denied/,
        );
      await assert.rejects(save(db), /permission denied/);
      await assert.rejects(
        db.query(
          "insert into public.tool_events(tool_id,event_name,consent) values('claro','tool_viewed',false)",
        ),
      );
      await db.query(
        "insert into public.tool_events(tool_id,event_name,consent) values('claro','tool_viewed',true)",
      );
      await assert.rejects(
        db.query(
          "insert into public.tool_events(tool_id,event_name,consent,step_key) values('claro','tool_step_completed',true,'email')",
        ),
        /Invalid tool step/,
      );
    },
  );
  let run;
  await t.test(
    "save is atomic, consented and idempotent; versions cannot be forged or changed",
    async () => {
      await role(db, "alice");
      run = await save(db);
      assert.equal(await save(db), run);
      assert.equal(
        (await db.query("select * from public.tool_runs")).rows.length,
        1,
      );
      assert.equal(
        (await db.query("select * from public.tool_consents")).rows.length,
        1,
      );
      const r = (await db.query("select * from public.tool_runs")).rows[0];
      assert.equal(r.user_id, users.alice);
      assert.equal(r.consent_state.intelligence, false);
      assert.equal(r.anonymous_id, null);
      await assert.rejects(
        db.query("update public.tool_runs set user_id=$1 where id=$2", [
          users.bob,
          run,
        ]),
        /permission denied/,
      );
      await assert.rejects(
        db.query("update public.tool_runs set answers='{}' where id=$1", [run]),
        /permission denied/,
      );
      await assert.rejects(
        db.query("update public.tool_versions set version=9"),
        /permission denied/,
      );
      await db.query(
        "update public.tool_runs set favorite=true,name='Renomeado' where id=$1",
        [run],
      );
    },
  );
  await t.test(
    "other accounts and staff cannot read, modify, delete or export private results",
    async () => {
      for (const name of ["bob", "admin"]) {
        await role(db, name);
        assert.equal(
          (await db.query("select * from public.tool_runs")).rows.length,
          0,
        );
        assert.equal(
          (await db.query("select * from public.tool_consents")).rows.length,
          0,
        );
        assert.equal(
          (
            await db.query(
              "update public.tool_runs set favorite=false where id=$1 returning id",
              [run],
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await db.query(
              "delete from public.tool_runs where id=$1 returning id",
              [run],
            )
          ).rows.length,
          0,
        );
        await assert.rejects(
          db.query(
            "insert into public.tool_exports(run_id,user_id,format) values($1,$2,'csv')",
            [run, users[name]],
          ),
        );
      }
    },
  );
  await t.test(
    "admin usage contains consented actions only, no answers/identity; audited pause prevents runs",
    async () => {
      await role(db, "admin");
      const view = (await db.query("select * from public.tool_usage_summary"))
        .rows;
      assert.equal(Number(view.find((x) => x.tool_id === "claro").views), 1);
      assert.ok(!JSON.stringify(view).includes("PRIVATE"));
      assert.ok(!JSON.stringify(view).includes(users.alice));
      await db.query(
        "update public.tools set status='paused' where id='claro'",
      );
      assert.equal(
        (await db.query("select * from public.tool_admin_audit")).rows.length,
        1,
      );
      await role(db, "alice");
      await assert.rejects(
        save(db, "00000000-0000-4000-8000-000000000102"),
        /Tool version unavailable/,
      );
      assert.equal(
        (await db.query("select * from public.tool_consents")).rows.length,
        1,
      );
      await role(db, "admin");
      await db.query(
        "update public.tools set status='published' where id='claro'",
      );
      await role(db, "bob");
      await assert.rejects(
        db
          .query(
            "update public.tools set status='paused' where id='claro' returning id",
          )
          .then((r) => {
            assert.equal(r.rows.length, 0);
            throw Error("denied");
          }),
        /denied/,
      );
    },
  );
  await t.test(
    "rate bounds and payload constraints protect writable APIs",
    async () => {
      await role(db, "alice");
      await assert.rejects(
        db.query(
          "select public.save_tool_run(gen_random_uuid(),'claro',1,'Huge',$1,'{}',now(),gen_random_uuid(),'{}')",
          [{ context: "x".repeat(33000) }],
        ),
      );
      await assert.rejects(
        db.query(
          "select public.save_tool_run(gen_random_uuid(),'claro',99,'Wrong','{}','{}',now(),gen_random_uuid(),'{}')",
        ),
        /Tool version unavailable/,
      );
      for (let i = 0; i < 29; i++)
        await save(
          db,
          "00000000-0000-4000-8000-" + String(200 + i).padStart(12, "0"),
        );
      await assert.rejects(
        save(db, "00000000-0000-4000-8000-000000000999"),
        /Private history limit/,
      );
      await role(db, "anon");
      for (let i = 0; i < 299; i++)
        await db.query(
          "insert into public.tool_events(tool_id,event_name,consent) values('claro','tool_started',true)",
        );
      await assert.rejects(
        db.query(
          "insert into public.tool_events(tool_id,event_name,consent) values('claro','tool_started',true)",
        ),
        /Tool event limit/,
      );
    },
  );
  await t.test(
    "exports cascade with owner deletion; retention prunes expired data",
    async () => {
      await role(db, "alice");
      await db.query(
        "insert into public.tool_exports(run_id,user_id,format) values($1,$2,'csv')",
        [run, users.alice],
      );
      await db.query("delete from public.tool_runs where id=$1", [run]);
      assert.equal(
        (await db.query("select * from public.tool_exports")).rows.length,
        0,
      );
      await assert.rejects(
        db.query("select private.prune_tool_data()"),
        /permission denied/,
      );
      await db.exec("reset role");
      await db.exec(
        "update public.tool_events set created_at=now()-interval '91 days';update public.tool_runs set started_at=now()-interval '367 days',completed_at=now()-interval '366 days';update public.tool_consents set created_at=now()-interval '366 days';select private.prune_tool_data();",
      );
      for (const table of ["tool_events", "tool_runs", "tool_consents"])
        assert.equal(
          (await db.query("select * from public." + table)).rows.length,
          0,
        );
    },
  );
});
