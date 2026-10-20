import { render, screen, within } from "@testing-library/react";
import { ScholarshipUpdates } from "@/components/c1/scholarship-updates";
import { LanguageProvider } from "@/context/language-context";
import {
  chainNotificationsFor,
  deadlineNotificationsFor,
  DEMO_STUDENT_ID,
  DEMO_STUDENT_SALT,
  studentRefFor
} from "@/lib/c1/chain-notifications";
import demoLedger from "@/lib/c1/demo-ledger.json";
import { illustrativeScholarships } from "@/lib/c1/demo-scholarships";
import type { LedgerFile } from "@/lib/c1/ledger";

const ledger = demoLedger as unknown as LedgerFile;
const chain = chainNotificationsFor(ledger.events, studentRefFor(DEMO_STUDENT_ID, DEMO_STUDENT_SALT), 11155111);
const deadlines = deadlineNotificationsFor(illustrativeScholarships);
const other = { id: "n1", title: "Mentor session confirmed", message: "x", date: "2026-02-06" };

function mockNotifications(body: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body }) as unknown as typeof fetch;
}

const renderCard = () =>
  render(
    <LanguageProvider>
      <ScholarshipUpdates />
    </LanguageProvider>
  );

afterEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

describe("ScholarshipUpdates", () => {
  it("lists only the student's scholarship events, with transaction links", async () => {
    mockNotifications({ notifications: [...chain, other] });
    renderCard();

    const list = await screen.findByTestId("scholarship-updates");
    expect(within(list).getAllByRole("listitem")).toHaveLength(7);
    expect(within(list).getByText("Scholarship awarded")).toBeInTheDocument();
    expect(
      within(list).getByText("You were awarded 4 test ETH from campaign #1, paid in 4 milestone payments.")
    ).toBeInTheDocument();
    expect(within(list).getAllByText("Payment released")).toHaveLength(3);
    expect(within(list).queryByText("Mentor session confirmed")).not.toBeInTheDocument();
    expect(within(list).getAllByRole("link", { name: "View transaction" })[0]).toHaveAttribute(
      "href",
      chain[0].explorerUrl
    );
  });

  it("renders upcoming scholarship deadline reminders alongside chain events", async () => {
    mockNotifications({ notifications: [...deadlines, ...chain] });
    renderCard();

    const list = await screen.findByTestId("scholarship-updates");
    expect(within(list).getByText("Upcoming scholarship deadline (7 days)")).toBeInTheDocument();
    expect(within(list).getByText(/Emergency Study Continuity Fund/)).toBeInTheDocument();
  });

  it("is shown in Sinhala", async () => {
    window.localStorage.setItem("unicare-language", "si");
    mockNotifications({ notifications: chain });
    renderCard();
    expect(await screen.findByText("ශිෂ්‍යත්වය ප්‍රදානය කෙරිණි")).toBeInTheDocument();
    expect(screen.getAllByText("ගෙවීම නිකුත් කෙරිණි")).toHaveLength(3);
  });

  it("explains when there is no scholarship activity yet", async () => {
    mockNotifications({ notifications: [other] });
    renderCard();
    expect(await screen.findByText(/No scholarship activity yet/)).toBeInTheDocument();
  });

  it("shows an error when notifications cannot be loaded", async () => {
    mockNotifications({}, false);
    renderCard();
    expect(await screen.findByRole("alert")).toHaveTextContent("Scholarship updates could not be loaded.");
  });
});
