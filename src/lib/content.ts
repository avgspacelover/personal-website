// Seed content. Replace with DB queries once the CMS lands (see db/schema.sql).
export type Vocation = { slug: string; name: string; intro: string; updated?: Date };
export type Entry = { id?: string; slug: string; kind: "projects" | "experience"; title: string; org?: string; summary: string; year: string; status: string; tech: string[]; vocations: string[]; location?: string; seoTitle?: string; seoDescription?: string; seoImage?: string; canonical?: string; body: unknown; updated?: Date };
export type LibraryItem = { title: string; by: string; note: string; rating: string; year?: string; url?: string; tags?: string[]; updated?: Date; image?: { url: string; alt: string } };

export const vocations: Vocation[] = [
  { slug: "software", name: "Software", intro: "Production systems, tooling, and the interfaces between them." },
  { slug: "machine-learning", name: "Machine Learning", intro: "Models, evaluation, and getting them to behave outside a notebook." },
  { slug: "design", name: "Design", intro: "Typography, interaction, and information structure." },
  { slug: "marketing", name: "Marketing", intro: "Positioning and growth work grounded in measurement." },
  { slug: "distributed-systems", name: "Distributed Systems", intro: "Consistency, failure, and the cost of coordination." },
  { slug: "compilers", name: "Compilers", intro: "Parsing, IR design, and code generation." },
];

export const entries: Entry[] = [
  { slug: "toy-raft", kind: "projects", title: "Toy Raft", summary: "A readable Raft implementation with a deterministic network simulator.", year: "2026", status: "ACTIVE", tech: ["Rust", "Simulation"], vocations: ["distributed-systems", "software"], body: ["Placeholder write-up. Replace with long-form content from the CMS.", "Deterministic replay makes partition bugs reproducible."] },
  { slug: "mini-ir", kind: "projects", title: "Mini IR", summary: "An SSA-based intermediate representation with a small optimizer.", year: "2025", status: "SHIPPED", tech: ["OCaml"], vocations: ["compilers"], body: ["Placeholder write-up."] },
  { slug: "eval-harness", kind: "projects", title: "Eval Harness", summary: "Regression testing for model behavior across versions.", year: "2025", status: "ACTIVE", tech: ["Python"], vocations: ["machine-learning", "software"], body: ["Placeholder write-up."] },
  { slug: "example-co", kind: "experience", title: "Software Engineer", org: "Example Co", summary: "Placeholder role description.", year: "2023–2025", status: "PAST", tech: ["TypeScript", "Postgres"], vocations: ["software", "distributed-systems"], body: ["Placeholder role details."] },
];

export const library: Record<string, LibraryItem[]> = {
  essays: [{ title: "Placeholder essay", by: "Author", note: "Why it stuck.", rating: "Essential", url: "https://example.com" }],
  books: [{ title: "Placeholder book", by: "Author", note: "Short note.", rating: "Recommended" }],
  movies: [{ title: "Placeholder film", by: "Director", year: "1999", note: "Short note.", rating: "Recommended" }],
  community: [{ title: "Placeholder community", by: "Member since 2024", note: "What it is.", rating: "Active", url: "https://example.com" }],
};

export const collections = [
  { slug: "essays", name: "Essays" }, { slug: "books", name: "Books" },
  { slug: "movies", name: "Movies" }, { slug: "community", name: "Community" },
];
export const inVocation = (slug: string) => entries.filter((e) => e.vocations.includes(slug));
export const vocName = (slug: string) => vocations.find((v) => v.slug === slug)?.name ?? slug;
// One canonical URL per record: its first listed vocation.
export const entryHref = (e: Entry) => `/${e.vocations[0]}/${e.kind}/${e.slug}`;

export const skills = [
  { category: "Languages", items: ["TypeScript", "Rust", "OCaml", "Python"] },
  { category: "Systems", items: ["Postgres", "Raft", "Simulation testing"] },
];
export const education = [{ institution: "Placeholder University", program: "B.S. Computer Science", dates: "2019–2023" }];
export const site = { url: process.env.SITE_URL ?? "http://localhost:3000", name: "Personal Archive" };
