import type { Catalog, Profile, Similarity } from "./contracts";
import {
  validateCatalog,
  validateProfile,
  validateSimilarity,
  validateVisuals,
} from "./validation.ts";

export async function json<T>(
  url: string,
  signal?: AbortSignal,
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
      : AbortSignal.timeout(10000),
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
export async function loadCatalog(): Promise<{
  catalog: Catalog;
  api: boolean;
}> {
  try {
    return {
      catalog: validateCatalog(
        await json<Catalog>(
          "/api/football/data/catalog",
          AbortSignal.timeout(5000),
        ),
      ),
      api: true,
    };
  } catch {
    return {
      catalog: validateCatalog(await json<Catalog>("/analysis/catalog.json")),
      api: false,
    };
  }
}
export async function loadProfile(
  id: string,
  api: boolean,
  datasetId: string,
  signal?: AbortSignal,
): Promise<Profile> {
  let data: Profile;
  try {
    if (!api) throw new Error("snapshot");
    data = await json<Profile>(
      `/api/football/players/${encodeURIComponent(id)}/profile`,
      signal,
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    data = await json<Profile>(
      `/analysis/profiles/${id.replaceAll(":", "-")}.json`,
      signal,
    );
  }
  return validateProfile(data, id, datasetId);
}
export async function loadSimilar(
  id: string,
  api: boolean,
  datasetId: string,
  signal?: AbortSignal,
): Promise<Similarity> {
  let data: Similarity;
  try {
    if (!api) throw new Error("snapshot");
    data = await json<Similarity>(
      `/api/football/players/${encodeURIComponent(id)}/similar?limit=200`,
      signal,
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    data = await json<Similarity>(
      `/analysis/similar/${id.replaceAll(":", "-")}.json`,
      signal,
    );
  }
  return validateSimilarity(data, id, datasetId);
}

export async function loadVisuals(
  id: string,
  api: boolean,
  datasetId: string,
  signal?: AbortSignal,
): Promise<import("./contracts").VisualProfile> {
  let data: import("./contracts").VisualProfile;
  try {
    if (!api) throw new Error("snapshot");
    data = await json(
      `/api/football/players/${encodeURIComponent(id)}/visuals`,
      signal,
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    data = await json(
      `/analysis/visuals/${id.replaceAll(":", "-")}.json`,
      signal,
    );
  }
  return validateVisuals(data, id, datasetId);
}

export type ComparisonEntry =
  | { status: "ready"; profile: Profile }
  | { status: "loading" | "missing" | "error"; profile?: never };

/** One unavailable selection must not hide the other players or prevent removal. */
export async function loadComparison(
  ids: string[],
  catalog: Catalog,
  api: boolean,
  signal: AbortSignal,
  onEntry: (id: string, entry: ComparisonEntry) => void,
): Promise<void> {
  const available = new Set(catalog.players.map((p) => p.player_id));
  await Promise.all(
    ids.map(async (id) => {
      let entry: ComparisonEntry;
      if (!available.has(id)) entry = { status: "missing" };
      else {
        try {
          entry = {
            status: "ready",
            profile: await loadProfile(
              id,
              api,
              catalog.coverage.dataset_id,
              signal,
            ),
          };
        } catch {
          entry = { status: "error" };
        }
      }
      if (!signal.aborted) onEntry(id, entry);
    }),
  );
}
