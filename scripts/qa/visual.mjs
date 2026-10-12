import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const stage = process.argv[2] || "after";
if (!["before", "after"].includes(stage)) throw Error("Choose before or after");
const manifest = JSON.parse(
  await readFile("content/editorial/batch1-manifest.json", "utf8"),
);
const posts = manifest.articles.map((a, i) => ({
  ...a.post,
  id: `00000000-0000-4000-8000-${String(100 + i).padStart(12, "0")}`,
  status: "published",
  version: 1,
  published_at: "2026-10-12T00:00:00Z",
}));
const output = `artifacts/ux-refresh/${stage}`;
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ["scripts/editorial/test-server.mjs"], {
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((resolve, reject) => {
  server.stdout.once("data", resolve);
  server.once("exit", () => reject(Error("Fixture server exited")));
});
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PORTAL_TEST_CHROMIUM_PATH
    ? { executablePath: process.env.PORTAL_TEST_CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const pages = {
  home: "/",
  contents: "/conteudos",
  article: "/conteudos/o-novo-funil-de-vendas-na-era-da-ia",
  growth: "/produtos/growth-os",
};
const allViewports =
  stage === "before"
    ? [
        [1440, 900],
        [390, 844],
      ]
    : [
        [1366, 768],
        [1440, 900],
        [1920, 1080],
        [360, 800],
        [375, 812],
        [390, 844],
        [430, 932],
        [768, 1024],
        [820, 1180],
      ];
const viewports = process.env.QA_WIDTH
  ? allViewports.filter((v) => v[0] === Number(process.env.QA_WIDTH))
  : allViewports;
const results = [];
try {
  for (const [width, height] of viewports)
    for (const [name, path] of Object.entries(pages)) {
      const context = await browser.newContext({ viewport: { width, height } });
      await context.addInitScript(() => {
        localStorage.setItem("ld-analytics-consent", "no");
        window.__qa = { cls: 0, lcp: 0 };
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            if (!e.hadRecentInput) window.__qa.cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) window.__qa.lcp = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route(
        "https://yltnjgngkomelfltdyky.supabase.co/**",
        (route) => {
          const u = new URL(route.request().url());
          let data = [];
          if (u.pathname.endsWith("/content_posts")) {
            const slug = u.searchParams.get("slug")?.slice(3);
            data = slug ? posts.find((p) => p.slug === slug) : posts;
          }
          if (u.pathname.endsWith("/site_settings")) data = null;
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(data),
            headers: { "access-control-allow-origin": "*" },
          });
        },
      );
      const response = await page.goto("http://127.0.0.1:4173" + path, {
        waitUntil: "networkidle",
      });
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
      await page.waitForTimeout(250);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(250);
      const metrics = await page.evaluate(() => ({
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        ...window.__qa,
        bodyFont: getComputedStyle(document.body).fontSize,
        articleWidth: document
          .querySelector(".article-body")
          ?.getBoundingClientRect().width,
        commentsWidth: document
          .querySelector(".article-comments")
          ?.getBoundingClientRect().width,
        cardFits: [...document.querySelectorAll(".post-image img")].map(
          (i) => getComputedStyle(i).objectFit,
        ),
        failedImages: [...document.images]
          .filter((i) => i.complete && !i.naturalWidth)
          .map((i) => i.getAttribute("src")),
      }));
      results.push({
        name,
        width,
        height,
        status: response.status(),
        errors,
        ...metrics,
      });
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: `${output}/${name}-${width}.jpg`,
          type: "jpeg",
          quality: 75,
          fullPage: false,
        });
      if (
        stage === "after" &&
        (metrics.scrollWidth > width ||
          errors.length ||
          metrics.failedImages.length ||
          metrics.cls > 0.1 ||
          metrics.lcp > 2500)
      )
        throw Error(JSON.stringify(results.at(-1)));
      if (stage === 'after' && width === 1440 && (name === 'article' || name === 'home')) {
        if(name === 'article')await page.locator('.article-layout').scrollIntoViewIfNeeded();
        else await page.getByRole('heading',{name:'Conteúdos em destaque'}).scrollIntoViewIfNeeded();
        await page.screenshot({path:`${output}/${name === 'article'?'article-reading':'home-cards'}-1440.jpg`,type:'jpeg',quality:75});
      }
      console.log(stage, name, width, JSON.stringify(metrics));
      await context.close();
    }
  await writeFile(
    `${output}/metrics${process.env.QA_WIDTH?"-"+process.env.QA_WIDTH:""}.json`,
    JSON.stringify(
      {
        fixture:
          "Local identical approved Batch 1 data; no production writes. LCP/CLS lab samples, not field Core Web Vitals.",
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
