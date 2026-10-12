# Home editorial cards v5

Presentation-only fix for the homepage's featured and latest editorial sections. The attached Tools Platform production order is a separate, phased engineering program; no tools engine, consent, newsletter, community or database milestone is claimed by this release.

Featured section: one horizontal lead card with a bounded 240 px cover area, then four compact thumbnail cards in a two-column grid. Latest section: three evenly sized cards with smaller headings, bounded landscape covers and two-line excerpts. Byline, reading time and date share a compact footer. Section padding is reduced from 112 to 64 px on desktop and from 72 to 44 px on mobile. Mobile uses a vertical lead and a single column of compact cards.

Editorial covers retain `object-fit:contain`; no source images, text, publication data or article layout are changed. Landscape image variants are reused through an optional `wideImage` card prop; defaults elsewhere are preserved. Full headlines and descriptions remain in the DOM and linked articles, even when the card text is visually clamped.

Validation: production build, Node/PostgreSQL suite, Playwright homepage geometry/navigation test plus CMS/article/accessibility regressions. QA validates all eleven viewport sizes, maximum desktop card heights, consistent latest-card heights, horizontal overflow, images and lab layout stability. CI executes the full forty-four page/viewport suite. Local results: 43 Node/PostgreSQL checks and 16 Playwright cases passed, including eight axe analyses. Eleven home viewport samples passed, CLS 0 and maximum lab LCP 248 ms without throttling. At 1440 px the lead card is 242 px high, secondary cards about 152 px and latest cards about 478 px. No authenticated production writes are needed.

Deployment: GitHub/main → Hostinger. Release health is `home-cards-v5`. Confirm home covers, compact card heights and links in desktop/mobile production browsers. Rollback: revert the PR, run CI and redeploy. No database or data rollback is required.
