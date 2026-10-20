import { fireEvent, render, screen, within } from "@testing-library/react";
import { MentorMatch } from "@/components/c4/mentor-match";
import { demoMentors } from "@/lib/c4/matching";

describe("C4 MentorMatch", () => {
  it("shows three explained matches without any network call", () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    render(<MentorMatch />);
    const list = screen.getByTestId("c4-matches");
    expect(within(list).getAllByRole("listitem").filter((li) => li.parentElement === list)).toHaveLength(3);
    expect(within(list).getAllByText(/fit$/)).toHaveLength(3);
    expect(screen.getAllByText(/mentee places free/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/SYNTHETIC DATA/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never lists a full mentor", () => {
    render(<MentorMatch />);
    const full = demoMentors.filter((m) => m.load >= m.capacity);
    for (const m of full) expect(screen.queryByText(new RegExp(`^\\d\\. ${m.name}$`))).toBeNull();
  });

  it("asks for input when no skill is selected", () => {
    render(<MentorMatch />);
    fireEvent.click(screen.getByRole("button", { name: "Web back-end and APIs" }));
    fireEvent.click(screen.getByRole("button", { name: "Interview preparation" }));
    expect(screen.getByText(/Pick at least one skill/)).toBeInTheDocument();
  });

  it("limits the number of skills to three", () => {
    render(<MentorMatch />);
    fireEvent.click(screen.getByRole("button", { name: "Databases" }));
    fireEvent.click(screen.getByRole("button", { name: "Cybersecurity" }));
    expect(screen.getByRole("button", { name: "Cybersecurity" })).toHaveAttribute("aria-pressed", "false");
  });
});
