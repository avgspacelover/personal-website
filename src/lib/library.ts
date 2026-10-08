// Per-collection field labels. A null/absent field is not shown in the editor and left untouched on save.
type Cfg = { name: string; one: string; title: string; creator: string; notes: string; url?: string; year?: string; rating?: boolean; image?: string };
export const COLLECTIONS: Record<string, Cfg> = {
  essays: { name: "Essays", one: "essay", title: "TITLE", creator: "AUTHOR / PUBLICATION", url: "URL", year: "YEAR", rating: true, notes: "NOTES" },
  books: { name: "Books", one: "book", title: "TITLE", creator: "AUTHOR", year: "YEAR READ", rating: true, notes: "NOTES", image: "COVER" },
  movies: { name: "Movies", one: "movie", title: "TITLE", creator: "DIRECTOR", year: "YEAR", rating: true, notes: "NOTES", image: "POSTER" },
  community: { name: "Community", one: "community", title: "NAME", creator: "ROLE / CONNECTION", url: "URL", year: "DATES", notes: "DESCRIPTION" },
};
export const RECS = ["Essential", "Recommended", "Worth a look"];
