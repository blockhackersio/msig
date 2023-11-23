import { createSignal, useSignal } from "msig";
const [count, setValue] = createSignal(0);

export default function Counter() {
  const value = useSignal(count);
  const increment = () => {
    setValue((v = 0) => v + 1);
  };
  const decrement = () => {
    setValue((v = 0) => v - 1);
  };
  return (
    <div>
      <h1>{value}</h1>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
