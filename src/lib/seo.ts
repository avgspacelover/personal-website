import type { Metadata } from "next";
import type { Entry } from "./content";
import type { Settings } from "./queries";

export function rootMetadata(settings: Settings, siteUrl: string): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    alternates: { types: { "application/rss+xml": "/feed.xml" } },
    title: { default: settings.siteName, template: `%s / ${settings.siteName}` },
    description: settings.metaDescription,
    openGraph: { type: "website", siteName: settings.siteName, title: settings.siteName, description: settings.metaDescription },
    twitter: { card: "summary", title: settings.siteName, description: settings.metaDescription },
  };
}

export function aboutMetadata(settings: Settings, aboutText: string): Metadata {
  const description = (aboutText || settings.intro || settings.metaDescription).slice(0, 160);
  return {
    title: "About", description, alternates: { canonical: "/about" },
    openGraph: { type: "profile", siteName: settings.siteName, title: `About / ${settings.siteName}`, description, url: "/about" },
    twitter: { card: "summary", title: `About / ${settings.siteName}`, description },
  };
}

export const resumeMetadata: Metadata = {
  title: "Resume",
  description: "Professional experience, selected projects, skills, and education.",
  alternates: { canonical: "/resume" },
  openGraph: { type: "website", title: "Resume", description: "Professional experience, selected projects, skills, and education.", url: "/resume" },
  twitter: { card: "summary", title: "Resume", description: "Professional experience, selected projects, skills, and education." },
};

export function websiteJsonLd(settings: Settings, siteUrl: string) {
  return { "@context": "https://schema.org", "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: settings.siteName, description: settings.intro };
}

export function profilePageJsonLd(siteUrl: string, name: string | undefined, links: Settings["links"], email: string) {
  const personName = name?.trim();
  const sameAs = links.map((link) => link.url).filter((url) => /^https:\/\//i.test(url));
  const person = personName ? {
    "@type": "Person", "@id": `${siteUrl}/about#person`, name: personName, url: `${siteUrl}/about`,
    ...(sameAs.length ? { sameAs } : {}), ...(email ? { email: `mailto:${email}` } : {}),
  } : null;
  const page = {
    "@context": "https://schema.org", "@type": "ProfilePage", "@id": `${siteUrl}/about#profile`, url: `${siteUrl}/about`, name: "About",
    ...(person ? { mainEntity: { "@id": `${siteUrl}/about#person` } } : {}),
  };
  return person ? [page, person] : page;
}

export function creativeWorkJsonLd(entry: Entry, canonical: string) {
  return {
    "@context": "https://schema.org", "@type": "CreativeWork", name: entry.seoTitle || entry.title,
    description: entry.seoDescription || entry.summary, url: canonical, dateModified: entry.updated?.toISOString(), keywords: entry.tech.join(", "),
  };
}

export const serializeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
