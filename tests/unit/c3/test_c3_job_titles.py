"""C3 "search job sites for" titles from the job-ads sheet. All rows are FICTIONAL.

Run: python -m pytest tests/unit/c3 -q
"""
import json

import pytest

from job_titles import TOP_TITLES, normalise_title, title_counts


@pytest.mark.parametrize(
    "title, company, expected",
    [
        ("Intern – Quality Assurance (QA)", "", "Quality Assurance"),
        ("Intern � Quality Assurance (QA)", "", "Quality Assurance"),  # a dash broken by copy-paste
        ("Associate Software Engineer/ Software Engineer - C++", "", "Software Engineer"),
        ("Python Developer - Intern", "", "Python Developer"),
        ("Intern, Cloud Engineer", "", "Cloud Engineer"),
        ("Intern -- Software Engineer", "", "Software Engineer"),
        ("Project Management Intern-Jaffna", "", "Project Management"),
        ("Engineering Intern - Business Analyst", "", "Business Analyst"),
        ("Senior QA Engineer/ QA Engineer", "", "QA Engineer"),
        ("Associate Front-End Engineer – React.js/Next.js", "", "Front-End Engineer"),
        ("UI/UX Design Intern", "", "UI/UX Design"),
        ("Software Engineering Internship 2026 (Remote)", "", "Software Engineering"),
        ("Fictional Labs Graduate Data Analyst", "Fictional Labs", "Data Analyst"),
        ("Intern IT", "", None),
        ("Senior Engineer", "", None),
    ],
)
def test_titles_are_cleaned_to_a_searchable_name(title, company, expected):
    assert normalise_title(title, company) == expected


def row(job_id, title, company="Fictional Co"):
    return {"Job_ID": job_id, "Job_Title": title, "Company": company}


def lab(job_id, role):
    return {"ad_id": job_id, "role_id": role}


def test_titles_are_counted_per_role_with_variants_grouped():
    rows = [
        row("JOB001", "Associate Software Engineer"),
        row("JOB002", "Software Engineer Intern"),
        row("JOB003", "Software Engineers - Intern"),
        row("JOB004", "Java Developer"),
        row("JOB005", "Intern IT"),  # nothing searchable left
        row("JOB006", "Business Development Intern", "Fictional Sales"),  # an "other" ad
        row("JOB007", "Quality Assurance Intern"),
    ]
    labels = [lab("JOB001", "software_engineer"), lab("JOB002", "software_engineer"), lab("JOB003", "software_engineer"),
              lab("JOB004", "software_engineer"), lab("JOB005", "software_engineer"), lab("JOB006", None),
              lab("JOB007", "qa_engineer")]
    data = title_counts(rows, labels)
    se = data["roles"]["software_engineer"]
    assert se["ads"] == 5
    assert se["titles"] == [{"title": "Software Engineer", "ads": 3}, {"title": "Java Developer", "ads": 1}]
    assert data["roles"]["qa_engineer"]["titles"] == [{"title": "Quality Assurance", "ads": 1}]
    assert data["roles"]["mobile_developer"] == {"ads": 0, "titles": []}
    assert data["adsUsed"] == 6 and data["titlesWithoutSearchableName"] == 1
    text = json.dumps(data)
    assert "Fictional" not in text and "JOB0" not in text and "Business Development" not in text


def test_at_most_the_top_titles_are_kept():
    rows = [row(f"JOB{i:03d}", f"Role{i} Developer") for i in range(1, 11)] + [row("JOB011", "Role1 Developer")]
    labels = [lab(r["Job_ID"], "software_engineer") for r in rows]
    titles = title_counts(rows, labels)["roles"]["software_engineer"]["titles"]
    assert len(titles) == TOP_TITLES
    assert titles[0] == {"title": "Role1 Developer", "ads": 2}
