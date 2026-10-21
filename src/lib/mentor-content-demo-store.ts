export type DemoMentorCareerInsight = {
  _id: string;
  mentorUserId?: string;
  mentorFirebaseUid?: string;
  title: string;
  category: string;
  content: string;
  referenceUrl?: string;
  visibility: "mentees" | "public";
  createdAt: string;
  updatedAt: string;
};

export type DemoMentorWebinar = {
  _id: string;
  mentorUserId?: string;
  mentorFirebaseUid?: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: "online" | "in-person" | "hybrid";
  joinLink?: string;
  description: string;
  status: "upcoming" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

export type DemoMentorSuccessStory = {
  _id: string;
  mentorUserId?: string;
  mentorFirebaseUid?: string;
  title: string;
  studentLabel?: string;
  summary: string;
  impactMetric?: string;
  createdAt: string;
  updatedAt: string;
};

export type DemoMentorMenteeNote = {
  _id: string;
  mentorUserId?: string;
  mentorFirebaseUid?: string;
  studentId: string;
  studentName?: string;
  topic?: string;
  note: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
};

type MentorIdentity = {
  userId?: string;
  firebaseUid?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function belongsToMentor(
  item: { mentorUserId?: string; mentorFirebaseUid?: string },
  input: MentorIdentity
) {
  const userMatch = Boolean(input.userId) && item.mentorUserId === input.userId;
  const firebaseMatch = Boolean(input.firebaseUid) && item.mentorFirebaseUid === input.firebaseUid;
  return Boolean(userMatch || firebaseMatch);
}

let demoCareerInsights: DemoMentorCareerInsight[] = [
  {
    _id: "career-1",
    mentorUserId: "u4",
    mentorFirebaseUid: "u4",
    title: "How to prepare for frontend interviews",
    category: "Interview",
    content: "Focus on JavaScript fundamentals, accessibility, and practical React debugging rounds.",
    referenceUrl: "https://roadmap.sh/frontend",
    visibility: "mentees",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
  }
];

let demoWebinars: DemoMentorWebinar[] = [
  {
    _id: "webinar-1",
    mentorUserId: "u4",
    mentorFirebaseUid: "u4",
    title: "Breaking into Product Management",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    durationMinutes: 60,
    mode: "online",
    joinLink: "https://meet.example.com/product-mentoring",
    description: "Roadmap, portfolios, and interview prep for PM internships.",
    status: "upcoming",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
  }
];

let demoSuccessStories: DemoMentorSuccessStory[] = [
  {
    _id: "story-1",
    mentorUserId: "u4",
    mentorFirebaseUid: "u4",
    title: "Resume revamp to internship offer",
    studentLabel: "S.J.S.",
    summary: "Student improved project storytelling and secured a frontend internship in 6 weeks.",
    impactMetric: "Offer in 6 weeks",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
  }
];

let demoMenteeNotes: DemoMentorMenteeNote[] = [
  {
    _id: "note-1",
    mentorUserId: "u4",
    mentorFirebaseUid: "u4",
    studentId: "u1",
    studentName: "Student",
    topic: "Career planning",
    note: "Needs help with portfolio structure and mock interviews.",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
  }
];

export function listDemoMentorCareerInsights(input: MentorIdentity) {
  return demoCareerInsights
    .filter((item) => belongsToMentor(item, input))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map((item) => ({ ...item }));
}

export function listAllDemoMentorCareerInsights() {
  return demoCareerInsights.map((item) => ({ ...item }));
}

export function addDemoMentorCareerInsight(
  input: Omit<DemoMentorCareerInsight, "_id" | "createdAt" | "updatedAt">
) {
  const created: DemoMentorCareerInsight = {
    ...input,
    _id: makeId("career"),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  demoCareerInsights = [created, ...demoCareerInsights];
  return { ...created };
}

export function updateDemoMentorCareerInsight(
  id: string,
  input: Partial<Omit<DemoMentorCareerInsight, "_id" | "mentorUserId" | "mentorFirebaseUid" | "createdAt">>
) {
  const index = demoCareerInsights.findIndex((item) => item._id === id);
  if (index < 0) return null;
  const updated: DemoMentorCareerInsight = {
    ...demoCareerInsights[index],
    ...input,
    updatedAt: nowIso()
  };
  demoCareerInsights[index] = updated;
  return { ...updated };
}

export function deleteDemoMentorCareerInsight(id: string) {
  const index = demoCareerInsights.findIndex((item) => item._id === id);
  if (index < 0) return null;
  const [removed] = demoCareerInsights.splice(index, 1);
  return { ...removed };
}

export function listDemoMentorWebinars(input: MentorIdentity) {
  return demoWebinars
    .filter((item) => belongsToMentor(item, input))
    .sort((a, b) => (a.scheduledAt < b.scheduledAt ? 1 : -1))
    .map((item) => ({ ...item }));
}

export function listAllDemoMentorWebinars() {
  return demoWebinars.map((item) => ({ ...item }));
}

export function addDemoMentorWebinar(
  input: Omit<DemoMentorWebinar, "_id" | "createdAt" | "updatedAt">
) {
  const created: DemoMentorWebinar = {
    ...input,
    _id: makeId("webinar"),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  demoWebinars = [created, ...demoWebinars];
  return { ...created };
}

export function updateDemoMentorWebinar(
  id: string,
  input: Partial<Omit<DemoMentorWebinar, "_id" | "mentorUserId" | "mentorFirebaseUid" | "createdAt">>
) {
  const index = demoWebinars.findIndex((item) => item._id === id);
  if (index < 0) return null;
  const updated: DemoMentorWebinar = {
    ...demoWebinars[index],
    ...input,
    updatedAt: nowIso()
  };
  demoWebinars[index] = updated;
  return { ...updated };
}

export function deleteDemoMentorWebinar(id: string) {
  const index = demoWebinars.findIndex((item) => item._id === id);
  if (index < 0) return null;
  const [removed] = demoWebinars.splice(index, 1);
  return { ...removed };
}

export function listDemoMentorSuccessStories(input: MentorIdentity) {
  return demoSuccessStories
    .filter((item) => belongsToMentor(item, input))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map((item) => ({ ...item }));
}

export function addDemoMentorSuccessStory(
  input: Omit<DemoMentorSuccessStory, "_id" | "createdAt" | "updatedAt">
) {
  const created: DemoMentorSuccessStory = {
    ...input,
    _id: makeId("story"),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  demoSuccessStories = [created, ...demoSuccessStories];
  return { ...created };
}

export function updateDemoMentorSuccessStory(
  id: string,
  input: Partial<Omit<DemoMentorSuccessStory, "_id" | "mentorUserId" | "mentorFirebaseUid" | "createdAt">>
) {
  const index = demoSuccessStories.findIndex((item) => item._id === id);
  if (index < 0) return null;
  const updated: DemoMentorSuccessStory = {
    ...demoSuccessStories[index],
    ...input,
    updatedAt: nowIso()
  };
  demoSuccessStories[index] = updated;
  return { ...updated };
}

export function deleteDemoMentorSuccessStory(id: string) {
  const index = demoSuccessStories.findIndex((item) => item._id === id);
  if (index < 0) return null;
  const [removed] = demoSuccessStories.splice(index, 1);
  return { ...removed };
}

export function listDemoMentorMenteeNotes(input: MentorIdentity) {
  return demoMenteeNotes
    .filter((item) => belongsToMentor(item, input))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map((item) => ({ ...item }));
}

export function addDemoMentorMenteeNote(
  input: Omit<DemoMentorMenteeNote, "_id" | "createdAt" | "updatedAt">
) {
  const created: DemoMentorMenteeNote = {
    ...input,
    _id: makeId("note"),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  demoMenteeNotes = [created, ...demoMenteeNotes];
  return { ...created };
}

export function updateDemoMentorMenteeNote(
  id: string,
  input: Partial<Omit<DemoMentorMenteeNote, "_id" | "mentorUserId" | "mentorFirebaseUid" | "createdAt">>
) {
  const index = demoMenteeNotes.findIndex((item) => item._id === id);
  if (index < 0) return null;
  const updated: DemoMentorMenteeNote = {
    ...demoMenteeNotes[index],
    ...input,
    updatedAt: nowIso()
  };
  demoMenteeNotes[index] = updated;
  return { ...updated };
}

export function deleteDemoMentorMenteeNote(id: string) {
  const index = demoMenteeNotes.findIndex((item) => item._id === id);
  if (index < 0) return null;
  const [removed] = demoMenteeNotes.splice(index, 1);
  return { ...removed };
}
