# Article layout v4

Portal presentation change only. No database, Storage, Auth or article-content mutation. Growth OS is outside this release.

Desktop (1280 px and wider): equal left/right rails flank a 720 px reading column. The table of contents, tags, newsletter and manual links remain on the left. Only sidebar banners and the default Growth OS promotion move to a separate sticky rail on the right. Equal rails also preserve the article centerline when the promotion is hidden. Article title, introduction and cover align to the reading column. The banner follows the main column in DOM reading order.

Below 1280 px, the reading column remains centered; the TOC is collapsible above it and promotional banners appear after the body. Existing banners configured for after the body retain that placement. The CMS mobile preview uses the same type scale and hides the right rail.

Type scale: body 18 px / 1.7 on desktop, 16 px / 1.7 below 768 px; H1 44/32 px, H2 30/26 px, H3 24/22 px. Paragraphs use 20 px vertical spacing; headings have explicit spacing. The site's other base text scale remains unchanged.

Validation: production build and Node tests; Playwright checks TOC left, banner right, reading column centered, mobile banner visible and font sizes; responsive QA includes 1180, 1280, 1366, 1440, 1920, 360, 375, 390, 430, 768 and 820 px. It checks centerline, banner placement, type scale, horizontal overflow, image failures and layout stability. Local build, 43 Node/PostgreSQL tests and 15 Playwright cases passed, including eight axe analyses and existing CMS upload/save/reopen flows. All 11 final article samples have center delta 0, no overflow/image failures and CLS 0. Non-article QA is unchanged; the stored combined metrics document their source runs. CI runs the entire 44-sample suite on the final commit.

Release: `article-layout-v4` in `/api/health`. Deploy via the portal GitHub/main → Hostinger integration after CI. Confirm public article HTML and CSS, health and admin availability. Rollback: revert this PR, run CI and redeploy. No data or migration rollback is required.
