import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildImportSQL,
  PORTAL_PROJECT,
} from "../../scripts/editorial/import.mjs";
import { PGlite } from "@electric-sql/pglite";

const ids = {
  admin: "00000000-0000-4000-8000-000000000001",
  editor: "00000000-0000-4000-8000-000000000002",
  author: "00000000-0000-4000-8000-000000000003",
  alice: "00000000-0000-4000-8000-000000000004",
  bob: "00000000-0000-4000-8000-000000000005",
  moderator: "00000000-0000-4000-8000-000000000006",
};
const q = (s) => "'" + s.replaceAll("'", "''") + "'";
test('CMS image settings validate photographic positions and preserve version history',async(t)=>{
 const db=await init();t.after(()=>db.close());
 const id=await article(db,'image-settings');
 await db.query("update public.content_posts set image_variant='photography',hero_position='50% 30%',card_image='/images/hero.webp' where id=$1",[id]);
 await assert.rejects(db.query("update public.content_posts set hero_position='url(https://example.test)' where id=$1",[id]));
 await assert.rejects(db.query("update public.content_posts set hero_position='101% 30%' where id=$1",[id]));
 await assert.rejects(db.query("update public.content_posts set image_variant='unsafe' where id=$1",[id]));
 const version=(await db.query('select snapshot from public.article_versions where post_id=$1 order by version desc limit 1',[id])).rows[0];
 assert.equal(version.snapshot.image_variant,'photography');assert.equal(version.snapshot.hero_position,'50% 30%');
 await role(db,'anon');assert.equal((await db.query('select * from public.content_posts where id=$1',[id])).rows.length,0);
});
async function init() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter default privileges in schema public grant all on tables to anon,authenticated;alter default privileges in schema public grant all on sequences to anon,authenticated;alter table storage.objects enable row level security;`);
  await db.exec(await readFile("database/schema.sql", "utf8"));
  await db.exec(
    await readFile(
      "supabase/migrations/20261012044628_editorial_cms_v1.sql",
      "utf8",
    ),
  );
  const scheduler = (
    await readFile(
      "supabase/migrations/20261012044637_editorial_scheduler.sql",
      "utf8",
    )
  ).replace(
    /create extension if not exists pg_cron;[\s\S]*?commit;/,
    "commit;",
  );
  await db.exec(scheduler);
  await db.exec(await readFile('supabase/migrations/20261012140046_portal_ux_image_variants.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/20261012153255_editorial_media_banners.sql','utf8'));
  await db.exec('grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;');
  for (const [name, id] of Object.entries(ids)) {
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
      [id, name + "@test.invalid"],
    );
    if (["admin", "editor", "author", "moderator"].includes(name))
      await db.query(
        "insert into public.site_staff(user_id,role) values($1,$2)",
        [id, name],
      );
  }
  return db;
}
async function role(db, name) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    ids[name] || "",
  ]);
  await db.exec("set role " + (name === "anon" ? "anon" : "authenticated"));
}
async function article(db, slug = "test-one") {
  await role(db, "admin");
  const r = await db.query(
    `insert into public.content_posts(title,slug,excerpt,body,featured_image,hero_image_alt,published_at) values('Test article',$1,'Excerpt','<h2>Real heading</h2><p>Actual text</p>','/images/hero.webp','Editorial illustration',now()) returning id,version`,
    [slug],
  );
  return r.rows[0].id;
}
async function publish(db, id) {
  await db.query(
    "update public.content_posts set status='review' where id=$1",
    [id],
  );
  await db.query(
    "update public.content_posts set status='approved' where id=$1",
    [id],
  );
  await db.query(
    "update public.content_posts set status='published' where id=$1",
    [id],
  );
}

test("Editorial database: RLS, workflow, ownership, versions, comments and scheduled publication", async (t) => {
  const db = await init();
  t.after(() => db.close());
  const id = await article(db);
  await t.test(
    "drafts/notes/versions are private; direct draft publication is rejected",
    async () => {
      await db.query(
        "insert into public.editorial_notes(post_id,notes) values($1,$2)",
        [id, "PRIVATE_NOTE"],
      );
      await assert.rejects(
        db.query(
          "update public.content_posts set status='published' where id=$1",
          [id],
        ),
        /Approve before/,
      );
      await role(db, "anon");
      assert.equal(
        (await db.query("select * from public.content_posts")).rows.length,
        0,
      );
      await assert.rejects(
        db.query("select * from public.editorial_notes"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select * from public.article_versions"),
        /permission denied/,
      );
      await role(db, "alice");
      assert.equal(
        (await db.query("select * from public.editorial_notes")).rows.length,
        0,
      );
    },
  );
  await t.test(
    "author cannot publish, impersonate ownership, or edit another author; no-op writes preserve versions",
    async () => {
      await role(db, "author");
      const own = (
        await db.query(
          "insert into public.content_posts(title,slug,excerpt) values('Own article','own-article','text') returning id",
          [],
        )
      ).rows[0].id;
      await assert.rejects(
        db.query(
          "update public.content_posts set status='published' where id=$1",
          [own],
        ),
        /Publish permission|row-level/,
      );
      assert.equal(
        (
          await db.query(
            "update public.content_posts set title='Unauthorized edit' where id=$1 returning id",
            [id],
          )
        ).rows.length,
        0,
      );
      await db.query(
        "update public.content_posts set body='<pre><code>&amp;lt;button onclick=&amp;quot;safe()&amp;quot;&amp;gt;</code></pre>' where id=$1",
        [own],
      );
      await assert.rejects(
        db.query(
          'update public.content_posts set body=\'<img src="/images/hero.webp" onerror="alert(1)">\' where id=$1',
          [own],
        ),
        /Unsafe markup/,
      );
      await assert.rejects(
        db.query("update public.content_posts set created_by=$1 where id=$2", [
          ids.alice,
          own,
        ]),
        /Immutable ownership/,
      );
      await role(db, "admin");
      const before = (
        await db.query("select version from public.content_posts where id=$1", [
          id,
        ])
      ).rows[0].version;
      await db.query(
        "update public.content_posts set title=title where id=$1",
        [id],
      );
      assert.equal(
        (
          await db.query(
            "select version from public.content_posts where id=$1",
            [id],
          )
        ).rows[0].version,
        before,
      );
      await publish(db, id);
      await role(db, "editor");
      await assert.rejects(
        db.query(
          "update public.content_posts set body='<p>edit</p>' where id=$1",
          [id],
        ),
        /publisher|Publish permission/i,
      );
    },
  );
  let parent, child;
  await t.test(
    "comments need portal Auth/profile, valid published article, plain text and real moderation",
    async () => {
      await role(db, "alice");
      await db.query(
        "insert into public.comment_profiles(user_id,display_name) values($1,$2)",
        [ids.alice, "Alice"],
      );
      await assert.rejects(
        db.query(
          "insert into public.article_comments(article_id,user_id,body) values($1,$2,$3)",
          [id, ids.alice, "<img onerror=alert(1)>"],
        ),
        /Plain text/,
      );
      parent = (
        await db.query(
          "insert into public.article_comments(article_id,user_id,body) values($1,$2,$3) returning id,status",
          [id, ids.alice, "A real contribution"],
        )
      ).rows[0];
      assert.equal(parent.status, "pending");
      await assert.rejects(
        db.query(
          "insert into public.article_comments(article_id,user_id,body) values($1,$2,$3)",
          [id, ids.alice, "Too fast"],
        ),
        /rate limit/,
      );
      await role(db, "anon");
      assert.equal(
        (await db.query("select * from public.article_comments")).rows.length,
        0,
      );
      await role(db, "moderator");
      await db.query(
        "update public.article_comments set status='published' where id=$1",
        [parent.id],
      );
      await role(db, "bob");
      await db.query(
        "insert into public.comment_profiles(user_id,display_name) values($1,$2)",
        [ids.bob, "Bob"],
      );
      assert.equal(
        (
          await db.query(
            "update public.article_comments set body='Hijack',status='pending' where id=$1 returning id",
            [parent.id],
          )
        ).rows.length,
        0,
      );
      child = (
        await db.query(
          "insert into public.article_comments(article_id,user_id,parent_id,body) values($1,$2,$3,$4) returning *",
          [id, ids.bob, parent.id, "Reply with context"],
        )
      ).rows[0];
      assert.equal(child.root_id, parent.id);
      assert.equal(child.depth, 1);
      await assert.rejects(
        db.query(
          "update public.article_comments set parent_id=id where id=$1",
          [child.id],
        ),
        /Immutable/,
      );
      await role(db, "moderator");
      await db.query(
        "update public.article_comments set status='published' where id=$1",
        [child.id],
      );
      await assert.rejects(
        db.query(
          "update public.article_comments set body='Rewritten' where id=$1",
          [child.id],
        ),
        /cannot rewrite/,
      );
    },
  );
  await t.test(
    "reports are private; removed parents retain children and can be restored; edits return to review",
    async () => {
      await role(db, "alice");
      await db.query(
        "insert into public.comment_reports(comment_id,user_id,reason) values($1,$2,$3)",
        [child.id, ids.alice, "off_topic"],
      );
      await role(db, "bob");
      assert.equal(
        (await db.query("select * from public.comment_reports")).rows.length,
        0,
      );
      await role(db, "moderator");
      await db.query(
        "update public.article_comments set status='deleted' where id=$1",
        [parent.id],
      );
      await role(db, "anon");
      const rows = (await db.query("select * from public.article_comments"))
        .rows;
      assert.equal(rows.length, 2);
      assert.equal(rows.find((r) => r.id === parent.id).body, "");
      assert.equal(rows.find((r) => r.id === child.id).parent_id, parent.id);
      await role(db, "moderator");
      await db.query(
        "update public.article_comments set status='published' where id=$1",
        [parent.id],
      );
      assert.equal(
        (
          await db.query(
            "select body from public.article_comments where id=$1",
            [parent.id],
          )
        ).rows[0].body,
        "A real contribution",
      );
      await role(db, "bob");
      await db.query(
        "update public.article_comments set body='An edited reply',status='pending' where id=$1",
        [child.id],
      );
      const edited = (
        await db.query(
          "select status,edited_at from public.article_comments where id=$1",
          [child.id],
        )
      ).rows[0];
      assert.equal(edited.status, "pending");
      assert.ok(edited.edited_at);
    },
  );
  await t.test(
    "locked threads, suspended users, invalid parent/article are rejected",
    async () => {
      await role(db, "moderator");
      await db.query(
        "update public.article_comments set locked=true where id=$1",
        [parent.id],
      );
      await db.query(
        "insert into public.comment_bans(user_id,reason) values($1,$2)",
        [ids.author, "Repeated spam"],
      );
      await role(db, "author");
      await db.query(
        "insert into public.comment_profiles(user_id,display_name) values($1,$2)",
        [ids.author, "Author"],
      );
      await assert.rejects(
        db.query(
          "insert into public.article_comments(article_id,user_id,body) values($1,$2,$3)",
          [id, ids.author, "Blocked comment"],
        ),
        /suspended/,
      );
      await role(db, "editor");
      await db.query(
        "insert into public.comment_profiles(user_id,display_name) values($1,$2)",
        [ids.editor, "Editor"],
      );
      await assert.rejects(
        db.query(
          "insert into public.article_comments(article_id,user_id,parent_id,body) values($1,$2,$3,$4)",
          [id, ids.editor, parent.id, "Locked reply"],
        ),
        /Invalid reply/,
      );
    },
  );
  await t.test(
    "scheduled article stays private until the database publisher runs; analytics never accepts draft IDs",
    async () => {
      const scheduled = await article(db, "scheduled-article");
      await db.query(
        "update public.content_posts set status='approved' where id=$1",
        [scheduled],
      );
      await db.query(
        "update public.content_posts set status='scheduled',scheduled_at=now()+interval '1 hour' where id=$1",
        [scheduled],
      );
      await role(db, "anon");
      assert.equal(
        (
          await db.query("select * from public.content_posts where id=$1", [
            scheduled,
          ])
        ).rows.length,
        0,
      );
      await assert.rejects(
        db.query("select public.track_editorial('article_viewed',$1)", [
          scheduled,
        ]),
        /Published article/,
      );
      await assert.rejects(
        db.query("select private.publish_due_articles()"),
        /permission denied/,
      );
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub','',false)");
      await db.query(
        "update public.content_posts set scheduled_at=now()-interval '1 second',status='approved' where id=$1",
        [scheduled],
      );
      // Trusted preparation simulates an elapsed schedule without changing the publication clock.
      await db.exec(
        "alter table public.content_posts disable trigger article_guard",
      );
      await db.query(
        "update public.content_posts set status='scheduled' where id=$1",
        [scheduled],
      );
      await db.exec(
        "alter table public.content_posts enable trigger article_guard",
      );
      assert.equal(
        (await db.query("select private.publish_due_articles() as count"))
          .rows[0].count,
        1,
      );
      await role(db, "anon");
      assert.equal(
        (
          await db.query("select * from public.content_posts where id=$1", [
            scheduled,
          ])
        ).rows.length,
        1,
      );
      await db.query("select public.track_editorial('article_viewed',$1)", [
        id,
      ]);
      await db.exec("reset role");
      const event = (
        await db.query(
          "select * from public.analytics_events where article_id=$1",
          [id],
        )
      ).rows[0];
      assert.equal(event.metadata.slug, "test-one");
      assert.equal("email" in event.metadata, false);
    },
  );

  await t.test(
    "unconfirmed accounts cannot comment and revoked staff lose private notes/version access",
    async () => {
      await db.exec("reset role");
      await db.query(
        "update auth.users set email_confirmed_at=null where id=$1",
        [ids.alice],
      );
      await role(db, "alice");
      await assert.rejects(
        db.query(
          "insert into public.article_comments(article_id,user_id,body) values($1,$2,$3)",
          [id, ids.alice, "Unconfirmed account"],
        ),
        /Confirmed portal account/,
      );
      await db.exec("reset role");
      await db.query(
        "update auth.users set email_confirmed_at=now() where id=$1",
        [ids.alice],
      );
      await role(db, "author");
      const p = (
        await db.query(
          "insert into public.content_posts(title,slug,excerpt,body,featured_image,hero_image_alt,published_at) values('Revocation test','revoked-staff','text','<p>Real text</p>','/images/hero.webp','Illustration',now()) returning id",
        )
      ).rows[0].id;
      await db.query(
        "insert into public.editorial_notes(post_id,notes) values($1,$2)",
        [p, "Private author note"],
      );
      await role(db, "admin");
      await publish(db, p);
      await db.exec("reset role");
      await db.query("delete from public.site_staff where user_id=$1", [
        ids.author,
      ]);
      await role(db, "author");
      assert.equal(
        (await db.query("select * from public.content_posts where id=$1", [p]))
          .rows.length,
        1,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.editorial_notes where post_id=$1",
            [p],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.article_versions where post_id=$1",
            [p],
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        db.query(
          "insert into public.editorial_notes(post_id,notes) values($1,$2) on conflict(post_id) do update set notes=excluded.notes",
          [p, "Unauthorized change"],
        ),
        /row-level security/,
      );
    },
  );
  await t.test(
    "Batch 1 import is transactional, idempotent and preserves existing data",
    async () => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub','',false)");
      const manifest = JSON.parse(
        await readFile("content/editorial/batch1-manifest.json", "utf8"),
      );
      const before = (
        await db.query("select count(*)::int as n from public.content_posts")
      ).rows[0].n;
      await db.exec(buildImportSQL(manifest, PORTAL_PROJECT));
      assert.equal(
        (await db.query("select count(*)::int as n from public.content_posts"))
          .rows[0].n,
        before + 5,
      );
      const first = manifest.articles[0].post;
      assert.equal(
        (
          await db.query(
            "select body from public.content_posts where slug=$1",
            [first.slug],
          )
        ).rows[0].body,
        first.body,
      );
      await role(db, "anon");
      assert.equal(
        (
          await db.query("select * from public.content_posts where slug=$1", [
            first.slug,
          ])
        ).rows.length,
        0,
      );
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub','',false)");
      await db.exec(
        buildImportSQL(manifest, PORTAL_PROJECT, { stage: "published" }),
      );
      const publications = (
        await db.query(
          "select slug,published_at,version from public.content_posts where reviewer_name='LD HQ' order by slug",
        )
      ).rows;
      assert.equal(publications.length, 5);
      await db.exec(
        buildImportSQL(manifest, PORTAL_PROJECT, { stage: "published" }),
      );
      assert.deepEqual(
        (
          await db.query(
            "select slug,published_at,version from public.content_posts where reviewer_name='LD HQ' order by slug",
          )
        ).rows,
        publications,
      );
      await role(db, "anon");
      assert.equal(
        (
          await db.query(
            "select * from public.content_posts where reviewer_name='LD HQ'",
          )
        ).rows.length,
        5,
      );
    },
  );
});

test('Editorial files RLS and banner settings preserve private drafts and immutable resources',async(t)=>{
 const db=await init();t.after(()=>db.close());
 const id=await article(db,'media-config');
 const extras={banners:[{title:'Banner de teste',placement:'sidebar',url:'/contato',label:'Contato'}],links:[{label:'Pesquisa',url:'https://example.test'}]};
 await db.query('update public.content_posts set article_extras=$1 where id=$2',[JSON.stringify(extras),id]);
 const snapshot=(await db.query('select snapshot from public.article_versions where post_id=$1 order by version desc limit 1',[id])).rows[0].snapshot;
 assert.deepEqual(snapshot.article_extras,extras);
 await assert.rejects(db.query("update public.content_posts set article_extras='[]' where id=$1",[id]));
 await assert.rejects(db.query("update public.content_posts set article_extras=$1 where id=$2",[JSON.stringify({banners:Array(5).fill({title:'x'})}),id]));
 await assert.rejects(db.query("update public.content_posts set article_extras=$1 where id=$2",[JSON.stringify({links:{}}),id]));
 await role(db,'anon');assert.equal((await db.query('select article_extras from public.content_posts where id=$1',[id])).rows.length,0);
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('editorial-files',$1)",[ids.admin+'/00000000-0000-4000-8000-000000000123.pdf']));
 for(const name of ['alice','moderator']){await role(db,name);await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('editorial-files',$1)",[ids[name]+'/00000000-0000-4000-8000-000000000123.pdf']));}
 for(const name of ['author','editor','admin']){
   await role(db,name);const path=ids[name]+'/00000000-0000-4000-8000-000000000123.pdf';
   await db.query("insert into storage.objects(bucket_id,name) values('editorial-files',$1)",[path]);
   await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('editorial-files',$1)",[ids.alice+'/00000000-0000-4000-8000-000000000234.pdf']));
   await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('editorial-files',$1)",[ids[name]+'/../../malicious.html']));
   await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('editorial-files',$1)",[ids[name]+'/00000000-0000-4000-8000-000000000234.exe']));
   assert.equal((await db.query("update storage.objects set name='overwrite.pdf' where bucket_id='editorial-files' returning id")).rows.length,0);
   assert.equal((await db.query("delete from storage.objects where bucket_id='editorial-files' returning id")).rows.length,0);
 }
 await role(db,'anon');assert.equal((await db.query("select * from storage.objects where bucket_id='editorial-files'")).rows.length,3);
});
