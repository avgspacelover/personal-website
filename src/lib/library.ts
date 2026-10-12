// Per-collection field labels. A null/absent field is not shown in the editor and left untouched on save.
type Cfg = { name: string; one: string; title: string; creator: string; notes: string; url?: string; year?: string; finished?: string; rating?: boolean; image?: string };
// `finished` (a four-digit year) feeds the yearly counts on the Milestones page.
export const COLLECTIONS: Record<string, Cfg> = {
  essays: { name: "Essays", one: "essay", title: "TITLE", creator: "AUTHOR / PUBLICATION", url: "URL", year: "YEAR PUBLISHED", finished: "YEAR READ", rating: true, notes: "NOTES" },
  books: { name: "Books", one: "book", title: "TITLE", creator: "AUTHOR", year: "YEAR PUBLISHED", finished: "YEAR READ", rating: true, notes: "NOTES", image: "COVER" },
  movies: { name: "Movies", one: "movie", title: "TITLE", creator: "DIRECTOR", year: "YEAR RELEASED", finished: "YEAR WATCHED", rating: true, notes: "NOTES", image: "POSTER" },
  series: { name: "Series", one: "series", title: "TITLE", creator: "CREATOR", year: "YEAR STARTED", finished: "YEAR WATCHED", rating: true, notes: "NOTES", image: "POSTER" },
  community: { name: "Community", one: "community", title: "NAME", creator: "ROLE / CONNECTION", url: "URL", year: "DATES", notes: "DESCRIPTION" },
};
export const RECS = ["Essential", "Recommended", "Worth a look"];
