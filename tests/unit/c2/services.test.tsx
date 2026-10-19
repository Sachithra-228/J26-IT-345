import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CounselorBooking } from "@/components/wellness/counselor-booking";
import { PeerSupport } from "@/components/wellness/peer-support";
const originalFetch = global.fetch;
const request = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = request;
});
afterEach(() => {
  global.fetch = originalFetch;
});
const profile = {
  _id: "p1",
  name: "Directory Person",
  specialization: "Anxiety support",
  availability: "Contact for a slot",
  mode: "hybrid",
  gender: "female",
  profession: "psychologist",
  languages: ["en"],
  supportAreas: ["worry"],
};
const response = (data: unknown, ok = true, status = 200) =>
  Promise.resolve({ ok, status, json: async () => data });
it("shows actual directory match reasons and enforces explicit preferences", async () => {
  request.mockImplementation((url: string) =>
    response(url === "/api/wellness-counselors" ? [profile] : []),
  );
  render(<CounselorBooking topics={["worry"]} />);
  expect(
    await screen.findByRole("button", { name: "Choose this professional" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Listed support area: Worry & anxiety"),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Gender preference"), {
    target: { value: "male" },
  });
  expect(screen.queryByText("Directory Person")).not.toBeInTheDocument();
  expect(screen.getByText(/No profiles match/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Gender preference"), {
    target: { value: "female" },
  });
  expect(screen.getAllByText("Directory Person")).toHaveLength(2);
});
it("shows a sign-in and retry state instead of inventing available providers", async () => {
  request.mockImplementation(() => response({}, false, 401));
  render(<CounselorBooking />);
  expect(
    await screen.findByRole("link", { name: "Sign in to view support" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Retry directory" }),
  ).toBeInTheDocument();
});
it("submits only the chosen appointment details and explicit note", async () => {
  request.mockImplementation((url: string, options?: RequestInit) =>
    response(
      options?.method === "POST"
        ? {}
        : url === "/api/wellness-counselors"
          ? [profile]
          : [],
    ),
  );
  render(<CounselorBooking topics={["worry"]} />);
  await screen.findByRole("button", { name: "Choose this professional" });
  fireEvent.click(
    screen.getByRole("button", { name: "Choose this professional" }),
  );
  fireEvent.change(screen.getByLabelText("Preferred date"), {
    target: { value: "2100-01-01" },
  });
  fireEvent.change(screen.getByLabelText("Preferred time"), {
    target: { value: "10:30" },
  });
  fireEvent.change(screen.getByLabelText("Optional booking note"), {
    target: { value: "Please contact me about a slot." },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Submit booking request" }),
  );
  await waitFor(() =>
    expect(
      request.mock.calls.some(([, options]) => options?.method === "POST"),
    ).toBe(true),
  );
  const [, options] = request.mock.calls.find(
    ([, options]) => options?.method === "POST",
  )!;
  expect(JSON.parse(options.body)).toEqual({
    counselorId: "p1",
    preferredDate: "2100-01-01",
    preferredTime: "10:30",
    note: "Please contact me about a slot.",
  });
});
it("filters actual forum posts without publishing the student's topics or answers", async () => {
  request.mockImplementation(() =>
    response([
      {
        _id: "one",
        title: "Exam planning",
        body: "Study breaks",
        tags: ["study"],
      },
      {
        _id: "two",
        title: "Sleep routine",
        body: "Winding down",
        tags: ["sleep"],
      },
    ]),
  );
  render(<PeerSupport topic="sleep" />);
  expect(await screen.findByText("Sleep routine")).toBeInTheDocument();
  expect(screen.queryByText("Exam planning")).not.toBeInTheDocument();
  expect(request).toHaveBeenCalledWith("/api/peer-support-posts");
  expect(request.mock.calls).toHaveLength(1);
});
