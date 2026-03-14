import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Landing from "./Landing";

describe("Landing page", () => {
  it("should render correctly", () => {
    render(<Landing />);
    const elements = screen.getAllByText(/LevelUp Chat/i);
    expect(elements.length).toBeGreaterThan(0);
  });
});
