"""Exercise production Next.js -> HTTP proxy -> live FastAPI on local ports.

Requires `npm run build` first. Starts and tears down only its own child processes.
Uses the delivered analysis with FRP_DATA_DIR pointing to an empty directory: the
release must work without provider downloads, credentials or a private warehouse.
"""

from __future__ import annotations

import json
import argparse
import io
import math
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests
from openpyxl import Workbook

from core.pipeline.config import ROOT


def wait_for(url: str, process: subprocess.Popen, session: requests.Session):
    deadline = time.monotonic() + 35
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Server exited with {process.returncode}")
        try:
            if session.get(url, timeout=1).status_code == 200:
                return
        except requests.RequestException:
            pass
        time.sleep(0.1)
    raise TimeoutError(f"Server startup timed out: {url}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--standalone", action="store_true", help="Verify the same Node entrypoint as the container"
    )
    args = parser.parse_args()
    checks = []
    processes = []
    web = ROOT / "apps/web"
    if not (web / ".next/BUILD_ID").exists():
        raise RuntimeError("Run npm run build in apps/web first")
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required")
    session = requests.Session()
    session.trust_env = False  # Loopback requests do not use external HTTP proxies.
    with tempfile.TemporaryDirectory(prefix="frp-stack-") as temp:
        environment = {
            **os.environ,
            "FRP_DATA_DIR": temp,
            "FRP_API_URL": "http://127.0.0.1:8765",
            "NEXT_TELEMETRY_DISABLED": "1",
            "PORT": "8766",
            "HOSTNAME": "127.0.0.1",
        }
        try:
            api = subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "uvicorn",
                    "apps.api.app.main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "8765",
                ],
                cwd=ROOT,
                env=environment,
                stdout=subprocess.DEVNULL,
            )
            processes.append(api)
            wait_for("http://127.0.0.1:8765/health", api, session)
            readiness = session.get("http://127.0.0.1:8765/ready", timeout=10)
            assert readiness.status_code == 200 and readiness.json()["players"] == 493
            next_command = [
                node,
                str(web / "node_modules/next/dist/bin/next"),
                "start",
                "--hostname",
                "127.0.0.1",
                "--port",
                "8766",
            ]
            if args.standalone:
                output = web / ".next/standalone/apps/web"
                shutil.copytree(web / "public", output / "public", dirs_exist_ok=True)
                shutil.copytree(web / ".next/static", output / ".next/static", dirs_exist_ok=True)
                next_command = [node, str(output / "server.js")]
            nextjs = subprocess.Popen(
                next_command,
                cwd=web,
                env=environment,
                stdout=subprocess.DEVNULL,
            )
            processes.append(nextjs)
            base = "http://127.0.0.1:8766"
            wait_for(base, nextjs, session)
            checks.append("Production HTML serves successfully")
            page = session.get(base, timeout=10)
            assert page.headers["X-Content-Type-Options"] == "nosniff"
            assert page.headers["X-Frame-Options"] == "DENY"
            assert "X-Powered-By" not in page.headers
            assert (
                session.post(
                    base + "/api/football/players/search",
                    json={},
                    headers={"Origin": "https://unrelated.example"},
                    timeout=10,
                ).status_code
                == 403
            )
            assert (
                session.post(
                    base + "/api/football/players/search", json={}, headers={"Origin": "null"}, timeout=10
                ).status_code
                == 403
            )
            same_origin = session.post(
                base + "/api/football/players/search", json={}, headers={"Origin": base}, timeout=10
            )
            assert same_origin.status_code == 200 and same_origin.headers["Cache-Control"] == "no-store"
            checks.append("Validated dataset readiness, security headers and same-origin POST boundary")
            result = session.get(base + "/api/football/data/catalog", timeout=10)
            result.raise_for_status()
            catalog = result.json()
            assert catalog["mode"] == "bundled_analysis" and len(catalog["players"]) == 493
            dataset_id = catalog["coverage"]["dataset_id"]
            checks.append("Next proxy calls live FastAPI and serves 493 real players without private data")
            search = session.get(
                base + "/api/football/players", params={"q": "fabian", "limit": 1}, timeout=10
            )
            search.raise_for_status()
            assert search.json()["results"][0]["display_name"] == "Fabián Ruiz"
            checks.append("Real accent-insensitive search through Next proxy")
            profile = session.get(
                base + "/api/football/players/statsbomb:player:316046/profile", timeout=10
            ).json()
            assert (
                profile["lineage"]["dataset_id"] == dataset_id and profile["player"]["totals"]["goals"] == 1
            )
            assert profile["cohort"]["size"] == 30 and profile["fit_score"] is None
            related = session.get(
                base + "/api/football/players/statsbomb:player:316046/similar", timeout=10
            ).json()
            assert len(related["results"]) == 8 and related["results"][0]["components"]
            checks.append("Real profile, cohort, evidence and explained similarity through Next proxy")
            brief = {
                "role_name": "Custom tested brief",
                "position_groups": ["CM"],
                "min_minutes": 180,
                "requirements": [
                    {"metric": "progressive_passes_per90", "weight": 3, "minimum": 10000},
                    {"metric": "xa_per90", "weight": 1},
                ],
            }
            ranked = session.post(base + "/api/football/recruitment/fit", json=brief, timeout=10)
            ranked.raise_for_status()
            assert ranked.json()["results"] and all(not p["eligible"] for p in ranked.json()["results"])
            checks.append("Editable weighted brief and hard exclusion constraints through Next proxy")
            advanced = session.post(
                base + "/api/football/players/search",
                json={"position": "W", "min_confidence": 40, "percentile_floors": {"npxg_per90": 75}},
                timeout=10,
            )
            advanced.raise_for_status()
            assert any(p["player_id"] == "statsbomb:player:316046" for p in advanced.json()["results"])
            assert (
                session.post(
                    base + "/api/football/players/search", json={"min_minutes": 20000}, timeout=10
                ).json()["total"]
                == 0
            )
            maps = session.get(
                base + "/api/football/players/statsbomb:player:316046/visuals", timeout=10
            ).json()
            assert maps["maps"]["shots"]["events"] == 18 and len(maps["matches"]) == 7
            checks.append(
                "Fixed-cohort advanced search, extreme empty search and contextualised spatial summaries"
            )
            # Invented parser fixtures are confined to this smoke test, never the player catalog.
            content = "name,position,minutes,goals,shots\nInvented HTTP fixture,ST,45,1,2\nIncomplete fixture,W,0,,\n".encode()
            preview = session.post(
                base + "/api/football/my-club/preview?filename=fixture.csv",
                data=content,
                headers={"Content-Type": "application/octet-stream"},
                timeout=10,
            )
            preview.raise_for_status()
            parsed = preview.json()
            payload = {
                "headers": parsed["headers"],
                "rows": parsed["rows"],
                "source_rows": parsed["source_rows"],
                "mapping": parsed["suggested_mapping"],
            }
            club = session.post(base + "/api/football/my-club/analyze", json=payload, timeout=10)
            club.raise_for_status()
            assert club.json()["players"][0]["metrics"]["goals_per90"] == 2
            assert club.json()["players"][1]["metrics"]["goals_per90"] is None
            assert all(p["confidence"] is None for p in club.json()["players"])
            book = Workbook()
            book.active.append(["name", "position", "minutes", "goals"])
            book.active.append(["Invented XLSX fixture", "ST", 90, "=1+1"])
            output = io.BytesIO()
            book.save(output)
            xlsx = session.post(
                base + "/api/football/my-club/preview?filename=fixture.xlsx",
                data=output.getvalue(),
                timeout=10,
            )
            xlsx.raise_for_status()
            assert xlsx.json()["rows"][0][-1] is None and xlsx.json()["warnings"]
            parsed_xlsx = xlsx.json()
            xlsx_club = session.post(
                base + "/api/football/my-club/analyze",
                json={
                    "headers": parsed_xlsx["headers"],
                    "rows": parsed_xlsx["rows"],
                    "source_rows": parsed_xlsx["source_rows"],
                    "mapping": parsed_xlsx["suggested_mapping"],
                },
                timeout=10,
            )
            xlsx_club.raise_for_status()
            assert xlsx_club.json()["players"][0]["metrics"]["goals_per90"] is None
            assert xlsx_club.json()["data_coverage"] == 0
            source = profile["player"]
            canonical_fields = [
                "player_name",
                "player_id",
                "dataset_id",
                "position_group",
                "minutes",
                "shots",
            ]
            canonical_payload = {
                "headers": canonical_fields,
                "mapping": {key: key for key in canonical_fields},
                "rows": [
                    [
                        source["display_name"],
                        source["player_id"],
                        dataset_id,
                        source["position_group"],
                        str(source["minutes"]),
                        str(source["totals"]["shots"]),
                    ]
                ],
            }
            canonical_club = session.post(
                base + "/api/football/my-club/analyze", json=canonical_payload, timeout=10
            )
            canonical_club.raise_for_status()
            verified = canonical_club.json()["players"][0]
            assert verified["benchmark"]["reference_player_id"] == source["player_id"]
            shot_reference = next(m for m in profile["metrics"] if m["key"] == "shots_per90")
            expected_partial_confidence = (
                100
                * min(source["minutes"] / 900, 1)
                * min(shot_reference["cohort_observations"] / 30, 1)
                / len(profile["metrics"])
            )
            assert math.isclose(verified["confidence"], expected_partial_confidence, abs_tol=1e-9)
            assert math.isclose(verified["data_coverage"], 100 / len(profile["metrics"]), abs_tol=1e-9)
            duplicate_payload = {**canonical_payload, "rows": canonical_payload["rows"] * 2}
            duplicate_club = session.post(
                base + "/api/football/my-club/analyze", json=duplicate_payload, timeout=10
            )
            duplicate_club.raise_for_status()
            assert all(
                p["benchmark"] is None
                and p["confidence"] is None
                and "player_id:duplicate_source_id" in p["issues"]
                for p in duplicate_club.json()["players"]
            )
            canonical_payload["rows"][0][-1] = "99"
            changed_club = session.post(
                base + "/api/football/my-club/analyze", json=canonical_payload, timeout=10
            )
            changed_club.raise_for_status()
            assert changed_club.json()["players"][0]["benchmark"] is None
            assert changed_club.json()["players"][0]["confidence"] is None
            inconsistent_csv = session.post(
                base + "/api/football/my-club/preview?filename=inconsistent-fixture.csv",
                data=(
                    b"name,position,minutes,shots,non_penalty_goals,passes,progressive_passes,carries,entries_into_box\n"
                    b"Inconsistent parser fixture,W,90,2,4,3,4,2,6\n"
                ),
                timeout=10,
            )
            inconsistent_csv.raise_for_status()
            bad_preview = inconsistent_csv.json()
            inconsistent_club = session.post(
                base + "/api/football/my-club/analyze",
                json={
                    "headers": bad_preview["headers"],
                    "rows": bad_preview["rows"],
                    "source_rows": bad_preview["source_rows"],
                    "mapping": bad_preview["suggested_mapping"],
                },
                timeout=10,
            )
            inconsistent_club.raise_for_status()
            corrected = inconsistent_club.json()["players"][0]
            assert all(
                corrected["metrics"][key] is None
                for key in ("non_penalty_goals_per90", "progressive_passes_per90", "entries_into_box_per90")
            )
            assert corrected["metrics"]["shots_per90"] == 2
            assert corrected["data_coverage"] == 300 / 21
            assert corrected["confidence"] is None
            # Exercise the actual web exporter, not a hand-written approximation
            # of its 54-column CSV. A maximum-length note is auxiliary text.
            export_input = Path(temp) / "export-input.json"
            export_input.write_text(json.dumps({"catalog": catalog, "player_id": source["player_id"]}))
            exported = subprocess.run(
                [
                    node,
                    "--experimental-strip-types",
                    "--input-type=module",
                    "-e",
                    r"""
import { readFileSync } from 'node:fs';
import { csvText } from './lib/export.ts';
const {catalog, player_id} = JSON.parse(readFileSync(process.argv[1], 'utf8'));
const player = catalog.players.find(p => p.player_id === player_id);
const note = '=QA export fixture, "quoted".\n'.repeat(200).slice(0, 2999) + '.';
process.stdout.write(csvText([player], catalog, {
  [player_id]: {status: 'review', note, updated_at: '2026-09-17T00:00:00Z'}
}));
""",
                    str(export_input),
                ],
                cwd=web,
                capture_output=True,
                check=True,
                timeout=20,
            ).stdout
            roundtrip_preview_response = session.post(
                base + "/api/football/my-club/preview?filename=Football_Recruitment_Analysis.csv",
                data=exported,
                timeout=10,
            )
            roundtrip_preview_response.raise_for_status()
            roundtrip_preview = roundtrip_preview_response.json()
            note_cell = roundtrip_preview["rows"][0][roundtrip_preview["headers"].index("scout_note")]
            assert len(note_cell) == 3001 and note_cell.startswith("'=")
            assert "scout_note" not in roundtrip_preview["suggested_mapping"]
            roundtrip_club_response = session.post(
                base + "/api/football/my-club/analyze",
                json={
                    "headers": roundtrip_preview["headers"],
                    "rows": roundtrip_preview["rows"],
                    "source_rows": roundtrip_preview["source_rows"],
                    "mapping": roundtrip_preview["suggested_mapping"],
                },
                timeout=10,
            )
            roundtrip_club_response.raise_for_status()
            roundtrip_club = roundtrip_club_response.json()
            restored = roundtrip_club["players"][0]
            assert restored["benchmark"]["reference_player_id"] == source["player_id"]
            for key, value in source["metrics"].items():
                actual = restored["metrics"][key]
                assert (
                    actual is None
                    if value is None
                    else math.isclose(actual, value, rel_tol=1e-10, abs_tol=1e-10)
                )
            assert math.isclose(restored["confidence"], profile["evidence"]["confidence_score"], abs_tol=1e-9)
            assert restored["data_coverage"] == profile["evidence"]["data_coverage"]
            checks.append(
                "Actual shortlist CSV export with a 3000-character note reimports with unchanged rates, reference, coverage and confidence"
            )
            assert (
                session.post(
                    base + "/api/football/my-club/preview?filename=bad.csv",
                    data=b"x" * (3 * 1024 * 1024 + 1),
                    timeout=10,
                ).status_code
                == 413
            )
            checks.append(
                "CSV/XLSX preview and analysis; nulls/formulas/upload limits; impossible subtotals withheld; only verified canonical imports receive external benchmarks"
            )
            # Actual HTTP payloads must also pass the same runtime boundary as
            # the browser, rather than assuming Python/TypeScript contracts agree.
            validation_input = Path(temp) / "browser-boundary.json"
            validation_input.write_text(
                json.dumps(
                    {
                        "catalog": catalog,
                        "profile": profile,
                        "related": related,
                        "fit": ranked.json(),
                        "brief": brief,
                        "maps": maps,
                        "csv": parsed,
                        "xlsx": xlsx.json(),
                        "club": club.json(),
                        "xlsxClub": xlsx_club.json(),
                        "canonicalClub": canonical_club.json(),
                        "changedClub": changed_club.json(),
                        "duplicateClub": duplicate_club.json(),
                        "inconsistentClub": inconsistent_club.json(),
                        "roundtripPreview": roundtrip_preview,
                        "roundtripClub": roundtrip_club,
                    }
                )
            )
            subprocess.run(
                [
                    node,
                    "--experimental-strip-types",
                    "--input-type=module",
                    "-e",
                    "import { readFileSync } from 'node:fs'; "
                    "import * as check from './lib/validation.ts'; "
                    "import { squadDepth, formations } from './lib/club.ts'; "
                    "const d = JSON.parse(readFileSync(process.argv[1], 'utf8')); "
                    "const c = check.validateCatalog(d.catalog), id = c.coverage.dataset_id; "
                    "check.validateProfile(d.profile, d.profile.player.player_id, id); "
                    "check.validateSimilarity(d.related, d.related.target, id); "
                    "check.validateFit(d.fit, id, d.brief); "
                    "check.validateVisuals(d.maps, d.maps.player_id, id); "
                    "check.validateImportPreview(d.csv, c); check.validateImportPreview(d.xlsx, c); "
                    "check.validateImportPreview(d.roundtripPreview, c); "
                    "for (const a of [d.club, d.xlsxClub, d.canonicalClub, d.changedClub, d.duplicateClub, d.inconsistentClub, d.roundtripClub]) check.validateClubAnalysis(a, c); "
                    "const depth = squadDepth(d.duplicateClub.players, formations['4-3-3'], 180); "
                    "if (depth.some(g => g.available.length)) throw new Error('Duplicate imports filled squad targets');",
                    str(validation_input),
                ],
                cwd=web,
                check=True,
                timeout=20,
            )
            checks.append(
                "Actual HTTP profile, similarity, custom Fit, maps and CSV/XLSX payloads pass browser runtime validation; duplicate imports cannot fill squad targets"
            )
            demo_csv = subprocess.check_output(
                [
                    node,
                    "--experimental-strip-types",
                    "--input-type=module",
                    "-e",
                    "import { readFileSync } from 'node:fs'; import { csvText } from './lib/export.ts'; "
                    "const {catalog} = JSON.parse(readFileSync(process.argv[1], 'utf8')); "
                    "process.stdout.write(csvText(catalog.players.filter(p => p.team_name === 'Spain'), catalog));",
                    str(export_input),
                ],
                cwd=web,
                timeout=20,
            )
            demo_preview = session.post(
                base + "/api/football/my-club/preview?filename=spain-euro-2024.csv", data=demo_csv, timeout=10
            )
            demo_preview.raise_for_status()
            parsed_demo = demo_preview.json()
            demo_response = session.post(
                base + "/api/football/my-club/analyze",
                json={
                    "headers": parsed_demo["headers"],
                    "rows": parsed_demo["rows"],
                    "source_rows": parsed_demo["source_rows"],
                    "mapping": parsed_demo["suggested_mapping"],
                    "label": "Spain · Euro 2024",
                    "decimal": ".",
                },
                timeout=10,
            )
            demo_response.raise_for_status()
            demo_analysis = demo_response.json()
            assert len(demo_analysis["players"]) == 25
            for player in demo_analysis["players"]:
                original = next(p for p in catalog["players"] if p["player_id"] == player["source_player_id"])
                for metric, value in player["metrics"].items():
                    expected = original["metrics"].get(metric)
                    assert value is None if expected is None else math.isclose(value, expected, abs_tol=1e-9)
            demo_input = Path(temp) / "demo-import.json"
            demo_input.write_text(
                json.dumps({"catalog": catalog, "preview": parsed_demo, "analysis": demo_analysis})
            )
            subprocess.run(
                [
                    node,
                    "--experimental-strip-types",
                    "--input-type=module",
                    "-e",
                    "import { readFileSync } from 'node:fs'; import { validateImportPreview, validateClubAnalysis } from './lib/validation.ts'; "
                    "const d = JSON.parse(readFileSync(process.argv[1], 'utf8')); validateImportPreview(d.preview, d.catalog); validateClubAnalysis(d.analysis, d.catalog);",
                    str(demo_input),
                ],
                cwd=web,
                check=True,
                timeout=20,
            )
            checks.append(
                "My Club demo: 25 real Spain players through the same CSV parser, mapping, analysis and frontend validators; every per90 reconciles"
            )
            brief["requirements"][0]["metric"] = "invented_speed"
            assert (
                session.post(base + "/api/football/recruitment/fit", json=brief, timeout=10).status_code
                == 422
            )
            assert session.get(base + "/api/football/private-raw-events", timeout=10).status_code == 404
            checks.append("Unsupported metrics rejected; raw or arbitrary proxy routes unavailable")
            api.terminate()
            api.wait(timeout=5)
            assert session.get(base + "/api/football/data/catalog", timeout=10).status_code == 503
            saved = session.get(base + "/analysis/catalog.json", timeout=10)
            saved.raise_for_status()
            assert saved.json()["coverage"]["dataset_id"] == dataset_id
            checks.append("API outage returns explicit 503 while the same real analysis remains available")
        finally:
            for process in reversed(processes):
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=5)
    report = {
        "status": "passed",
        "dataset_id": dataset_id,
        "checks": checks,
        "data_mode": "bundled_analysis",
        "provider_network_requests": 0,
    }
    output = ROOT / "docs/validation/PRODUCTION_STACK_CHECKS.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
