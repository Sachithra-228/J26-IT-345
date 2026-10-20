import { fireEvent, render, screen } from "@testing-library/react";
import { ScreeningResultCard } from "@/components/c2/screening-result-card";
import type { Answer } from "@/lib/c2/assessment";

function answers(total: number, length: number): Answer[] {
  return Array.from(
    { length },
    (_, i) => Math.max(0, Math.min(3, total - i * 3)) as Answer,
  );
}

it.each([
  [0, "Minimal"],
  [4, "Minimal"],
  [5, "Mild"],
  [9, "Mild"],
  [10, "Moderate"],
  [14, "Moderate"],
  [15, "Moderately severe"],
  [19, "Moderately severe"],
  [20, "Severe"],
  [27, "Severe"],
] as const)(
  "shows PHQ-9 %i as %s with an accessible point scale",
  (total, band) => {
    render(
      <ScreeningResultCard
        kind="phq9"
        answers={answers(total, 9)}
        onReview={jest.fn()}
      />,
    );
    const meter = screen.getByRole("meter", { name: "PHQ-9 symptom score" });
    expect(meter).toHaveAttribute("aria-valuenow", String(total));
    expect(meter).toHaveAttribute("aria-valuemax", "27");
    expect(meter).toHaveAttribute(
      "aria-valuetext",
      `${total} out of 27; ${band} symptom range`,
    );
    expect(screen.getByText(`${band} symptom range`)).toBeInTheDocument();
    expect(
      screen.getByText(/not the probability of an illness/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  },
);

it.each([
  [0, "Minimal"],
  [4, "Minimal"],
  [5, "Mild"],
  [9, "Mild"],
  [10, "Moderate"],
  [14, "Moderate"],
  [15, "Severe"],
  [21, "Severe"],
] as const)("shows GAD-7 %i as %s", (total, band) => {
  render(
    <ScreeningResultCard
      kind="gad7"
      answers={answers(total, 7)}
      onReview={jest.fn()}
    />,
  );
  expect(screen.getByRole("meter")).toHaveAttribute(
    "aria-valuetext",
    `${total} out of 21; ${band} symptom range`,
  );
  expect(screen.getByText(`${band} symptom range`)).toBeInTheDocument();
});

it.each(["phq9", "gad7"] as const)(
  "does not show a level or meter for incomplete %s",
  (kind) => {
    const vector = answers(0, kind === "phq9" ? 9 : 7);
    vector[0] = null;
    const review = jest.fn();
    render(
      <ScreeningResultCard kind={kind} answers={vector} onReview={review} />,
    );
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
    expect(screen.getByText("Incomplete questionnaire")).toBeInTheDocument();
    expect(screen.queryByText(/Minimal symptom range/)).not.toBeInTheDocument();
    expect(screen.getByText(/Missing: 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Review .* answers/ }));
    expect(review).toHaveBeenCalledTimes(1);
  },
);

it.each([
  [0, "Choose a manageable next step"],
  [5, "Choose a manageable next step"],
  [10, "Consider a professional assessment"],
  [14, "Consider a professional assessment"],
  [15, "Professional support is recommended"],
  [21, "Professional support is recommended"],
] as const)(
  "changes suggested anxiety support at score %i",
  (total, heading) => {
    render(
      <ScreeningResultCard
        kind="gad7"
        answers={answers(total, 7)}
        onReview={jest.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText(/Write down one worry/)).toBeInTheDocument();
    if (total < 10)
      expect(
        screen.getByText(/A lower score does not rule out a concern/),
      ).toBeInTheDocument();
  },
);

it("changes meaning, resources and activity ideas between symptom dimensions", () => {
  const { rerender } = render(
    <ScreeningResultCard
      kind="phq9"
      answers={answers(13, 9)}
      onReview={jest.fn()}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Depressive symptoms" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/one small, meaningful activity/),
  ).toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveAttribute(
    "href",
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC1495268/",
  );
  rerender(
    <ScreeningResultCard
      kind="gad7"
      answers={answers(13, 7)}
      onReview={jest.fn()}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Anxiety symptoms" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Write down one worry/)).toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveAttribute(
    "href",
    "https://doi.org/10.1001/archinte.166.10.1092",
  );
});
