import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { LowStockBadge } from "@/components/inventory/low-stock-badge";

describe("LowStockBadge", () => {
  it("renders the badge when quantity is at or below min", () => {
    render(<LowStockBadge quantity={5} minQuantity={10} />);
    expect(screen.getByTestId("low-stock-badge")).toBeInTheDocument();
    expect(screen.getByText("재고 부족")).toBeInTheDocument();
  });

  it("renders the badge when quantity equals min", () => {
    render(<LowStockBadge quantity={10} minQuantity={10} />);
    expect(screen.getByTestId("low-stock-badge")).toBeInTheDocument();
  });

  it("does not render when quantity is above min", () => {
    render(<LowStockBadge quantity={15} minQuantity={10} />);
    expect(screen.queryByTestId("low-stock-badge")).not.toBeInTheDocument();
  });

  it("does not render when minQuantity is zero (not configured)", () => {
    render(<LowStockBadge quantity={0} minQuantity={0} />);
    expect(screen.queryByTestId("low-stock-badge")).not.toBeInTheDocument();
  });

  it("does not render when minQuantity is negative", () => {
    render(<LowStockBadge quantity={5} minQuantity={-1} />);
    expect(screen.queryByTestId("low-stock-badge")).not.toBeInTheDocument();
  });
});
