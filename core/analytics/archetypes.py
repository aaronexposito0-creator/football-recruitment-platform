"""Curated hypotheses about observed football behaviour, not learned player roles."""

from core.schemas.models import RecruitmentBrief


def archetypes() -> list[dict]:
    definitions = [
        (
            "cb_progressor",
            "CB",
            ["Ball-playing centre-back", "Central constructor", "Défenseur relanceur"],
            [
                ("progressive_passes_per90", 3),
                ("passes_into_final_third_per90", 2),
                ("pass_completion", 2),
                ("interceptions_per90", 1),
                ("turnovers_per90", 1),
            ],
        ),
        (
            "cb_active",
            "CB",
            ["Active central defender", "Central de intervención", "Défenseur actif"],
            [
                ("interceptions_per90", 3),
                ("tackles_per90", 2),
                ("ball_recoveries_per90", 2),
                ("pass_completion", 1),
                ("turnovers_per90", 1),
            ],
        ),
        (
            "fb_advancing",
            "FB",
            ["Advancing full-back", "Lateral de avance", "Latéral de progression"],
            [
                ("progressive_carries_per90", 3),
                ("entries_into_box_per90", 3),
                ("xa_per90", 2),
                ("pressures_per90", 1),
                ("turnovers_per90", 1),
            ],
        ),
        (
            "dm_distributor",
            "DM",
            ["Deep distributor", "Organizador de base", "Organisateur bas"],
            [
                ("progressive_passes_per90", 3),
                ("passes_into_final_third_per90", 2),
                ("pass_completion", 2),
                ("interceptions_per90", 1),
                ("turnovers_per90", 2),
            ],
        ),
        (
            "dm_recovery",
            "DM",
            ["Recovery midfielder", "Mediocentro recuperador", "Milieu récupérateur"],
            [
                ("ball_recoveries_per90", 3),
                ("interceptions_per90", 3),
                ("pressures_per90", 2),
                ("pass_completion", 1),
                ("turnovers_per90", 1),
            ],
        ),
        (
            "cm_two_way",
            "CM",
            ["Two-way midfielder", "Interior de ida y vuelta", "Milieu polyvalent"],
            [
                ("progressive_passes_per90", 2),
                ("pressures_per90", 2),
                ("ball_recoveries_per90", 2),
                ("xa_per90", 2),
                ("turnovers_per90", 1),
            ],
        ),
        (
            "am_creator",
            "AM",
            ["Chance creator", "Creador de ocasiones", "Créateur d’occasions"],
            [("xa_per90", 4), ("key_passes_per90", 3), ("entries_into_box_per90", 1), ("turnovers_per90", 1)],
        ),
        (
            "w_direct",
            "W",
            ["Direct winger", "Extremo vertical", "Ailier direct"],
            [
                ("progressive_carries_per90", 3),
                ("entries_into_box_per90", 3),
                ("npxg_per90", 2),
                ("xa_per90", 2),
                ("turnovers_per90", 1),
            ],
        ),
        (
            "w_creator",
            "W",
            ["Creative winger", "Extremo creador", "Ailier créateur"],
            [("xa_per90", 4), ("key_passes_per90", 3), ("entries_into_box_per90", 2), ("pass_completion", 1)],
        ),
        (
            "st_box",
            "ST",
            ["Box forward", "Delantero de área", "Attaquant de surface"],
            [
                ("npxg_per90", 4),
                ("shots_per90", 2),
                ("key_passes_per90", 1),
                ("pressures_per90", 1),
                ("turnovers_per90", 1),
            ],
        ),
        (
            "st_link",
            "ST",
            ["Linking forward", "Delantero asociativo", "Attaquant de liaison"],
            [
                ("key_passes_per90", 3),
                ("xa_per90", 3),
                ("pass_completion", 2),
                ("pressures_per90", 2),
                ("npxg_per90", 2),
            ],
        ),
    ]
    output = []
    for identifier, position, names, requirements in definitions:
        brief = RecruitmentBrief(
            role_name=names[0],
            position_groups=[position],
            min_minutes=180,
            requirements=[
                {"metric": m, "weight": w, "direction": "lower" if m == "turnovers_per90" else "higher"}
                for m, w in requirements
            ],
        )
        output.append(
            {
                "id": identifier,
                "position_group": position,
                "names": dict(zip(("en", "es", "fr"), names)),
                "brief": brief.model_dump(mode="json"),
                "version": "curated-1.0",
                "evidence_note": "Curated role hypothesis using event volumes. Not a learned role, off-ball assessment, or team-tactical fit. Defensive volume depends on opportunity.",
            }
        )
    return output
