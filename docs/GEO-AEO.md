# GEO and AEO guidelines

Generative Engine Optimization (GEO) and Answer Engine Optimization (AEO) describe making public pages easier for search and answer systems to discover, understand, and cite. There is no markup or checklist that guarantees inclusion. Treat these practices as a way to improve clarity and crawlability for people and machines.

## What the project provides

- Public pages render their content as HTML, with metadata, canonical URLs, and a sitemap.
- `robots.txt` allows public routes and excludes admin, API, search, and preview routes. The wildcard rule currently allows public crawlers, including AI search crawlers, unless the hosting provider, firewall, or bot protection blocks them.
- The site emits `WebSite` JSON-LD globally, `CreativeWork` JSON-LD for project and experience pages, and `ProfilePage` plus `Person` JSON-LD on About when a published public resume provides the person's name.
- Open Graph and Twitter defaults come from site settings. About and Resume pages have their own descriptions and canonical URLs. Record pages keep their per-record metadata and social images.
- Run `npm run seo:check` after changing metadata, structured data, crawler rules, or sitemap logic. It uses a temporary PGlite database and removes its fixture after the check.

## Owner checklist

1. Publish only details you are comfortable making public and potentially reusable in search or AI answers.
2. Keep the About page accurate. When you publish a resume, use the real name and headline you want associated with the site; the public profile markup uses those values. Add only public profile links under Site settings; HTTPS links are included as `sameAs` links.
3. For important projects, make the page's visible summary and headings specific: explain the problem, your role, the approach, and verifiable outcomes. Do not add claims solely to target search engines.
4. Keep social titles, descriptions, image alt text, and dates accurate and consistent with what visitors see on the page.
5. After deploying a public site, verify it in Google Search Console and Bing Webmaster Tools, submit the sitemap, and inspect crawler errors. If a CDN, firewall, or bot-protection rule is enabled, check that it does not block crawlers you intend to allow.
6. Decide separately whether to allow AI search crawlers and AI training crawlers. The project's wildcard robots rule allows both by default. OpenAI documents separate controls for `OAI-SearchBot` and `GPTBot`; apply provider-specific rules only after deciding your preference. Robots rules are requests to crawlers, not access control for private data.

## Avoid unnecessary work

- Google says its normal SEO guidance applies to AI Overviews and AI Mode; no special AI schema or `llms.txt` file is required for Google Search.
- Structured data must describe visible page content. It helps systems interpret a page but does not guarantee rankings, rich results, or AI citations.
- Do not add FAQ markup just to chase answer boxes. Only add structured data that accurately represents a real page and is supported by the target platform.

## References

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [OpenAI: overview of crawlers](https://developers.openai.com/api/docs/bots)
- [Bing: AI Performance in Webmaster Tools](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/)
