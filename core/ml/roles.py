from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


@dataclass
class RoleClusterResult:
    labels: np.ndarray
    centroids_z: np.ndarray
    feature_names: list[str]


def discover_roles(
    matrix: np.ndarray, feature_names: Sequence[str], n_roles: int = 5, random_state: int = 42
) -> RoleClusterResult:
    """Unsupervised role discovery for an already filtered position family.

    This intentionally does not attach football labels automatically. Naming clusters is a
    semantic step performed after inspecting centroid features; this prevents fake certainty.
    """
    x = np.asarray(matrix, dtype=float)
    if x.ndim != 2 or x.shape[0] < n_roles:
        raise ValueError("Need a 2D matrix with at least n_roles rows")
    z = StandardScaler().fit_transform(x)
    model = KMeans(n_clusters=n_roles, random_state=random_state, n_init="auto")
    labels = model.fit_predict(z)
    return RoleClusterResult(
        labels=labels, centroids_z=model.cluster_centers_, feature_names=list(feature_names)
    )
