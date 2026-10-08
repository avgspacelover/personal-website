export const metadata = { title: "About" };
export default function About() {
  return (<>
    <h1>About</h1>
    <p className="lede">Placeholder: a short statement of who this archive belongs to.</p>
    <section className="blk"><h2>Elsewhere</h2><ul className="rows">
      <li><span className="mono">EMAIL</span><a href="mailto:you@example.com">you@example.com</a><span /></li>
      <li><span className="mono">CODE</span><a href="https://github.com">GitHub</a><span /></li>
    </ul></section>
  </>);
}
