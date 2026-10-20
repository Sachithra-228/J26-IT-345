"""
C4 mentor-matching vocabulary: the skills, interests, languages and time slots that
students and mentors describe themselves with.

PROVISIONAL: drafted by the research team for the first increment. The skill list and
labels must be reviewed with SLIIT mentors / faculty before the final evaluation.
"""
from __future__ import annotations

SKILLS: list[tuple[str, str]] = [
    ("programming_fundamentals", "Programming fundamentals"),
    ("web_frontend", "Web front-end"),
    ("web_backend", "Web back-end and APIs"),
    ("mobile_dev", "Mobile development"),
    ("databases", "Databases"),
    ("data_analysis", "Data analysis"),
    ("machine_learning", "Machine learning"),
    ("cloud_devops", "Cloud and DevOps"),
    ("networking", "Networking"),
    ("cybersecurity", "Cybersecurity"),
    ("software_testing", "Software testing / QA"),
    ("ui_ux", "UI / UX design"),
    ("project_management", "Project management"),
    ("research_writing", "Research and academic writing"),
    ("interview_prep", "Interview preparation"),
    ("communication", "Communication and presentation"),
]

INTERESTS: list[tuple[str, str]] = [
    ("startups", "Startups"),
    ("research", "Research"),
    ("industry_internships", "Industry internships"),
    ("competitions", "Hackathons and competitions"),
    ("open_source", "Open source"),
    ("higher_studies", "Higher studies abroad"),
    ("freelancing", "Freelancing"),
    ("volunteering", "Community volunteering"),
    ("entrepreneurship", "Entrepreneurship"),
    ("teaching", "Teaching and tutoring"),
]

LANGUAGES: list[tuple[str, str]] = [("en", "English"), ("si", "Sinhala"), ("ta", "Tamil")]

SLOTS: list[tuple[str, str]] = [
    ("weekday_morning", "Weekday mornings"),
    ("weekday_afternoon", "Weekday afternoons"),
    ("weekday_evening", "Weekday evenings"),
    ("saturday", "Saturdays"),
    ("sunday", "Sundays"),
]

SKILL_IDS = [s for s, _ in SKILLS]
INTEREST_IDS = [s for s, _ in INTERESTS]
LANGUAGE_IDS = [s for s, _ in LANGUAGES]
SLOT_IDS = [s for s, _ in SLOTS]

MAX_SKILL_LEVEL = 3
