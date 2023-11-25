import Link from "next/link";
export default function Counter() {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Link href="/counter">Counter</Link>
      <Link href="/input">Input</Link>
    </div>
  );
}
