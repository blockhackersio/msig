import { createSignal, useSignal } from "msig";
import Link from "next/link";
const [value, setValue] = createSignal("");

export default function Counter() {
  const sigVal = useSignal(value);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <Link href="/">Back</Link>
      <input
        value={sigVal}
        onChange={(e: { target: { value: string } }) => {
          setValue(e.target.value);
        }}
      />
      <input
        value={sigVal}
        onChange={(e: { target: { value: string } }) => {
          setValue(e.target.value);
        }}
      />
    </div>
  );
}
