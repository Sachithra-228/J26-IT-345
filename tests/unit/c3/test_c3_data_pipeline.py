"""C3 Phase 1 tests: taxonomy, PII stripping, skill extraction, ad parsing, generators.

Run: python -m pytest tests/unit/c3 -q
"""
import copy

import pytest

import c3_common as C
from ad_parser import classify_role, cue_level, experience_years, parse_ad, split_segments
from clean_ads import clean_records
from pii import strip_pii
from skill_extractor import SkillExtractor, tokenize
from synthetic_ads import generate_corpus
from synthetic_students import generate_students


@pytest.fixture(scope="module")
def taxonomy():
    return C.load_taxonomy()


@pytest.fixture(scope="module")
def extractor(taxonomy):
    return SkillExtractor(taxonomy)


@pytest.fixture(scope="module")
def roles():
    return C.load_roles()


# ---------------------------------------------------------------- taxonomy
def test_taxonomy_has_about_25_competencies_with_three_languages(taxonomy):
    assert 24 <= len(taxonomy["skills"]) <= 30
    assert [lv["level"] for lv in taxonomy["levels"]] == [0, 1, 2, 3]
    for s in taxonomy["skills"]:
        assert s["label"]["en"] and s["label"]["si"] and s["label"]["ta"]
        assert s["synonyms"]


def test_taxonomy_validation_rejects_shared_synonyms(taxonomy):
    broken = copy.deepcopy(taxonomy)
    broken["skills"][1]["synonyms"].append(broken["skills"][0]["synonyms"][0])
    with pytest.raises(ValueError, match="used by both"):
        C.validate_taxonomy(broken)


def test_taxonomy_validation_rejects_unknown_area(taxonomy):
    broken = copy.deepcopy(taxonomy)
    broken["skills"][0]["area"] = "nope"
    with pytest.raises(ValueError, match="unknown area"):
        C.validate_taxonomy(broken)


# ---------------------------------------------------------------- PII
@pytest.mark.parametrize(
    "text,kind,secret",
    [
        ("mail me at kamal.perera@gmail.com today", "email", "kamal.perera"),
        ("call 077 123 4567", "phone", "123 4567"),
        ("call +94 71-234-5678", "phone", "234-5678"),
        ("NIC 199912345678 issued", "nic", "199912345678"),
        ("old NIC 991234567V", "nic", "991234567V"),
        ("see https://linkedin.com/in/someone", "url", "someone"),
        ("Address: 12 Temple Road, Maharagama", "labelled", "Temple"),
        ("I live at No. 45/2, Galle Road, Colombo 03", "address", "Galle Road"),
        ("Date of birth: 2001-04-05", "labelled", "2001-04-05"),
    ],
)
def test_strip_pii_removes_identifiers(text, kind, secret):
    out, counts = strip_pii(text)
    assert counts[kind] >= 1, (out, counts)
    assert secret not in out


def test_strip_pii_keeps_skill_lines_and_years():
    out, counts = strip_pii("Mobile: Flutter, Kotlin\n3+ years of experience with Java\nGPA 3.45")
    assert "Flutter" in out and "3+ years" in out and "3.45" in out
    assert sum(counts.values()) == 0


# ---------------------------------------------------------------- extractor
def test_tokenizer_keeps_tech_tokens():
    assert tokenize("Node.js, C#, .NET Core and CI/CD.") == ["node.js", "c#", ".net", "core", "and", "ci", "cd"]


def test_exact_and_longest_match_first(extractor):
    ids = extractor.extract("Built apps with React Native and Spring Boot").skill_ids
    assert "mobile" in ids and "backend_api" in ids
    assert "frontend" not in ids  # "react" was consumed by "react native"


def test_fuzzy_match_recovers_typos(extractor):
    ext = extractor.extract("Experience with Kubernets and Postgressql")
    assert {"containers", "databases_sql"} <= set(ext.skill_ids)
    assert all(m.method == "fuzzy" for ms in ext.skills.values() for m in ms)


def test_short_terms_are_exact_only(extractor):
    assert "test_automation" not in extractor.extract("manual testing of web apps").skill_ids  # not "testng"
    assert "prog_oop" not in extractor.extract("javascript developer").skill_ids  # not "java"


def test_pii_is_removed_before_extraction(extractor):
    ext = extractor.extract("Contact python.dev@example.com or 0771234567. Skills: SQL")
    assert ext.skill_ids == ["databases_sql"]
    assert ext.redactions["email"] == 1 and ext.redactions["phone"] == 1


# ---------------------------------------------------------------- ad parser
def test_level_cues_longest_phrase_wins():
    assert cue_level("Strong knowledge of Java") == 3
    assert cue_level("Hands-on experience with Docker") == 2
    assert cue_level("Basic understanding of SQL") == 1
    assert cue_level("Java, Spring Boot") is None


def test_skill_bullets_are_not_headings():
    segs = split_segments("Requirements:\n- Skills: PRINCE2.\nNice to have:\n- Docker")
    assert segs == [("Skills: PRINCE2.", False), ("Docker", True)]


def test_role_classification(roles):
    assert classify_role("Senior Software Engineer", roles) == "software_engineer"
    assert classify_role("Associate QA Engineer", roles) == "qa_engineer"
    assert classify_role("Graduate Trainee - Technology", roles) is None


def test_experience_years():
    assert experience_years("- 2+ years of industry experience.") == 2
    assert experience_years("Experience: 1-3 years in support") == 1
    assert experience_years("Salary: 150000") is None


def test_parse_ad_levels_preferred_and_defaults(extractor, roles):
    text = "Requirements:\n- Strong knowledge of Java.\n- SQL\nNice to have:\n- Exposure to Docker."
    parsed = parse_ad("Associate Software Engineer", text, extractor, roles)
    by_id = {s.skill_id: s for s in parsed["skills"]}
    assert by_id["prog_oop"].required_level == 3 and by_id["prog_oop"].level_source == "cue"
    assert by_id["databases_sql"].required_level == 2 and by_id["databases_sql"].level_source == "seniority"
    assert by_id["containers"].preferred and by_id["containers"].required_level == 1


def test_handwritten_sample_skills_are_all_found(extractor, roles):
    for ad in C.read_jsonl(C.SYNTHETIC_DIR / "job_ads_handwritten.jsonl"):
        parsed = parse_ad(ad["title"], ad["text"], extractor, roles)
        found = {s.skill_id for s in parsed["skills"]}
        assert found == set(ad["truth"]["skills"]), ad["ad_id"]


# ---------------------------------------------------------------- generators and cleaning
def test_generators_are_deterministic(roles):
    a = generate_corpus(roles, 42, n_per_role=3)
    b = generate_corpus(roles, 42, n_per_role=3)
    assert a == b
    s1, g1 = generate_students(C.skill_ids(), 42, n=50)
    s2, g2 = generate_students(C.skill_ids(), 42, n=50)
    assert s1.equals(s2) and g1 == g2


def test_synthetic_students_are_labelled_and_in_range():
    students, gaps = generate_students(C.skill_ids(), 42, n=200)
    lvl = students[[c for c in students.columns if c.startswith("lvl_")]].to_numpy()
    rel = students[[c for c in students.columns if c.startswith("rel_")]].to_numpy()
    assert lvl.min() >= 0 and lvl.max() <= 3 and rel.min() >= 0 and rel.max() <= 3
    assert set(gaps) == set(students["student_id"])


def test_clean_records_dedupes_and_never_reads_truth(extractor, roles):
    ads = generate_corpus(roles, 42, n_per_role=1)
    raw = [{k: v for k, v in a.items() if k != "truth"} for a in ads]
    out, stats = clean_records(raw + raw[:2], extractor, roles, "synthetic")
    assert stats["duplicates"] == 2 and len(out) == len(ads)
    assert all("@" not in a.text_redacted for a in out)
