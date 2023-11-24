import { it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { createSignal } from "@msig/core";
import { useSignal } from ".";
const user = userEvent.setup();
it("renders the state", async () => {
  const [value] = createSignal(0);
  function Comp() {
    const sigVal = useSignal(value);
    return <p>Signal: {sigVal}</p>;
  }
  const { getByText } = render(<Comp />);
  expect(getByText("Signal: 0")).toBeInTheDocument();
});

it("updates when the signal changes", async () => {
  const [value, setValue] = createSignal(0);
  function Comp() {
    const sigVal = useSignal(value);
    return (
      <div>
        <p>Signal: {sigVal}</p>
        <button onClick={() => setValue((v = 0) => v + 1)}>plus</button>
        <button onClick={() => setValue((v = 0) => v - 1)}>sub</button>
      </div>
    );
  }
  const { getByText } = render(<Comp />);
  expect(getByText("Signal: 0")).toBeInTheDocument();

  await user.click(getByText("plus"));
  await waitFor(() => expect(getByText("Signal: 1")).toBeInTheDocument());

  await user.click(getByText("plus"));
  await waitFor(() => expect(getByText("Signal: 2")).toBeInTheDocument());

  await user.click(getByText("sub"));
  await waitFor(() => expect(getByText("Signal: 1")).toBeInTheDocument());
});

it("should render many signals correctly", async () => {
  const [value, setValue] = createSignal(0);
  function Comp() {
    const one = useSignal(value);
    const two = useSignal(value);
    const three = useSignal(value);
    const four = useSignal(value);
    return (
      <div>
        <p>
          Signal: {one}
          {two}
          {three}
          {four}
        </p>
        <button onClick={() => setValue((v = 0) => v + 1)}>plus</button>
        <button onClick={() => setValue((v = 0) => v - 1)}>sub</button>
      </div>
    );
  }
  const { getByText } = render(<Comp />);
  expect(getByText("Signal: 0000")).toBeInTheDocument();

  await user.click(getByText("plus"));
  await waitFor(() => expect(getByText("Signal: 1111")).toBeInTheDocument());

  await user.click(getByText("plus"));
  await waitFor(() => expect(getByText("Signal: 2222")).toBeInTheDocument());

  await user.click(getByText("sub"));
  await waitFor(() => expect(getByText("Signal: 1111")).toBeInTheDocument());
});
