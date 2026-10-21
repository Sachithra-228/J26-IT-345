import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { WellnessCommunities } from "@/components/c2/wellness-communities";
import {
  SAMPLE_COMMUNITIES,
  matchCommunities,
  validateCommunityCatalog,
} from "@/lib/c2/communities";
import {
  CONCERN_TOPICS,
  type Assessment,
} from "@/lib/c2/assessment";
import catalog from "@/lib/c2/research-communities.json";
import scenarios from "../../../docs/c2/pp1-preparation/demo-scenarios.json";

const originalFetch = global.fetch;
const request = jest.fn();
beforeEach(() => {
  request.mockReset();
  global.fetch = request;
  request.mockResolvedValue({ ok: true, json: async () => catalog });
});
afterEach(() => {
  global.fetch = originalFetch;
});
function scenario(id: string): Assessment {
  const row = scenarios.scenarios.find((item) => item.id === id)!;
  const value = {
    phq9: row.phq9,
    gad7: row.gad7,
    context: Object.fromEntries(row.questionPath.map((q) => [q.id, q.answer])),
    completedAt: "2026-10-20T12:00:00Z",
    version: "test",
    concernAnalysis: {
      prediction: row.prediction,
      confirmed: row.confirmedTopics,
      source: "distilbert-confirmed",
    },
    supportTopics: row.confirmedTopics,
    questionPath: row.questionPath,
  } as Assessment;
  return JSON.parse(JSON.stringify(value)) as Assessment;
}
it("covers all fifteen support topics in thirteen explicitly synthetic circles", () => {
  expect(SAMPLE_COMMUNITIES).toHaveLength(13);
  expect(
    [...new Set(SAMPLE_COMMUNITIES.flatMap((item) => item.topics))].sort(),
  ).toEqual([...CONCERN_TOPICS].sort());
  expect(
    SAMPLE_COMMUNITIES.every(
      (item) => item.sourceType === "synthetic" && item.isSample,
    ),
  ).toBe(true);
  expect(() =>
    validateCommunityCatalog({ ...catalog, version: "unknown" }),
  ).toThrow();
  expect(() =>
    validateCommunityCatalog({
      ...catalog,
      communities: [catalog.communities[0], catalog.communities[0]],
    }),
  ).toThrow();
  expect(() =>
    validateCommunityCatalog({
      ...catalog,
      communities: [{ ...catalog.communities[0], sourceType: "real" }],
    }),
  ).toThrow();
});
it("changes suggestions between actual stored study/worry and grief/confidence model examples", () => {
  const study = matchCommunities(
    SAMPLE_COMMUNITIES,
    scenario("study-worry"),
  ).filter((item) => item.score > 0);
  const grief = matchCommunities(
    SAMPLE_COMMUNITIES,
    scenario("grief-confidence"),
  ).filter((item) => item.score > 0);
  expect(study.map((item) => item.community.name)).toEqual([
    "Study Balance LK",
    "Campus Calm Circle",
  ]);
  expect(grief.map((item) => item.community.name)).toEqual([
    "Confidence & Kindness",
    "Space for Grief",
  ]);
  expect(study[0].modelInformed).toBe(true);
  expect(study[0].reasons.join(" ")).toContain("planning my workload");
  expect(grief[1].reasons.join(" ")).toContain("Missing someone");
});
it("uses current model priorities rather than topic-array order and does not add rejected topics", () => {
  const value = scenario("study-worry");
  value.context = {};
  value.questionPath = [];
  const prediction = value.concernAnalysis!.prediction!;
  prediction.scores = prediction.scores.map((item) => ({
    ...item,
    score:
      item.topic === "worry"
        ? 0.95
        : item.topic === "study"
          ? 0.55
          : item.topic === "sleep"
            ? 0.99
            : 0.1,
  }));
  const matches = matchCommunities(SAMPLE_COMMUNITIES, value).filter(
    (item) => item.score > 0,
  );
  expect(matches[0].community.name).toBe("Campus Calm Circle");
  expect(matches.some((item) => item.community.topics.includes("sleep"))).toBe(
    false,
  );
  value.context.worry = "No current worry concern";
  expect(
    matchCommunities(SAMPLE_COMMUNITIES, value)
      .filter((item) => item.score > 0)
      .map((item) => item.community.name),
  ).toEqual(["Study Balance LK"]);
});
it("explains changed practical-support answers without claiming ML ran on a manual check-in", () => {
  const value = scenario("study-worry");
  value.concernAnalysis = {
    prediction: null,
    confirmed: ["practical"],
    source: "student-selected",
  };
  value.supportTopics = ["practical"];
  value.context = { practical: "Housing or accommodation" };
  expect(matchCommunities(SAMPLE_COMMUNITIES, value)[0]).toMatchObject({
    modelInformed: false,
    community: { name: "Everyday Support LK" },
  });
  expect(
    matchCommunities(SAMPLE_COMMUNITIES, value)[0].reasons.join(" "),
  ).toContain("Housing or accommodation");
  value.context.practical = "Money or essential expenses";
  expect(
    matchCommunities(SAMPLE_COMMUNITIES, value)[0].reasons.join(" "),
  ).toContain("Money or essential expenses");
});
it("does not invent personalized matches without a check-in or promote any match as clinical safety", () => {
  expect(
    matchCommunities(SAMPLE_COMMUNITIES, null).every(
      (item) => item.score === 0 && !item.modelInformed,
    ),
  ).toBe(true);
  const value = scenario("study-worry");
  expect(
    matchCommunities(SAMPLE_COMMUNITIES, {
      ...value,
      safetySupportRequested: true,
      phq9: Array(9).fill(3),
    }),
  ).toEqual(matchCommunities(SAMPLE_COMMUNITIES, value));
});
it("automatically shows matching circles and refreshes them for a different student scenario", async () => {
  const onBrowse = jest.fn();
  const view = render(
    <WellnessCommunities
      compact
      assessment={scenario("study-worry")}
      onBrowse={onBrowse}
    />,
  );
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  expect(screen.getAllByRole("article")).toHaveLength(2);
  const study = screen.getByRole("article", { name: "Study Balance LK" });
  fireEvent.click(
    within(study).getByRole("button", { name: "Explore circle" }),
  );
  expect(onBrowse).toHaveBeenCalledWith("c2-community-study-balance");
  view.rerender(
    <WellnessCommunities
      compact
      assessment={scenario("grief-confidence")}
      onBrowse={onBrowse}
    />,
  );
  expect(
    screen.queryByRole("article", { name: "Study Balance LK" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("article", { name: "Space for Grief" }),
  ).toBeInTheDocument();
  expect(request.mock.calls).toEqual([
    ["/api/c2/research-communities", { cache: "no-store" }],
  ]);
});
it("supports topic/language filtering and read-only starter previews without joining or posting", async () => {
  render(<WellnessCommunities assessment={scenario("study-worry")} />);
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText("Community topic filter"), {
    target: { value: "eating" },
  });
  fireEvent.change(screen.getByLabelText("Community language"), {
    target: { value: "si" },
  });
  expect(screen.getByText(/No circles match/)).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Show all sample circles" }),
  );
  expect(screen.getAllByRole("article")).toHaveLength(13);
  fireEvent.click(
    within(screen.getByRole("article", { name: "Study Balance LK" })).getByRole(
      "button",
      { name: "Explore circle" },
    ),
  );
  expect(
    screen.getByRole("region", { name: "Study Balance LK preview" }),
  ).toHaveTextContent("Making space for a busy assignment week");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /join|post reply|publish/i }),
  ).not.toBeInTheDocument();
  expect(
    request.mock.calls.every(
      ([, options]) => !options?.method || options.method === "GET",
    ),
  ).toBe(true);
});
it("keeps recommendations usable with an explicit bundled fallback if the catalog fails", async () => {
  request.mockRejectedValue(new Error("offline"));
  render(<WellnessCommunities compact assessment={scenario("study-worry")} />);
  await screen.findByRole("button", { name: "Retry community catalog" });
  expect(
    screen.getByRole("article", { name: "Study Balance LK" }),
  ).toBeInTheDocument();
  request.mockResolvedValue({ ok: true, json: async () => catalog });
  fireEvent.click(
    screen.getByRole("button", { name: "Retry community catalog" }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Retry community catalog" }),
    ).not.toBeInTheDocument(),
  );
  expect(request).toHaveBeenCalledTimes(2);
});
