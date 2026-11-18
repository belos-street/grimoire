from __future__ import annotations

from grimoire.lint import lint_skills
from tests.helpers import write_skill


def set_skills_home(tmp_path, monkeypatch):
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir(parents=True)
    monkeypatch.setenv("GRIMOIRE_HOME", str(skills_dir))
    return skills_dir


def find_result(results, name):
    result = next((item for item in results if item.name == name), None)
    assert result is not None
    return result


def test_accepts_a_well_formed_skill(tmp_path, monkeypatch):
    skills_dir = set_skills_home(tmp_path, monkeypatch)
    write_skill(
        skills_dir,
        "good",
        body="See [topic](references/topic.md).",
        references={"topic.md": "# Topic"},
    )

    [result] = lint_skills(["good"])

    assert result.errors == []
    assert result.warnings == []


def test_reports_name_mismatch_missing_description_and_bad_links(
    tmp_path, monkeypatch
):
    skills_dir = set_skills_home(tmp_path, monkeypatch)
    skill_dir = skills_dir / "bad"
    skill_dir.mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text(
        "\n".join(
            [
                "---",
                "name: wrong-name",
                "---",
                "# Bad",
                "See [missing](references/missing.md).",
            ]
        ),
        encoding="utf-8",
    )

    [result] = lint_skills(["bad"])

    assert 'frontmatter name "wrong-name" 与目录名不一致' in result.errors
    assert "frontmatter 缺少 description" in result.errors
    assert "缺少 references/（或 reference/、rules/）目录" in result.warnings
    assert "链接失效: references/missing.md" in result.warnings


def test_accepts_nested_skills_as_an_alternative_to_references(
    tmp_path, monkeypatch
):
    skills_dir = set_skills_home(tmp_path, monkeypatch)
    skill_dir = skills_dir / "shell"
    (skill_dir / "child").mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text(
        "\n".join(
            [
                "---",
                "name: shell",
                "description: A shell skill containing nested skills for testing.",
                "---",
                "# Shell",
            ]
        ),
        encoding="utf-8",
    )
    (skill_dir / "child" / "SKILL.md").write_text(
        "---\nname: child\ndescription: Child skill.\n---\n",
        encoding="utf-8",
    )

    [result] = lint_skills(["shell"])

    assert "缺少 references/（或 reference/、rules/）目录" not in result.warnings


def test_reports_unknown_skill_names(tmp_path, monkeypatch):
    set_skills_home(tmp_path, monkeypatch)

    [result] = lint_skills(["missing"])

    assert 'Skill "missing" 不存在' in result.errors


def test_lints_all_skills_when_no_names_are_given(tmp_path, monkeypatch):
    skills_dir = set_skills_home(tmp_path, monkeypatch)
    write_skill(skills_dir, "alpha")
    write_skill(skills_dir, "beta")

    results = lint_skills()

    assert [result.name for result in results] == ["alpha", "beta"]
    assert find_result(results, "beta").errors == []
