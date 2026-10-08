import Link from "next/link";
export default function NotFound() {
  return (<><h1>Not found</h1><p className="lede">No record exists at this address. Start from <Link href="/">the index</Link>.</p></>);
}
