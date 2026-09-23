import subprocess

from scripts.check_publication import audit


def test_ignored_private_files_are_excluded_but_tracked_secrets_are_not(tmp_path):
    subprocess.run(["git", "init", "--quiet", str(tmp_path)], check=True)
    (tmp_path / ".gitignore").write_text(".env\nprivate/\n")
    (tmp_path / ".env").write_text("PRIVATE=not-for-publication")
    (tmp_path / "private").mkdir()
    (tmp_path / "private" / "upload.csv").write_text("private data")
    (tmp_path / "README.md").write_text("Public documentation")
    assert audit(tmp_path)["issues"] == []
    assert audit(tmp_path)["files"] == 2
    subprocess.run(["git", "-C", str(tmp_path), "add", "--force", ".env"], check=True)
    assert audit(tmp_path)["issues"] == [{"path": ".env", "reason": "private file or symlink in publication"}]


def test_publication_reports_location_without_echoing_credentials(tmp_path):
    secret = "ghp_" + "x" * 36
    (tmp_path / "config.txt").write_text("header\n" + secret)
    report = audit(tmp_path)
    assert report["issues"] == [{"path": "config.txt", "line": 2, "reason": "provider token"}]
    assert secret not in str(report)
