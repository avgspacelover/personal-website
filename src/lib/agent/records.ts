import { getEntries } from "../queries";
import { docText, toDoc } from "../richtext";
import type { Rec } from "./ground";
// The agent only ever sees PUBLISHED records, in this reduced shape.
export async function allRecords(): Promise<Rec[]> {
  return (await getEntries()).flatMap((e) => e.id ? [{
    id: e.id, kind: e.kind, title: e.title, org: e.org ?? "", period: e.year, location: e.location ?? "", tech: e.tech, summary: e.summary,
    body: docText(toDoc(e.body)).replace(/\s+/g, " ").trim().slice(0, 6000), vocations: e.vocations, path: e.vocations[0] ? `/${e.vocations[0]}/${e.kind}/${e.slug}` : null,
  }] : []);
}
