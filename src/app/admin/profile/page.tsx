import { asc } from "drizzle-orm";
import { getDb, education, skill } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { saveProfile } from "./actions";
export const metadata = { title: "Profile" };
export default async function Profile({ searchParams }: { searchParams: { saved?: string } }) {
  await requireAdmin();
  const db = await getDb();
  const [ss, es] = await Promise.all([db.select().from(skill).orderBy(asc(skill.position)), db.select().from(education).orderBy(asc(education.position))]);
  return (<>
    <h1>Profile</h1>
    <p className="lede">Skills and education used by resumes. Resume versions pick from these; removing a line also removes it from every resume.</p>
    <form action={saveProfile} className="login edit">
      {searchParams.saved && <p role="status" className="err">Saved.</p>}
      <label className="mono" htmlFor="skills">TECHNICAL SKILLS (ONE PER LINE: CATEGORY: ITEM, ITEM)</label>
      <textarea id="skills" name="skills" rows={6} defaultValue={ss.map((s) => `${s.category}: ${s.items.join(", ")}`).join("\n")} />
      <label className="mono" htmlFor="education">EDUCATION (ONE PER LINE: INSTITUTION | DEGREE | DATES | LOCATION)</label>
      <textarea id="education" name="education" rows={4} defaultValue={es.map((d) => [d.institution, d.program, d.period, d.location].join(" | ")).join("\n")} />
      <button className="tbtn big">SAVE</button>
    </form>
  </>);
}
