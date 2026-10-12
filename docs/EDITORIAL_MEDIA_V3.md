# Editorial Media v3

Portal only: `legendadigital.com.br`, repository `legendadigitalmkt-dot/legenda-digital-portal`, Supabase `yltnjgngkomelfltdyky`. Growth OS repository, app and database are outside this release.

## Administration

Open `/admin/articles`, choose an article and **Editar / prévia**.

- **Capa e imagens → Selecionar capa do computador** sends PNG/JPEG/WebP up to 8 MiB. Alternate mobile/card versions have their own uploads. Add alt and review the preview.
- In the body, **Adicionar imagem** supports individual images and the block menu supports galleries with multiple uploads and one alt per image.
- **Adicionar arquivo** uploads up to 10 files per selection. Images remain limited to 8 MiB; PDF, TXT, CSV, DOCX, XLSX, PPTX, ZIP, MP3, M4A, WAV, MP4 and WebM allow up to 20 MiB each. Edit the displayed filenames/context and click **Inserir bloco**. Reader-controlled links open/download resources; no automatic playback, third-party iframe or arbitrary executable embedding.
- **Texto em destaque** accepts a title, paragraphs and information/idea/attention style. Text remains editable inside the article. Selecting an existing highlight reveals style buttons. Inserting blocks preserves existing selected file/image nodes.
- **Link** applies a URL to the selected text or inserts a named link when no text is selected. **Remover link** removes the selected link mark.
- **Banners e links manuais** configures up to four banners and ten links per article. Banners accept a local image, alt, title, description, button/link and new-tab option. Placement can be the sidebar (inline after the article on mobile) or after the article on all screens. A custom sidebar banner replaces the default Growth promo; the default can also be explicitly hidden.
- **Mídia** exposes the new `editorial-files` bucket, folder navigation and public URL copying. Private administrative files remain private.
- Save and preview desktop/mobile before review/approval/publication. Existing publication permissions and optimistic version checks remain in force.

## Security and storage

Uploads are **public editorial resources**, including uploads for drafts. This matches the existing blog image model and is stated beside every new upload control. Do not upload private documents. Public article drafts, notes and version history remain protected by existing RLS.

`editorial-files` is a public bucket with a 20 MiB limit and an explicit MIME allowlist. Authenticated author/editor/admin/super_admin staff can insert only into their own UUID folder, with UUID filenames and allowed extensions. Readers and moderators cannot upload. Client overwrite/delete is not allowed; uploads use `upsert:false`. Existing buckets and their settings are preserved.

Client validation checks extension, MIME, size and basic file signatures. This is format validation, **not antivirus scanning**. HTML, SVG uploads, executables, legacy Office formats and macro formats are excluded. Office/archive files are linked rather than executed/rendered inside the article. A failed multi-upload retains successful preceding files and reports the failure. Uploaded but unused resources are not deleted automatically.

`article_extras` is additive JSONB with shape/size/count checks. Public SSR and React share URL/type normalization; banners use escaped React text, no arbitrary HTML or CSS. Body sanitizer explicitly preserves allowed callout tones and safe attachment links. Configuration is included in existing version snapshots and is excluded from the card DTO.

Baseline security advisor notices: two notices for the intentionally public, bounded `track_editorial` SECURITY DEFINER analytics RPC, plus the existing disabled leaked-password protection setting. This release adds no SECURITY DEFINER function or Auth changes; compare advisor output after applying the migration. Dependency audit has the existing low-severity nested `tsx/esbuild` Windows development-server advisory; no high/critical advisory.

## Validation and release

Migration: `20261012153255_editorial_media_banners.sql`. Apply only to the portal project, after branch CI passes and before deploying the new public DTO. No updates of existing articles or Auth records are needed.

Local validation: 43 Node/PostgreSQL checks, 15 Playwright cases (including eight axe accessibility analyses), 10 deployment checks and 36 responsive samples passed; no horizontal overflow, broken images or page errors. Lab CLS was 0 and maximum LCP was 308 ms, without network throttling (not field Core Web Vitals). Production build; Node/PostgreSQL tests; Playwright cover/file upload with mocked storage including failure/retry, highlighted blocks, inline links, banners, manual links, save/reopen and media folders; anonymous SSR sanitization; RLS role/ownership/overwrite tests; desktop/mobile accessibility and responsive QA; dependency audit and deployment tests. Authenticated production upload is not simulated with a real user's credentials; storage policies/configuration are audited separately in the hosted database. No test article/banner or real lead is published.

Release health: `/api/health` must return `release: editorial-media-v3`. Public smoke checks include the article layout/asset bundle and `/admin/articles`. Before/after data fingerprints must preserve all 14 article IDs, bodies, statuses and timestamps, plus staff/contact/newsletter counts.

## Rollback

Revert the release merge through a PR, run CI and let Hostinger redeploy main. Check health/public articles/admin. Retain `article_extras`, the bucket, policies and uploaded files: dropping them would destroy new editorial configuration/resources and version references. The earlier application ignores the additive column. Do not delete uploaded resources or rewrite live articles as part of routine rollback. To temporarily disable new file uploads, remove only the new INSERT policy in a separate reviewed migration; existing published download URLs remain available.
