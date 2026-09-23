# Baseline audit — 2026-09-09

Read the complete master contract and every source/config/doc in all 128 ZIP entries. CRC validation passed. Generated Python bytecode was identified and excluded from source inspection; caches were removed after baseline execution.

- Original Python tests: **7 passed**, 2 dependency deprecation warnings (2.13s).
- Original frontend: npm install succeeded; Next.js 15.5.25 build and TypeScript validation passed. No original lockfile.
- Original editable installation failed: multiple top-level packages (`sql`, `core`, `apps`, `data`). Tests ran after installing the declared dependencies directly, without editing source.
- UI: six marketing module cards, inert navigation/selectors and fabricated score examples; no live API calls.
- StatsBomb adapter: live requests against mutable master, no retry/cache/revision/digest/normalization.
- Canonical model: player contracts plus SQL draft; no pipeline or actual warehouse.
- Fit: working baseline but missing hard constraints could pass; confidence contaminated fit; logistic overflow possible.
- Similarity: mutual-dimension masking exists, but missing-value mean filling affects standardization.
- CI: Python only, with the broken installation command.
- Docs: alleged EUR 50 paid-source allowance conflicts with the current contract and is superseded.
- My Club: coverage calculation endpoint only; no file upload flow.
- ML: unvalidated KMeans foundation; not connected to product.
- EN/ES/FR: small unused dictionary, not functional localization.
