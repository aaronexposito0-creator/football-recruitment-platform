"""Independent arithmetic and publication checks against the delivered analysis.

No network. Does not call production per-90, percentile or similarity functions.
"""

from __future__ import annotations

import bisect
import json
import math
import hashlib
import statistics
from collections import Counter
from pathlib import Path

from core.pipeline.config import ROOT


def validate(root: Path = ROOT) -> dict:
    web = root / "apps/web/public/analysis"
    dataset = json.loads((root / "data/sample/analysis.json").read_text())
    players = dataset["players"]
    manifest = dataset["manifest"]
    counts = Counter()
    publication = json.loads((web / "publication_manifest.json").read_text())
    assert publication["dataset_id"] == manifest["dataset_id"]
    actual_paths = {
        str(p.relative_to(web)) for p in web.rglob("*.json") if p.name != "publication_manifest.json"
    }
    assert actual_paths == set(publication["files_sha256"])
    for relative, digest in publication["files_sha256"].items():
        assert hashlib.sha256((web / relative).read_bytes()).hexdigest() == digest, relative
        counts["published_file_hashes"] += 1
    identities = {p["player_id"]: p for p in players}
    for player in players:
        assert player["minutes"] > 0
        assert math.isclose(sum(player["position_minutes"].values()), player["minutes"], abs_tol=1e-7)
        counts["player_exposures"] += 1
        for metric, value in player["metrics"].items():
            if metric.endswith("_per90"):
                total = player["totals"][metric[:-6]]
                expected = total * 90 / player["minutes"] if total is not None else None
            else:
                total = player["totals"]["passes"]
                expected = 100 * player["totals"]["completed_passes"] / total if total else None
            assert (value is None and expected is None) or (
                value is not None and math.isclose(value, expected, abs_tol=1e-10)
            ), (player["player_id"], metric)
            counts["rate_cells"] += 1
        slug = player["player_id"].replace(":", "-")
        profile = json.loads((web / "profiles" / f"{slug}.json").read_text())
        assert profile["player"] == player
        assert profile["lineage"]["dataset_id"] == manifest["dataset_id"]
        peers = [
            p
            for p in players
            if p["minutes"] >= 180
            and all(
                p[k] == player[k]
                for k in ("dataset_id", "competition_id", "season_id", "gender", "position_group")
            )
        ]
        eligible = (
            player["minutes"] >= 180 and player["position_group"] not in ("GK", "UNK") and len(peers) >= 10
        )
        assert profile["cohort"]["eligible"] == eligible
        for metric in profile["metrics"]:
            key = metric["key"]
            value = player["metrics"][key]
            ordered = sorted(p["metrics"][key] for p in peers if p["metrics"][key] is not None)
            expected = None
            if eligible and value is not None and len(ordered) >= 10:
                expected = (
                    50
                    * (bisect.bisect_left(ordered, value) + bisect.bisect_right(ordered, value))
                    / len(ordered)
                )
            actual = metric["percentile"]
            assert (actual is None and expected is None) or (
                actual is not None and math.isclose(actual, expected, abs_tol=1e-10)
            )
            favorable = (
                100 - expected if expected is not None and metric["direction"] == "lower" else expected
            )
            assert metric["favorable_percentile"] == favorable or (
                favorable is not None
                and math.isclose(metric["favorable_percentile"], favorable, abs_tol=1e-10)
            )
            counts["percentile_cells"] += 1
        coverage = 100 * sum(v is not None for v in player["metrics"].values()) / len(player["metrics"])
        supported = [
            sum(p["metrics"].get(key) is not None for p in peers)
            for key, value in player["metrics"].items()
            if value is not None
        ]
        support = sum(min(n / 30, 1) for n in supported if n >= 10) / len(player["metrics"])
        confidence = 100 * min(player["minutes"] / 900, 1) * support if eligible else 0
        assert math.isclose(profile["evidence"]["data_coverage"], coverage)
        assert math.isclose(profile["evidence"]["confidence_score"], confidence)
        similar = json.loads((web / "similar" / f"{slug}.json").read_text())
        assert similar["dataset_id"] == manifest["dataset_id"]
        assert eligible or not similar["results"]
        for result in similar["results"]:
            assert result["player_id"] != player["player_id"]
            assert result["player_id"] in {p["player_id"] for p in peers}
            candidate = identities[result["player_id"]]
            for component in result["components"]:
                key = component["metric"]
                observations = [p["metrics"][key] for p in peers if p["metrics"][key] is not None]
                assert component["cohort_observations"] == len(observations)
                assert component["target_value"] == player["metrics"][key]
                assert component["candidate_value"] == candidate["metrics"][key]
                scale = statistics.pstdev(observations) if len(observations) >= 2 else 0
                supported = len(observations) >= 10 and scale > 1e-9
                assert (component["cohort_std"] is None) == (not supported)
                if supported:
                    assert math.isclose(component["cohort_std"], scale, rel_tol=1e-10)
                expected_status = (
                    "missing"
                    if player["metrics"][key] is None or candidate["metrics"][key] is None
                    else "insufficient_reference"
                    if len(observations) < 10
                    else "constant_reference"
                    if not supported
                    else "compared"
                )
                assert component["status"] == expected_status
                if expected_status == "compared":
                    difference = (candidate["metrics"][key] - player["metrics"][key]) / scale
                    assert math.isclose(component["standardized_difference"], difference, abs_tol=1e-10)
                else:
                    assert component["standardized_difference"] is None
                    assert component["distance_share_pct"] is None
                counts["similarity_reference_cells"] += 1
            components = [c for c in result["components"] if c["status"] == "compared"]
            assert len(components) == result["comparable_metric_count"] >= 3
            distance = math.sqrt(sum(c["standardized_difference"] ** 2 for c in components) / len(components))
            assert result["similarity"] == round(100 / (1 + distance), 2)
            squares = sum(c["standardized_difference"] ** 2 for c in components)
            for component in components:
                share = 100 * component["standardized_difference"] ** 2 / squares if squares else 0
                assert math.isclose(component["distance_share_pct"], share, abs_tol=1e-10)
            counts["similarity_pairs"] += 1
    for path in (web / "fit").glob("*.json"):
        fit = json.loads(path.read_text())
        assert fit["dataset_id"] == manifest["dataset_id"]
        for result in fit["results"]:
            player = identities[result["player_id"]]
            brief = fit["brief"]
            reference = [
                p for p in players if p["position_group"] == player["position_group"] and p["minutes"] >= 180
            ]
            total_weight = sum(r["weight"] for r in brief["requirements"])
            observed_weight = weighted_points = support = 0.0
            for requirement in brief["requirements"]:
                metric = requirement["metric"]
                observations = [p["metrics"][metric] for p in reference if p["metrics"][metric] is not None]
                observed = player["metrics"][metric]
                if observed is None or len(observations) < 10:
                    continue
                scale = statistics.pstdev(observations) or 1.0
                weight = requirement["weight"]
                direction = requirement.get("direction", "higher")
                if direction == "target":
                    distance = abs(observed - requirement["target"]) / (requirement.get("tolerance") or scale)
                    score = 100 * math.exp(-0.5 * distance**2) if distance <= 40 else 0
                else:
                    z = (
                        (observed - statistics.mean(observations))
                        / scale
                        * (1 if direction == "higher" else -1)
                    )
                    score = 100 / (1 + math.exp(-max(-700, min(700, 1.25 * z))))
                observed_weight += weight
                weighted_points += weight * score
                support += weight * min(len(observations) / 30, 1)
            expected_fit = round(weighted_points / observed_weight, 2) if observed_weight else None
            assert result["fit_score"] == expected_fit
            assert math.isclose(
                result["data_coverage"], round(100 * observed_weight / total_weight, 2), abs_tol=0.00001
            )
            assert math.isclose(
                result["confidence_score"],
                round(100 * support / total_weight * min(player["minutes"] / 900, 1), 2),
                abs_tol=0.00001,
            )
            if result["fit_score"] is not None:
                assert abs(sum(c["contribution"] for c in result["components"]) - result["fit_score"]) < 0.02
                assert (
                    abs(50 + sum(c["delta_from_neutral"] for c in result["components"]) - result["fit_score"])
                    < 0.02
                )
            counts["fit_explanations"] += 1
    examples = []
    for term in ("Lamine Yamal", "Fabián Ruiz", "Rodrigo Hernández"):
        player = next(p for p in players if term in p["player_name"])
        examples.append(
            {
                k: player[k]
                for k in (
                    "player_id",
                    "player_name",
                    "position_group",
                    "minutes",
                    "appearances",
                    "totals",
                    "metrics",
                )
            }
        )
    low = min(players, key=lambda p: p["minutes"])
    return {
        "status": "passed",
        "dataset_id": manifest["dataset_id"],
        "checks": dict(counts),
        "source_revision": manifest["source_revision"],
        "matches": manifest["matches_ingested"],
        "events": manifest["events"],
        "cohorts_at_180": dict(
            sorted(Counter(p["position_group"] for p in players if p["minutes"] >= 180).items())
        ),
        "players_below_180": sum(p["minutes"] < 180 for p in players),
        "players_with_missing_metrics": [
            {
                "player_id": p["player_id"],
                "player_name": p["player_name"],
                "minutes": p["minutes"],
                "missing": [k for k, v in p["metrics"].items() if v is None],
            }
            for p in players
            if any(v is None for v in p["metrics"].values())
        ],
        "smallest_exposure": {k: low[k] for k in ("player_id", "player_name", "minutes")},
        "manual_reference_players": examples,
    }


def main():
    report = validate()
    path = ROOT / "docs/validation/ANALYSIS_CHECKS.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(
        json.dumps(
            {
                k: v
                for k, v in report.items()
                if k not in ("manual_reference_players", "players_with_missing_metrics")
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
