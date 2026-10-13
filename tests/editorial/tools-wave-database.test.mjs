import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const alice = "00000000-0000-4000-8000-000000000001",
  bob = "00000000-0000-4000-8000-000000000002";
async function role(db, id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id || "",
  ]);
  await db.exec("set role " + (id ? "authenticated" : "anon"));
}
async function save(
  db,
  {
    id = "00000000-0000-4000-8000-000000000100",
    tool = "claro",
    version = 2,
    parent = null,
  } = {},
) {
  return (
    await db.query(
      "select public.save_tool_run_v2($1,$2,$3,'Revisão','{}','{}',now(),gen_random_uuid(),'{}',$4) as id",
      [id, tool, version, parent],
    )
  ).rows[0].id;
}
test("Wave migration preserves v1/private data and enforces revision ownership across versions", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create schema private;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,private to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create table public.site_staff(user_id uuid primary key,role text);alter table public.site_staff enable row level security;grant select on public.site_staff to authenticated;create policy self on public.site_staff for select to authenticated using(user_id=(select auth.uid()));`,
  );
  await db.query("insert into auth.users values($1),($2)", [alice, bob]);
  await db.exec(
    await readFile(
      "supabase/migrations/20261012214913_portal_tools_platform_foundation.sql",
      "utf8",
    ),
  );
  await role(db, alice);
  const old = (
    await db.query(
      "select public.save_tool_run(gen_random_uuid(),'claro',1,'ORIGINAL',$1,$2,now(),gen_random_uuid(),'{}') as id",
      [
        { context: "PRIVATE_SOURCE" },
        { title: "Original", lines: ["PRIVATE_RESULT"] },
      ],
    )
  ).rows[0].id;
  const snapshot = (
    await db.query("select * from public.tool_runs where id=$1", [old])
  ).rows[0];
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await db.exec(
    await readFile(
      "supabase/migrations/20261013000606_portal_tools_wave_one.sql",
      "utf8",
    ),
  );
  assert.equal((await db.query("select * from public.tools")).rows.length, 8);
  assert.equal(
    (await db.query("select * from public.tool_versions")).rows.length,
    12,
  );
  assert.deepEqual(
    (await db.query("select * from public.tool_runs where id=$1", [old]))
      .rows[0],
    { ...snapshot, parent_run_id: null },
  );
  assert.equal(
    (
      await db.query(
        "select tgenabled from pg_trigger where tgname='tool_admin_audit_trigger'",
      )
    ).rows[0].tgenabled,
    "O",
  );
  await role(db, alice);
  const revision = await save(db, { parent: old });
  assert.equal(
    (
      await db.query("select parent_run_id from public.tool_runs where id=$1", [
        revision,
      ])
    ).rows[0].parent_run_id,
    old,
  );
  assert.equal(await save(db, { parent: old }), revision);
  assert.equal(
    (await db.query("select * from public.tool_consents")).rows.length,
    2,
  );
  await assert.rejects(
    db.query("update public.tool_runs set parent_run_id=null where id=$1", [
      revision,
    ]),
    /permission denied/,
  );
  await role(db, bob);
  assert.equal(
    (await db.query("select * from public.tool_runs")).rows.length,
    0,
  );
  await assert.rejects(
    save(db, { id: "00000000-0000-4000-8000-000000000102", parent: old }),
    /Own source run required/,
  );
  assert.equal(
    (await db.query("select * from public.tool_consents")).rows.length,
    0,
  );
  await role(db, alice);
  await assert.rejects(
    save(db, {
      id: "00000000-0000-4000-8000-000000000103",
      tool: "follow-up",
      version: 1,
      parent: old,
    }),
    /Own source run required/,
  );
  await assert.rejects(
    save(db, { id: "00000000-0000-4000-8000-000000000104", version: 99 }),
    /Tool version unavailable/,
  );
  // Old clients can still save the recorded v1 method during rollout or rollback.
  await db.query(
    "select public.save_tool_run(gen_random_uuid(),'claro',1,'Compatible','{}','{}',now(),gen_random_uuid(),'{}')",
  );
  await db.query("delete from public.tool_runs where id=$1", [old]);
  assert.equal(
    (
      await db.query("select parent_run_id from public.tool_runs where id=$1", [
        revision,
      ])
    ).rows[0].parent_run_id,
    null,
  );
  await role(db, null);
  await assert.rejects(save(db), /permission denied/);
  await assert.rejects(
    db.query("select * from public.tool_runs"),
    /permission denied/,
  );
  assert.equal((await db.query("select * from public.tools")).rows.length, 8);
});
