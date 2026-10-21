import { fireEvent, render, screen, within } from "@testing-library/react";
import { WellnessPlan } from "@/components/c2/wellness-plan";
import { WellnessProgress } from "@/components/c2/wellness-progress";
import { AppointmentSummary } from "@/components/c2/appointment-summary";
import { PROGRESS_KEY } from "@/lib/c2/progress";
import type { Assessment } from "@/lib/c2/assessment";

const assessment: Assessment = {
  phq9: [2, 1, ...Array(7).fill(0)],
  gad7: [1, ...Array(6).fill(0)],
  context: { study: "Starting tasks is difficult" },
  supportTopics: ["study"],
  concernAnalysis: {
    confirmed: ["study"],
    prediction: null,
    source: "student-selected",
  },
  completedAt: "2026-10-20T12:00:00.000Z",
  version: "test",
  questionPath: [
    {
      id: "study",
      text: "What feels difficult about study?",
      reason: "Your topic",
    },
  ],
};
beforeEach(() => localStorage.clear());
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name, exact: true }));
it("runs a guided activity, retains notes when stepping back, and emits only completion metadata", () => {
  const complete = jest.fn();
  render(
    <WellnessPlan
      assessment={assessment}
      completions={[]}
      onComplete={complete}
      onSupport={jest.fn()}
      onCommunity={jest.fn()}
      onProgress={jest.fn()}
      onSummary={jest.fn()}
    />,
  );
  fireEvent.click(
    within(screen.getByRole("article", { name: "Plan action 1" })).getByRole(
      "button",
      { name: "Explore activity" },
    ),
  );
  click("Start activity");
  fireEvent.change(screen.getByRole("textbox", { name: /What task/ }), {
    target: { value: "Private project draft" },
  });
  click("Next step");
  click("Back a step");
  expect(screen.getByRole("textbox", { name: /What task/ })).toHaveValue(
    "Private project draft",
  );
  click("Next step");
  click("Next step");
  click("Next step");
  click("Finish activity");
  expect(complete).toHaveBeenCalledTimes(1);
  expect(complete.mock.calls[0][0]).toMatchObject({
    activityId: "small-start",
    before: null,
    after: null,
  });
  expect(JSON.stringify(complete.mock.calls)).not.toContain(
    "Private project draft",
  );
  expect(localStorage.length).toBe(0);
});
it("shows the separate human-support route when activity notes contain concerning text", () => {
  render(
    <WellnessPlan
      assessment={null}
      completions={[]}
      onComplete={jest.fn()}
      onSupport={jest.fn()}
      onCommunity={jest.fn()}
      onProgress={jest.fn()}
      onSummary={jest.fn()}
    />,
  );
  fireEvent.click(
    within(screen.getByRole("article", { name: "Plan action 1" })).getByRole(
      "button",
      { name: "Explore activity" },
    ),
  );
  click("Start activity");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "I want to harm myself" },
  });
  expect(
    screen.getByRole("region", { name: "Immediate support" }),
  ).toBeInTheDocument();
});
it("does not touch device storage before consent, persists selected summaries and supports deletion", () => {
  const read = jest.spyOn(Storage.prototype, "getItem"),
    write = jest.spyOn(Storage.prototype, "setItem");
  const view = render(
    <WellnessProgress assessment={assessment} completions={[]} />,
  );
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Open my device history" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  click("Open my device history");
  click("Save current screening summary");
  expect(
    JSON.parse(localStorage.getItem(PROGRESS_KEY)!).entries[0],
  ).toMatchObject({ kind: "screening", phq9: 3, gad7: 1 });
  expect(localStorage.getItem(PROGRESS_KEY)).not.toContain("Starting tasks");
  view.unmount();
  render(<WellnessProgress assessment={null} completions={[]} />);
  expect(screen.queryByText(/Screening · PHQ/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox"));
  click("Open my device history");
  expect(screen.getByText(/Screening · PHQ-9 3\/27/)).toBeInTheDocument();
  localStorage.setItem("other-app", "preserve");
  click("Delete all saved wellness history");
  expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
  expect(localStorage.getItem("other-app")).toBe("preserve");
  read.mockRestore();
  write.mockRestore();
});
it("handles blocked storage without claiming a save succeeded", () => {
  render(<WellnessProgress assessment={null} completions={[]} />);
  fireEvent.click(screen.getByRole("checkbox"));
  click("Open my device history");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "4" } });
  const write = jest
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("blocked");
    });
  click("Save this mood rating");
  expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  expect(
    screen.queryByText(
      "Saved on this browser. Nothing was sent to your account or staff.",
    ),
  ).not.toBeInTheDocument();
  write.mockRestore();
});
it("excludes every assessment field from appointment notes until selected and allows removal", () => {
  render(<AppointmentSummary assessment={assessment} onSupport={jest.fn()} />);
  const preview = screen.getByLabelText("Appointment notes preview");
  expect(preview).not.toHaveTextContent("PHQ-9:");
  expect(preview).not.toHaveTextContent("Starting tasks");
  expect(
    screen.getByRole("button", { name: "Download my appointment notes" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("What would you like help with?"), {
    target: { value: "Ask about managing deadlines" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: /Screening date/ }));
  expect(preview).toHaveTextContent("PHQ-9: 3/27");
  fireEvent.click(screen.getByRole("checkbox", { name: /Screening date/ }));
  expect(preview).not.toHaveTextContent("PHQ-9:");
  expect(preview).toHaveTextContent("Ask about managing deadlines");
  expect(localStorage.length).toBe(0);
});

it("downloads exactly the student-approved preview without making a network request", async () => {
  const create = jest.fn().mockReturnValue("blob:appointment-notes");
  const revoke = jest.fn();
  const originalCreate = URL.createObjectURL,
    originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = create;
  URL.revokeObjectURL = revoke;
  const anchor = jest
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => undefined);
  jest.useFakeTimers();
  try {
    render(
      <AppointmentSummary assessment={assessment} onSupport={jest.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("What would you like help with?"), {
      target: { value: "Discuss my workload" },
    });
    click("Download my appointment notes");
    const blob = create.mock.calls[0][0] as Blob;
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(text).toContain("Discuss my workload");
    expect(text).not.toContain("PHQ-9: 3/27");
    expect(text).not.toContain("Starting tasks is difficult");
    expect(text).toBe(
      screen.getByLabelText("Appointment notes preview").textContent,
    );
    expect(anchor).toHaveBeenCalledTimes(1);
    jest.runAllTimers();
    expect(revoke).toHaveBeenCalledWith("blob:appointment-notes");
  } finally {
    jest.useRealTimers();
    anchor.mockRestore();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});
