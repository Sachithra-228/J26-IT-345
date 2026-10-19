/**
 * C3 - FICTIONAL sample IT jobs for "Jobs that fit you".
 *
 * Shown only when fewer than three real jobs from the platform job board fit, always
 * under a "Sample jobs (demo)" heading with a demo badge. Every company, email and job
 * here is made up (example.com addresses); none is a real advertisement.
 */
import type { JobListing } from "@/types";

const DEADLINE = "2099-12-31";

export const DEMO_IT_JOBS: JobListing[] = [
  {
    _id: "c3-demo-qa",
    title: "QA Engineer Intern",
    company: "Demo Tech (Pvt) Ltd",
    location: "Colombo (sample)",
    salary: "Sample only",
    type: "internship",
    requirements: ["Manual testing and writing test cases", "Test automation with Selenium", "Basic SQL", "Agile / Scrum", "Good communication skills"],
    applicationDeadline: DEADLINE,
    contactEmail: "jobs@example.com"
  },
  {
    _id: "c3-demo-se",
    title: "Associate Software Engineer",
    company: "Demo Software Labs (Pvt) Ltd",
    location: "Colombo (sample)",
    salary: "Sample only",
    type: "full-time",
    requirements: ["Java or C# (OOP)", "Data structures and problem solving", "REST APIs", "SQL databases", "Git"],
    applicationDeadline: DEADLINE,
    contactEmail: "careers@example.com"
  },
  {
    _id: "c3-demo-fe",
    title: "Front-end Developer Intern",
    company: "Demo Web Studio (Pvt) Ltd",
    location: "Remote (sample)",
    salary: "Sample only",
    type: "internship",
    requirements: ["HTML, CSS and JavaScript", "React", "TypeScript", "Git", "UI/UX awareness"],
    applicationDeadline: DEADLINE,
    contactEmail: "web@example.com"
  },
  {
    _id: "c3-demo-da",
    title: "Data Analyst Intern",
    company: "Demo Analytics (Pvt) Ltd",
    location: "Colombo (sample)",
    salary: "Sample only",
    type: "internship",
    requirements: ["SQL", "Data analysis and visualisation with Power BI", "Python", "Statistics", "Communication skills"],
    applicationDeadline: DEADLINE,
    contactEmail: "data@example.com"
  },
  {
    _id: "c3-demo-ba",
    title: "Associate Business Analyst",
    company: "Demo Consulting (Pvt) Ltd",
    location: "Colombo (sample)",
    salary: "Sample only",
    type: "full-time",
    requirements: ["Business analysis and requirements gathering", "Agile / Scrum", "SQL", "Communication skills", "Project management basics"],
    applicationDeadline: DEADLINE,
    contactEmail: "ba@example.com"
  },
  {
    _id: "c3-demo-net",
    title: "Network Engineer Intern",
    company: "Demo Networks (Pvt) Ltd",
    location: "Kandy (sample)",
    salary: "Sample only",
    type: "internship",
    requirements: ["Computer networking (CCNA level)", "Linux", "Cybersecurity basics", "Cloud (AWS or Azure)"],
    applicationDeadline: DEADLINE,
    contactEmail: "network@example.com"
  },
  {
    _id: "c3-demo-ux",
    title: "UI/UX Designer Intern",
    company: "Demo Design Co. (Pvt) Ltd",
    location: "Remote (sample)",
    salary: "Sample only",
    type: "internship",
    requirements: ["UI/UX design with Figma", "Wireframing and prototyping", "Front-end basics (HTML, CSS)", "Communication skills"],
    applicationDeadline: DEADLINE,
    contactEmail: "design@example.com"
  },
  {
    _id: "c3-demo-devops",
    title: "Associate DevOps Engineer",
    company: "Demo Cloud Services (Pvt) Ltd",
    location: "Colombo (sample)",
    salary: "Sample only",
    type: "full-time",
    requirements: ["CI/CD with Jenkins or GitHub Actions", "Docker and Kubernetes", "AWS", "Linux and shell scripting", "Git"],
    applicationDeadline: DEADLINE,
    contactEmail: "devops@example.com"
  }
];
