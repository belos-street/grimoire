from __future__ import annotations

import os

from grimoire.skill import get_all_skills, get_skill_by_name, get_skills_dir
from tests.helpers import write_skill


def test_reads_lowercase_skill_md_and_counts_references(tmp_path, monkeypatch):
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir()
    write_skill(
        skills_dir,
        "alpha",
        entry_file="skill.md",
        references={"one.md": "# One", "two.md": "# Two"},
    )
    monkeypatch.setenv("GRIMOIRE_HOME", str(skills_dir))

    skills = get_all_skills()

    assert len(skills) == 1
    assert skills[0].name == "alpha"
    assert skills[0].entry_file == "skill.md"
    assert skills[0].reference_count == 2
    assert "unit tests" in skills[0].description


def test_reads_uppercase_skill_md_and_multiline_descriptions(
    tmp_path, monkeypatch
):
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir()
    skill_dir = skills_dir / "beta"
    (skill_dir / "references").mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text(
        "\n".join(
            [
                "---",
                "name: beta",
                "description:",
                "  A multiline description that should be joined",
                "  into a single string for agent discovery.",
                "---",
                "# Beta",
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("GRIMOIRE_HOME", str(skills_dir))

    skills = get_all_skills()

    assert skills[0].entry_file == "SKILL.md"
    assert skills[0].description == (
        "A multiline description that should be joined "
        "into a single string for agent discovery."
    )


def test_counts_rules_directories_used_by_third_party_skills(
    tmp_path, monkeypatch
):
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir()
    write_skill(
        skills_dir,
        "gamma",
        reference_dir="rules",
        references={"rule.md": "# Rule"},
    )
    monkeypatch.setenv("GRIMOIRE_HOME", str(skills_dir))

    assert get_all_skills()[0].reference_count == 1


def test_sorts_skills_and_finds_one_by_name(tmp_path, monkeypatch):
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir()
    write_skill(skills_dir, "zeta")
    write_skill(skills_dir, "alpha")
    monkeypatch.setenv("GRIMOIRE_HOME", str(skills_dir))

    skills = get_all_skills()

    assert [skill.name for skill in skills] == ["alpha", "zeta"]
    assert get_skill_by_name("zeta").name == "zeta"
    assert get_skill_by_name("missing") is None


def test_honors_grimoire_home(tmp_path, monkeypatch):
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir()
    monkeypatch.setenv("GRIMOIRE_HOME", str(skills_dir))

    assert get_skills_dir() == skills_dir


def test_parses_crlf_frontmatter(tmp_path, monkeypatch):
    skills_dir = tmp_path / "skills"
    skill_dir = skills_dir / "windows"
    (skill_dir / "references").mkdir(parents=True)
    (skill_dir / "SKILL.md").write_bytes(
        b"---\r\n"
        b"name: windows\r\n"
        b"description: A CRLF skill long enough for the lint length check.\r\n"
        b"---\r\n"
        b"# Windows\r\n"
    )
    monkeypatch.setenv("GRIMOIRE_HOME", str(skills_dir))

    [skill] = get_all_skills()

    assert skill.frontmatter["name"] == "windows"
    assert skill.description.startswith("A CRLF skill")


def test_lists_symlinked_skill_directories(tmp_path, monkeypatch):
    real_skill = write_skill(tmp_path / "external", "alpha")
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir()
    os.symlink(real_skill, skills_dir / "alpha", target_is_directory=True)
    monkeypatch.setenv("GRIMOIRE_HOME", str(skills_dir))

    skills = get_all_skills()

    assert [skill.name for skill in skills] == ["alpha"]
    assert skills[0].reference_count == 1
