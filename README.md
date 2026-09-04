# Revenue Reality

Spaulding Works / Works Tools. A guided operating diagnostic that starts from
the entrepreneur's Life and Time Reality, then runs one deterministic engine
three times — NOW, NEXT, ULTIMATELY — to calculate what the business must
produce, rather than asking the owner to name a revenue goal.

Product methodology: [`docs/Revenue_Reality_Method_v1.4_Master.docx`](docs/Revenue_Reality_Method_v1.4_Master.docx)
Implementation contract: [`docs/Revenue_Reality_Product_Build_Spec_v1.1.docx`](docs/Revenue_Reality_Product_Build_Spec_v1.1.docx)
Architecture summary: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Status

**Milestone 1 (domain + engine foundation) is complete.** Domain types,
validation, and the calculation engine exist and are fully tested, including
an end-to-end pass of the HCF acceptance fixture (Build Spec §20). No UI
exists yet — `apps/web` has not been started, per the build sequence.

## Structure

```
packages/domain           — pure TypeScript types, no logic
packages/validation       — input parsing, guards, structural validators
packages/revenue-engine   — the deterministic calculation engine (decimal.js)
```

Each package's tests live alongside its source as `*.test.ts`.

## Working in this repo

```bash
npm install        # installs all workspaces
npm run typecheck  # tsc --build across all packages
npm test           # vitest run — all unit + fixture tests
```

Node 18+ required. No database, no Next.js app, and no external services are
wired up yet — the engine is a standalone library by design (Method v1.4:
"core calculations must be code, not LLM-generated reasoning," runnable and
testable independent of any UI).

## Engineering principles carried through the code

- **One engine, three scenarios.** `runScenario()` in `packages/revenue-engine`
  has no branch on `scenarioType` beyond selecting which revenue figure
  (measured for NOW, solved for NEXT/ULTIMATELY) drives the forward pass.
- **Decimal-safe arithmetic.** All money math runs through `decimal.js`;
  `Money`/`Percent` are decimal strings at rest and only get rounded at the
  engine's output boundary (`money.ts`), never mid-calculation.
- **Never block on incomplete data.** Every stage accepts `INCOMPLETE`
  confidence and still produces a real result — see the DISCRETIONARY
  distribution fallback and the HCF fixture's unclassified owner cash in
  `scenario.test.ts`.
