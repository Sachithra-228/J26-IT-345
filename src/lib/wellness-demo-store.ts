import type { ProviderMetadata } from "@/lib/c2/support";

type DemoCounselor = ProviderMetadata & {
  _id: string;
  name: string;
  specialization: string;
  availability: string;
  mode: "online" | "in-person" | "hybrid";
  contactEmail?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type DemoCounselorBooking = {
  _id: string;
  counselorId: string;
  counselorName?: string;
  userId?: string;
  firebaseUid?: string;
  studentName?: string;
  preferredDate: string;
  preferredTime: string;
  note?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt?: string;
  updatedAt?: string;
};

type DemoWellnessChallenge = {
  _id: string;
  title: string;
  description: string;
  category: "mindfulness" | "fitness" | "sleep" | "nutrition" | "stress";
  durationDays: number;
  points: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type DemoChallengeProgress = {
  _id: string;
  challengeId: string;
  userId?: string;
  firebaseUid?: string;
  progress: number;
  completed: boolean;
  joinedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type DemoPeerPost = {
  _id: string;
  title: string;
  body: string;
  tags?: string[];
  authorName: string;
  userId?: string;
  firebaseUid?: string;
  anonymous?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type DemoPeerReply = {
  _id: string;
  postId: string;
  message: string;
  authorName: string;
  userId?: string;
  firebaseUid?: string;
  anonymous?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type DemoWellnessResource = {
  _id: string;
  title: string;
  description: string;
  url?: string;
  category: "mental-health" | "self-care" | "nutrition" | "sleep" | "crisis-support";
  language: "en" | "si" | "ta";
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

let counselors: DemoCounselor[] = [
  {
    _id: "wc1",
    name: "Dr. Nadeesha Silva",
    specialization: "Anxiety & academic stress",
    availability: "Mon-Fri 09:00-15:00",
    mode: "hybrid",
    contactEmail: "nadeesha.silva@unicare.lk",
    isActive: true
  },
  {
    _id: "wc2",
    name: "Ms. Tharushi Fernando",
    specialization: "Student wellbeing & resilience",
    availability: "Tue-Sat 10:00-17:00",
    mode: "online",
    contactEmail: "tharushi.fernando@unicare.lk",
    isActive: true
  }
];

let counselorBookings: DemoCounselorBooking[] = [];

let challenges: DemoWellnessChallenge[] = [
  {
    _id: "wch1",
    title: "7-Day Sleep Reset",
    description: "Track and improve sleep consistency for one week.",
    category: "sleep",
    durationDays: 7,
    points: 80,
    isActive: true
  },
  {
    _id: "wch2",
    title: "Mindful Minutes",
    description: "Complete 10 minutes of mindful breathing each day.",
    category: "mindfulness",
    durationDays: 14,
    points: 120,
    isActive: true
  }
];

let challengeProgressRecords: DemoChallengeProgress[] = [];

let peerPosts: DemoPeerPost[] = [
  {
    _id: "wpp1",
    title: "How do you stay focused during exams?",
    body: "Looking for practical routines that actually work.",
    tags: ["study", "stress"],
    authorName: "Student",
    anonymous: true,
    createdAt: new Date().toISOString()
  }
];

let peerReplies: DemoPeerReply[] = [
  {
    _id: "wpr1",
    postId: "wpp1",
    message: "Pomodoro + short walks helped me a lot.",
    authorName: "Peer",
    anonymous: true,
    createdAt: new Date().toISOString()
  }
];

let resources: DemoWellnessResource[] = [
  {
    _id: "wr1",
    title: "Managing Exam Anxiety",
    description: "Practical breathing, planning, and grounding methods.",
    url: "https://www.who.int/news-room/questions-and-answers/item/mental-health-stress",
    category: "mental-health",
    language: "en",
    isActive: true
  },
  {
    _id: "wr2",
    title: "Sleep Hygiene Basics",
    description: "Simple daily habits to improve sleep quality.",
    category: "sleep",
    language: "en",
    isActive: true
  }
];

export function getDemoCounselors() {
  return counselors.filter((item) => item.isActive !== false);
}

export function addDemoCounselor(input: Omit<DemoCounselor, "_id">) {
  const item: DemoCounselor = { ...input, _id: `wc${Date.now()}` };
  counselors = [item, ...counselors];
  return item;
}

export function getDemoCounselorBookings() {
  return counselorBookings;
}

export function addDemoCounselorBooking(input: Omit<DemoCounselorBooking, "_id">) {
  const booking: DemoCounselorBooking = { ...input, _id: `wcb${Date.now()}` };
  counselorBookings = [booking, ...counselorBookings];
  return booking;
}

export function updateDemoCounselorBooking(
  id: string,
  updates: Partial<DemoCounselorBooking>
) {
  const index = counselorBookings.findIndex((item) => item._id === id);
  if (index === -1) return null;
  const updated = { ...counselorBookings[index], ...updates, updatedAt: new Date().toISOString() };
  counselorBookings = counselorBookings.slice();
  counselorBookings[index] = updated;
  return updated;
}

export function getDemoWellnessChallenges() {
  return challenges.filter((item) => item.isActive !== false);
}

export function addDemoWellnessChallenge(input: Omit<DemoWellnessChallenge, "_id">) {
  const challenge: DemoWellnessChallenge = { ...input, _id: `wch${Date.now()}` };
  challenges = [challenge, ...challenges];
  return challenge;
}

export function getDemoChallengeProgress() {
  return challengeProgressRecords;
}

export function upsertDemoChallengeProgress(
  match: { challengeId: string; userId?: string; firebaseUid?: string },
  updates: Partial<DemoChallengeProgress>
) {
  const index = challengeProgressRecords.findIndex(
    (item) =>
      item.challengeId === match.challengeId &&
      ((match.userId && item.userId === match.userId) ||
        (match.firebaseUid && item.firebaseUid === match.firebaseUid))
  );
  if (index === -1) {
    const record: DemoChallengeProgress = {
      _id: `wcp${Date.now()}`,
      challengeId: match.challengeId,
      userId: match.userId,
      firebaseUid: match.firebaseUid,
      progress: Math.max(0, Math.min(100, Number(updates.progress ?? 0))),
      completed: Boolean(updates.completed),
      joinedAt: updates.joinedAt ?? new Date().toISOString(),
      completedAt: updates.completed ? updates.completedAt ?? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    challengeProgressRecords = [record, ...challengeProgressRecords];
    return record;
  }

  const current = challengeProgressRecords[index];
  const merged: DemoChallengeProgress = {
    ...current,
    ...updates,
    progress: Math.max(0, Math.min(100, Number(updates.progress ?? current.progress))),
    completedAt:
      updates.completed === true
        ? updates.completedAt ?? current.completedAt ?? new Date().toISOString()
        : current.completedAt,
    updatedAt: new Date().toISOString()
  };
  challengeProgressRecords = challengeProgressRecords.slice();
  challengeProgressRecords[index] = merged;
  return merged;
}

export function getDemoPeerPosts() {
  return peerPosts;
}

export function addDemoPeerPost(input: Omit<DemoPeerPost, "_id">) {
  const post: DemoPeerPost = { ...input, _id: `wpp${Date.now()}` };
  peerPosts = [post, ...peerPosts];
  return post;
}

export function getDemoPeerReplies(postId: string) {
  return peerReplies.filter((item) => item.postId === postId);
}

export function addDemoPeerReply(input: Omit<DemoPeerReply, "_id">) {
  const reply: DemoPeerReply = { ...input, _id: `wpr${Date.now()}` };
  peerReplies = [reply, ...peerReplies];
  return reply;
}

export function deleteDemoPeerPost(id: string) {
  const before = peerPosts.length;
  peerPosts = peerPosts.filter((item) => item._id !== id);
  if (peerPosts.length === before) return false;
  peerReplies = peerReplies.filter((item) => item.postId !== id);
  return true;
}

export function getDemoWellnessResources() {
  return resources.filter((item) => item.isActive !== false);
}

export function addDemoWellnessResource(input: Omit<DemoWellnessResource, "_id">) {
  const resource: DemoWellnessResource = { ...input, _id: `wr${Date.now()}` };
  resources = [resource, ...resources];
  return resource;
}
