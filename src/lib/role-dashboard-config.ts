import { UserRole } from "@/types";

export type DashboardRole =
  | "student"
  | "faculty"
  | "admin"
  | "mentor"
  | "donor"
  | "employer"
  | "ngo"
  | "parent";

export type DashboardSection = {
  id: string;
  menuLabel: string;
  icon: string;
  title: string;
  items: string[];
};

export type DashboardRoleConfig = {
  label: string;
  workspaceLabel: string;
  description: string;
  sections: DashboardSection[];
};

export const DASHBOARD_ROLE_ORDER: DashboardRole[] = [
  "student",
  "faculty",
  "admin",
  "mentor",
  "donor",
  "employer",
  "ngo",
  "parent"
];

export const DASHBOARD_ROLE_CONFIG: Record<DashboardRole, DashboardRoleConfig> = {
  student: {
    label: "Student",
    workspaceLabel: "Student Dashboard",
    description: "Track support, growth, and campus life from one place.",
    sections: [
      {
        id: "home",
        menuLabel: "Home",
        icon: "🏠",
        title: "Student Home",
        items: [
          "Show personalized welcome message",
          "Display recent activity feed",
          "Show recommended scholarships/jobs based on profile",
          "Show upcoming deadlines",
          "Display wellness check-in reminder"
        ]
      },
      {
        id: "financial-aid",
        menuLabel: "Financial Aid",
        icon: "💰",
        title: "Financial Aid",
        items: [
          "Show all available scholarships (matched to profile)",
          "Track emergency aid applications status",
          "Request equipment (laptops/books)",
          "View meal voucher balance",
          "Apply for tuition fee assistance"
        ]
      },
      {
        id: "aid-matching",
        menuLabel: "Smart Aid Matching",
        icon: "✨",
        title: "Smart Aid Matching",
        items: [
          "Check your financial-need index privately",
          "See scholarships ranked for you with reasons",
          "Optionally share your assessment with the welfare office"
        ]
      },
      {
        id: "career",
        menuLabel: "Career",
        icon: "💼",
        title: "Career",
        items: [
          "Browse part-time jobs and internships",
          "View job recommendations based on skills",
          "Track job applications status",
          "Build and download resume",
          "View skill gap analysis and course recommendations"
        ]
      },
      {
        id: "career-guidance",
        menuLabel: "Career Readiness",
        icon: "🧭",
        title: "Career Readiness",
        items: [
          "See your readiness for IT roles with the reasons behind every score",
          "Find the skill gaps that matter most for your target roles",
          "Follow a Gap-to-Action plan of modules, projects and certifications"
        ]
      },
      {
        id: "mentorship",
        menuLabel: "Mentorship",
        icon: "👥",
        title: "Mentorship",
        items: [
          "Browse available mentors (alumni/industry)",
          "Request mentorship from mentors",
          "Track request status",
          "Chat with approved mentors",
          "View mentorship session updates",
          "Share feedback after completed sessions"
        ]
      },
      {
        id: "wellness",
        menuLabel: "Wellness",
        icon: "❤️",
        title: "Wellness",
        items: [
          "Log daily mood/stress/sleep",
          "View wellness trends over time",
          "Book counseling sessions",
          "Access peer support forums"
        ]
      },
      {
        id: "campus-life",
        menuLabel: "Campus Life",
        icon: "📅",
        title: "Campus Life",
        items: [
          "View upcoming campus events",
          "Browse and join student clubs/societies",
          "See campus announcements",
          "Access local business discounts",
          "View volunteer opportunities"
        ]
      },
      {
        id: "my-applications",
        menuLabel: "My Applications",
        icon: "📚",
        title: "My Applications",
        items: [
          "Track all applications in one place (scholarships, jobs, aid)",
          "View status (pending/approved/rejected)",
          "Upload missing documents",
          "Receive feedback on rejections"
        ]
      },
      {
        id: "communications",
        menuLabel: "Communications",
        icon: "💬",
        title: "Communications",
        items: [
          "View donor and partner updates",
          "See scholarship communication history",
          "Track official support announcements"
        ]
      },
      {
        id: "profile",
        menuLabel: "Profile",
        icon: "👤",
        title: "Profile",
        items: [
          "Manage personal details",
          "Update academic info (university, degree, year)",
          "Upload documents (ID, transcripts)",
          "Set privacy preferences",
          "Manage notification settings"
        ]
      }
    ]
  },
  admin: {
    label: "University Admin / Faculty",
    workspaceLabel: "Admin & Faculty Dashboard",
    description: "Oversee support operations, approvals, and institutional impact.",
    sections: [
      {
        id: "overview",
        menuLabel: "Overview",
        icon: "🏠",
        title: "Overview",
        items: [
          "Student stats (total, active)",
          "Pending verifications badge",
          "Recent activity feed"
        ]
      },
      {
        id: "verifications",
        menuLabel: "Verifications",
        icon: "✅",
        title: "Verifications",
        items: [
          "Student enrollment verifications",
          "Financial aid applications",
          "Scholarship eligibility checks",
          "Document validation queue"
        ]
      },
      {
        id: "financial-oversight",
        menuLabel: "Financial Oversight",
        icon: "💰",
        title: "Financial Oversight",
        items: [
          "Emergency fund requests",
          "Fee waiver applications",
          "Equipment requests from students",
          "Disbursement tracking"
        ]
      },
      {
        id: "aid-prioritisation",
        menuLabel: "Aid Prioritisation",
        icon: "📊",
        title: "Aid Prioritisation",
        items: [
          "AI-ranked queue of students by financial need",
          "Explainable factors behind every score",
          "Shortlist students for scholarship awards"
        ]
      },
      {
        id: "fund-ledger",
        menuLabel: "Fund Ledger",
        icon: "🔗",
        title: "Blockchain Fund Ledger",
        items: [
          "Campaign funding and escrow balances",
          "Milestone-based disbursement progress",
          "Tamper-evident audit trail"
        ]
      },
      {
        id: "career-services",
        menuLabel: "Career Services",
        icon: "💼",
        title: "Career Services",
        items: [
          "Job postings from employers",
          "Internship opportunities",
          "Placement statistics"
        ]
      },
      {
        id: "career-readiness",
        menuLabel: "Career Readiness Insights",
        icon: "🧭",
        title: "Career Readiness Insights",
        items: [
          "Anonymous cohort readiness for IT career paths",
          "Most common skill gaps across students",
          "Groups smaller than five students are hidden"
        ]
      },
      {
        id: "mentorship-program",
        menuLabel: "Mentorship Program",
        icon: "👥",
        title: "Mentorship Program",
        items: [
          "Mentor approval queue",
          "Active mentorship pairs",
          "Session reports"
        ]
      },
      {
        id: "counselor-support",
        menuLabel: "Counselor Support",
        icon: "❤️",
        title: "Counselor Support",
        items: [
          "Add available counselors",
          "Review student counseling requests",
          "Accept/reject bookings",
          "Track confirmed/completed sessions"
        ]
      },
      {
        id: "peer-support",
        menuLabel: "Peer Support",
        icon: "💬",
        title: "Peer Support",
        items: [
          "View student peer support posts",
          "Review replies",
          "Moderate inappropriate content"
        ]
      },
      {
        id: "reports",
        menuLabel: "Reports",
        icon: "📊",
        title: "Reports",
        items: [
          "Student support metrics",
          "Financial aid distribution",
          "Mental health trends (anonymized)",
          "Export data"
        ]
      },
      {
        id: "announcements",
        menuLabel: "Announcements",
        icon: "📢",
        title: "Announcements",
        items: [
          "Post campus-wide notices",
          "Event promotions",
          "Emergency alerts"
        ]
      },
      {
        id: "partnerships",
        menuLabel: "Partnerships",
        icon: "🤝",
        title: "Partnerships",
        items: [
          "Joint initiatives with NGOs",
          "Collaboration tracking",
          "External program administration"
        ]
      },
      {
        id: "ngo-partnerships",
        menuLabel: "NGO Partnership",
        icon: "🤝",
        title: "NGO Partnership",
        items: [
          "View NGO partnership requests",
          "Review requests from NGOs",
          "Accept or decline requests",
          "Coordinate next steps with partners"
        ]
      },
      {
        id: "communications",
        menuLabel: "Communications",
        icon: "💬",
        title: "Communications",
        items: [
          "Receive donor and CSR updates",
          "Review communication history by audience",
          "Track important partner announcements"
        ]
      },
      {
        id: "ngo-partnerships",
        menuLabel: "NGO Partnership",
        icon: "🤝",
        title: "NGO Partnership",
        items: [
          "View NGO partnership requests",
          "Review requests from NGOs",
          "Accept or decline requests",
          "Coordinate next steps with partners"
        ]
      },
      {
        id: "profile",
        menuLabel: "Profile",
        icon: "👤",
        title: "Profile",
        items: [
          "Admin settings",
          "Department management"
        ]
      }
    ]
  },
  faculty: {
    label: "University Staff / Faculty",
    workspaceLabel: "Faculty Dashboard",
    description: "Oversee support operations, approvals, and institutional impact.",
    sections: [
      {
        id: "overview",
        menuLabel: "Overview",
        icon: "🏠",
        title: "Overview",
        items: [
          "Student stats (total, active)",
          "Pending verifications badge",
          "Recent activity feed"
        ]
      },
      {
        id: "verifications",
        menuLabel: "Verifications",
        icon: "✅",
        title: "Verifications",
        items: [
          "Student enrollment verifications",
          "Financial aid applications",
          "Scholarship eligibility checks",
          "Document validation queue"
        ]
      },
      {
        id: "financial-oversight",
        menuLabel: "Financial Oversight",
        icon: "💰",
        title: "Financial Oversight",
        items: [
          "Emergency fund requests",
          "Fee waiver applications",
          "Equipment requests from students",
          "Disbursement tracking"
        ]
      },
      {
        id: "aid-prioritisation",
        menuLabel: "Aid Prioritisation",
        icon: "📊",
        title: "Aid Prioritisation",
        items: [
          "AI-ranked queue of students by financial need",
          "Explainable factors behind every score",
          "Shortlist students for scholarship awards"
        ]
      },
      {
        id: "fund-ledger",
        menuLabel: "Fund Ledger",
        icon: "🔗",
        title: "Blockchain Fund Ledger",
        items: [
          "Campaign funding and escrow balances",
          "Milestone-based disbursement progress",
          "Tamper-evident audit trail"
        ]
      },
      {
        id: "career-services",
        menuLabel: "Career Services",
        icon: "💼",
        title: "Career Services",
        items: [
          "Job postings from employers",
          "Internship opportunities",
          "Placement statistics"
        ]
      },
      {
        id: "career-readiness",
        menuLabel: "Career Readiness Insights",
        icon: "🧭",
        title: "Career Readiness Insights",
        items: [
          "Anonymous cohort readiness for IT career paths",
          "Most common skill gaps across students",
          "Groups smaller than five students are hidden"
        ]
      },
      {
        id: "mentorship-program",
        menuLabel: "Mentorship Program",
        icon: "👥",
        title: "Mentorship Program",
        items: [
          "Mentor approval queue",
          "Active mentorship pairs",
          "Session reports"
        ]
      },
      {
        id: "counselor-support",
        menuLabel: "Counselor Support",
        icon: "❤️",
        title: "Counselor Support",
        items: [
          "Add available counselors",
          "Review student counseling requests",
          "Accept/reject bookings",
          "Track confirmed/completed sessions"
        ]
      },
      {
        id: "reports",
        menuLabel: "Reports",
        icon: "📊",
        title: "Reports",
        items: [
          "Student support metrics",
          "Financial aid distribution",
          "Mental health trends (anonymized)",
          "Export data"
        ]
      },
      {
        id: "announcements",
        menuLabel: "Announcements",
        icon: "📢",
        title: "Announcements",
        items: [
          "Post campus-wide notices",
          "Event promotions",
          "Emergency alerts"
        ]
      },
      {
        id: "communications",
        menuLabel: "Communications",
        icon: "💬",
        title: "Communications",
        items: [
          "Receive donor and CSR updates",
          "Review communication history by audience",
          "Track important partner announcements"
        ]
      },
      {
        id: "ngo-partnerships",
        menuLabel: "NGO Partnership",
        icon: "🤝",
        title: "NGO Partnership",
        items: [
          "View NGO partnership requests",
          "Review requests from NGOs",
          "Accept or decline requests",
          "Coordinate next steps with partners"
        ]
      },
      {
        id: "profile",
        menuLabel: "Profile",
        icon: "👤",
        title: "Profile",
        items: [
          "Faculty settings",
          "Department management"
        ]
      }
    ]
  },
  mentor: {
    label: "Alumni / Industry Mentor",
    workspaceLabel: "Mentor Dashboard",
    description: "Support mentees, host sessions, and share career opportunities.",
    sections: [
      {
        id: "mentor-home",
        menuLabel: "Mentor Home",
        icon: "🏠",
        title: "Mentor Home",
        items: [
          "Welcome back",
          "Mentorship stats",
          "Recent mentee activity"
        ]
      },
      {
        id: "my-mentees",
        menuLabel: "My Mentees",
        icon: "👥",
        title: "My Mentees",
        items: [
          "Current mentees list",
          "Pending requests",
          "Past mentees",
          "Quick message"
        ]
      },
      {
        id: "sessions",
        menuLabel: "Sessions",
        icon: "📅",
        title: "Sessions",
        items: [
          "Upcoming sessions",
          "Session scheduler",
          "Session history",
          "Feedback received"
        ]
      },
      {
        id: "messages",
        menuLabel: "Messages",
        icon: "💬",
        title: "Messages",
        items: [
          "Chat with mentees",
          "Group discussions",
          "Announcements"
        ]
      },
      {
        id: "career-insights",
        menuLabel: "Career Insights",
        icon: "💼",
        title: "Career Insights",
        items: [
          "Share industry trends",
          "Post job openings",
          "Company referrals"
        ]
      },
      {
        id: "webinars",
        menuLabel: "Webinars",
        icon: "🎤",
        title: "Webinars",
        items: [
          "Host career talks",
          "Upcoming sessions",
          "Recorded content"
        ]
      },
      {
        id: "impact-tracker",
        menuLabel: "Impact Tracker",
        icon: "📈",
        title: "Impact Tracker",
        items: [
          "Hours mentored",
          "Students helped",
          "Success stories"
        ]
      },
      {
        id: "profile",
        menuLabel: "Profile",
        icon: "👤",
        title: "Profile",
        items: [
          "Expertise areas",
          "Availability settings",
          "LinkedIn integration"
        ]
      }
    ]
  },
  donor: {
    label: "Donor / CSR Partner",
    workspaceLabel: "Donor & CSR Dashboard",
    description: "Track scholarships, donations, and measurable student impact.",
    sections: [
      {
        id: "partner-home",
        menuLabel: "Partner Home",
        icon: "🏠",
        title: "Partner Home",
        items: [
          "Impact summary",
          "Recent donations",
          "Student thank you messages"
        ]
      },
      {
        id: "my-scholarships",
        menuLabel: "My Scholarships",
        icon: "💰",
        title: "My Scholarships",
        items: [
          "Active scholarship listings",
          "Application review queue",
          "Selected recipients",
          "Disbursement tracking"
        ]
      },
      {
        id: "fund-transparency",
        menuLabel: "Fund Transparency",
        icon: "🔗",
        title: "Fund Transparency",
        items: [
          "See every payment recorded on the blockchain",
          "Track milestone-based releases to students",
          "Verify the audit trail yourself"
        ]
      },
      {
        id: "funded-students",
        menuLabel: "Funded Students",
        icon: "🎓",
        title: "Funded Students",
        items: [
          "Current scholars",
          "Academic progress",
          "Success stories"
        ]
      },
      {
        id: "donations",
        menuLabel: "Donations",
        icon: "🤝",
        title: "Donations",
        items: [
          "Emergency fund contributions",
          "Equipment donations",
          "Donation history",
          "Tax receipts"
        ]
      },
      {
        id: "impact-reports",
        menuLabel: "Impact Reports",
        icon: "📊",
        title: "Impact Reports",
        items: [
          "Scholarship impact metrics",
          "Student demographics",
          "ROI visualization",
          "Annual report generator"
        ]
      },
      {
        id: "recognition",
        menuLabel: "Recognition",
        icon: "🏆",
        title: "Recognition",
        items: [
          "Featured stories",
          "Student testimonials",
          "CSR branding opportunities"
        ]
      },
      {
        id: "communications",
        menuLabel: "Communications",
        icon: "💬",
        title: "Communications",
        items: [
          "Message recipients",
          "Interview requests",
          "Event invitations"
        ]
      },
      {
        id: "ngo-partnerships",
        menuLabel: "NGO Partnership",
        icon: "🤝",
        title: "NGO Partnership",
        items: [
          "View NGO collaboration requests",
          "Review opportunities from NGOs",
          "Approve partnership involvement",
          "Track partnership statuses"
        ]
      },
      {
        id: "profile",
        menuLabel: "Profile",
        icon: "👤",
        title: "Profile",
        items: [
          "Organization details",
          "Branding settings",
          "Team management"
        ]
      }
    ]
  },
  employer: {
    label: "Employer (Job Provider)",
    workspaceLabel: "Employer Dashboard",
    description: "Post opportunities, manage applicants, and connect with campuses.",
    sections: [
      {
        id: "employer-home",
        menuLabel: "Employer Home",
        icon: "🏠",
        title: "Employer Home",
        items: [
          "Job post stats",
          "Recent applicants",
          "Recommended talent"
        ]
      },
      {
        id: "job-listings",
        menuLabel: "Job Listings",
        icon: "📋",
        title: "Job Listings",
        items: [
          "Active jobs",
          "Drafts",
          "Expired listings",
          "Create new posting"
        ]
      },
      {
        id: "applicants",
        menuLabel: "Applicants",
        icon: "👥",
        title: "Applicants",
        items: [
          "New applications",
          "Shortlisted candidates",
          "Interview schedule",
          "Hired students"
        ]
      },
      {
        id: "talent-pool",
        menuLabel: "Talent Pool",
        icon: "⭐",
        title: "Talent Pool",
        items: [
          "Student profiles by skill",
          "Recommended matches",
          "Save for later"
        ]
      },
      {
        id: "interviews",
        menuLabel: "Interviews",
        icon: "📅",
        title: "Interviews",
        items: [
          "Scheduled interviews",
          "Calendar integration",
          "Feedback forms"
        ]
      },
      {
        id: "campus-connect",
        menuLabel: "Campus Connect",
        icon: "🏫",
        title: "Campus Connect",
        items: [
          "Upcoming career fairs",
          "Campus recruitment events",
          "Partner universities"
        ]
      },
      {
        id: "analytics",
        menuLabel: "Analytics",
        icon: "📊",
        title: "Analytics",
        items: [
          "Application trends",
          "Time-to-hire metrics",
          "Diversity stats"
        ]
      },
      {
        id: "profile",
        menuLabel: "Profile",
        icon: "👤",
        title: "Profile",
        items: [
          "Company profile",
          "Branding",
          "Team access management"
        ]
      }
    ]
  },
  ngo: {
    label: "NGO / Funding Organization",
    workspaceLabel: "NGO Dashboard",
    description: "Manage programs, disbursements, and beneficiary outcomes.",
    sections: [
      {
        id: "organization-home",
        menuLabel: "Organization Home",
        icon: "home",
        title: "Organization Home",
        items: [
          "Portfolio overview",
          "Core KPI metrics",
          "Recent impact stories"
        ]
      },
      {
        id: "programs",
        menuLabel: "Programs",
        icon: "programs",
        title: "Programs",
        items: [
          "Manage NGO support programs",
          "Create programs and eligibility rules",
          "Track application readiness"
        ]
      },
      {
        id: "funding",
        menuLabel: "Funding",
        icon: "funding",
        title: "Funding",
        items: [
          "Budget vs disbursed tracking",
          "Donor contribution table",
          "Allocation monitoring"
        ]
      },
      {
        id: "beneficiaries",
        menuLabel: "Beneficiaries",
        icon: "beneficiaries",
        title: "Beneficiaries",
        items: [
          "Verified applicant list",
          "Student support progress",
          "Program-specific filtering"
        ]
      },
      {
        id: "reports",
        menuLabel: "Reports",
        icon: "reports",
        title: "Reports",
        items: [
          "Generate impact reports",
          "Review KPI charts",
          "Export report PDF"
        ]
      },
      {
        id: "partnerships",
        menuLabel: "Partnerships",
        icon: "partnerships",
        title: "Partnerships",
        items: [
          "University admin collaborations",
          "Corporate donor partners",
          "Joint initiatives tracking"
        ]
      },
      {
        id: "ngo-partnerships",
        menuLabel: "NGO Partnership",
        icon: "partnerships",
        title: "NGO Partnership",
        items: [
          "Create NGO partnership requests",
          "Select Admin staff and Donor CSR recipients",
          "Track review and acceptance status",
          "Coordinate responses from partners"
        ]
      },
      {
        id: "communications",
        menuLabel: "Communications",
        icon: "communications",
        title: "Communications",
        items: [
          "Program updates to beneficiaries",
          "Impact newsletters to donors",
          "Message templates and history"
        ]
      },
      {
        id: "profile",
        menuLabel: "Profile",
        icon: "profile",
        title: "Profile",
        items: [
          "Organization details",
          "Focus areas",
          "Team management"
        ]
      }
    ]
  },
  parent: {
    label: "Parent / Guardian",
    workspaceLabel: "Parent Dashboard",
    description: "Stay informed about your child's progress and important updates.",
    sections: [
      {
        id: "parent-home",
        menuLabel: "Parent Home",
        icon: "🏠",
        title: "Parent Home",
        items: [
          "Child's activity summary",
          "Recent updates",
          "Important alerts"
        ]
      },
      {
        id: "my-student",
        menuLabel: "My Student",
        icon: "👨‍🎓",
        title: "My Student",
        items: [
          "Profile view",
          "Academic progress",
          "Financial aid status"
        ]
      },
      {
        id: "financial-overview",
        menuLabel: "Financial Overview",
        icon: "💰",
        title: "Financial Overview",
        items: [
          "Scholarship applications",
          "Aid received",
          "Pending documents"
        ]
      },
      {
        id: "important-dates",
        menuLabel: "Important Dates",
        icon: "📅",
        title: "Important Dates",
        items: [
          "Application deadlines",
          "Parent meetings",
          "University events"
        ]
      },
      {
        id: "communications",
        menuLabel: "Communications",
        icon: "💬",
        title: "Communications",
        items: [
          "Messages from university",
          "Counselor updates",
          "Mentor feedback"
        ]
      },
      {
        id: "resources",
        menuLabel: "Resources",
        icon: "📚",
        title: "Resources",
        items: [
          "Financial planning guides",
          "Scholarship tips",
          "Parent community"
        ]
      },
      {
        id: "alerts",
        menuLabel: "Alerts",
        icon: "⚠️",
        title: "Alerts",
        items: [
          "Missing documents",
          "Urgent notifications"
        ]
      },
      {
        id: "profile",
        menuLabel: "Profile",
        icon: "👤",
        title: "Profile",
        items: [
          "Contact details",
          "Linked students",
          "Notification preferences"
        ]
      }
    ]
  }
};

const AUTH_ROLE_TO_DASHBOARD_ROLE: Record<UserRole, DashboardRole> = {
  student: "student",
  mentor: "mentor",
  donor: "donor",
  admin: "admin",
  faculty: "faculty",
  super_admin: "admin",
  employer: "employer",
  ngo: "ngo",
  parent: "parent"
};

export function resolveDashboardRole(role?: UserRole | null): DashboardRole {
  if (!role) {
    return "student";
  }
  return AUTH_ROLE_TO_DASHBOARD_ROLE[role] ?? "student";
}
