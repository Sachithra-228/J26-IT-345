import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { CounselorBooking } from "@/components/wellness/counselor-booking";
import { PeerSupport } from "@/components/wellness/peer-support";
import researchProfiles from "@/lib/c2/research-professionals.json";
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
it("loads the separate eight-profile database catalog, applies preferences, and never offers a real booking", async () => {
  request.mockImplementation((url: string) =>
    response(
      url === "/api/c2/research-professionals"
        ? researchProfiles.map((p) => ({
            ...p,
            isResearchProfile: true,
            availability: "Demonstration only",
          }))
        : [],
    ),
  );
  render(
    <CounselorBooking
      researchOnly
      topics={["worry", "sleep"]}
      topicWeights={{ worry: 0.8, sleep: 0.7 }}
    />,
  );
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Select sample profile" }),
    ).toHaveLength(8),
  );
  const topMatches = screen
    .getAllByRole("article")
    .filter((card) => within(card).queryByText("Top topic match"));
  expect(topMatches.map((card) => card.getAttribute("aria-label"))).toEqual([
    "Aravind Sivarajan",
    "Tharushi Senanayake",
  ]);
  expect(
    screen.queryByRole("button", { name: "Submit booking request" }),
  ).not.toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith("/api/c2/research-professionals");
  fireEvent.change(screen.getByLabelText("Gender preference"), {
    target: { value: "female" },
  });
  fireEvent.change(screen.getByLabelText("Preferred language"), {
    target: { value: "si" },
  });
  fireEvent.change(screen.getByLabelText("Professional type"), {
    target: { value: "psychologist" },
  });
  expect(
    screen.getAllByRole("button", { name: "Select sample profile" }),
  ).toHaveLength(1);
  expect(screen.getAllByText("Top topic match")).toHaveLength(1);
  fireEvent.click(
    screen.getByRole("button", { name: "Select sample profile" }),
  );
  expect(screen.getByText(/Selected: Tharushi Senanayake/)).toBeInTheDocument();
  expect(
    request.mock.calls.every(
      ([, options]) => !options?.method || options.method === "GET",
    ),
  ).toBe(true);
});
it.each([{ topics: [] }, { topics: ["practical"] }] as const)(
  "does not call a sample with no topic overlap a top match (%j)",
  async ({ topics }) => {
    request.mockImplementation(() =>
      response(
        researchProfiles
          .filter((p) => p._id === "c2-research-03")
          .map((p) => ({ ...p, isResearchProfile: true })),
      ),
    );
    render(<CounselorBooking researchOnly topics={[...topics]} />);
    await screen.findByRole("button", { name: "Select sample profile" });
    expect(screen.queryByText("Top topic match")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "No listed support-area overlap with your current topics.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Available in the university directory/),
    ).not.toBeInTheDocument();
  },
);
it("ignores a stale university response after switching to the research directory", async () => {
  let resolveUniversity!: (value: unknown) => void;
  request.mockImplementation((url: string) =>
    url === "/api/wellness-counselors"
      ? new Promise((resolve) => {
          resolveUniversity = resolve;
        })
      : response(
          url === "/api/c2/research-professionals"
            ? researchProfiles.map((p) => ({ ...p, isResearchProfile: true }))
            : [],
        ),
  );
  render(<CounselorBooking />);
  fireEvent.change(screen.getByLabelText("Directory source"), {
    target: { value: "research" },
  });
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Select sample profile" }),
    ).toHaveLength(8),
  );
  resolveUniversity({ ok: true, status: 200, json: async () => [profile] });
  await waitFor(() =>
    expect(screen.queryByText("Directory Person")).not.toBeInTheDocument(),
  );
  expect(
    screen.getAllByRole("button", { name: "Select sample profile" }),
  ).toHaveLength(8);
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
