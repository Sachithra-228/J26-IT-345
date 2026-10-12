"use client";

import { StudentHome } from "./student-home";
import { StudentFinancialAid } from "./student-financial-aid";
import { StudentCareer } from "./student-career";
import { StudentMentorship } from "./student-mentorship";
import { StudentWellness } from "./student-wellness";
import { StudentCampusLife } from "./student-campus-life";
import { StudentMyApplications } from "./student-my-applications";
import { StudentCommunications } from "./student-communications";
import { StudentProfile } from "./student-profile";
import { StudentAidMatching } from "./student-aid-matching";
import { CareerGuidanceSection } from "@/components/c3/career-guidance-section";

const STUDENT_SECTIONS: Record<
  string,
  React.ComponentType
> = {
  home: StudentHome,
  "financial-aid": StudentFinancialAid,
  "aid-matching": StudentAidMatching,
  career: StudentCareer,
  "career-guidance": CareerGuidanceSection,
  mentorship: StudentMentorship,
  wellness: StudentWellness,
  "campus-life": StudentCampusLife,
  "my-applications": StudentMyApplications,
  communications: StudentCommunications,
  profile: StudentProfile
};

type StudentSectionContentProps = {
  sectionId: string;
};

export function StudentSectionContent({ sectionId }: StudentSectionContentProps) {
  const Section = STUDENT_SECTIONS[sectionId];
  if (!Section) return null;
  return <Section />;
}
