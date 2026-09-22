# Revenue Reality

Spaulding Works / Works Tools. A guided operating diagnostic that starts from
the entrepreneur's Life and Time Reality, then runs one deterministic engine
three times — NOW, NEXT, ULTIMATELY — to calculate what the business must
produce, rather than asking the owner to name a revenue goal.

Product methodology: [`docs/Revenue_Reality_Method_v1.4_Master.docx`](docs/Revenue_Reality_Method_v1.4_Master.docx)
Implementation contract: [`docs/Revenue_Reality_Product_Build_Spec_v1.1.docx`](docs/Revenue_Reality_Product_Build_Spec_v1.1.docx)
Architecture summary: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Status

**Milestones 1 through 8 are complete**, and the whole flow runs end to end
against the engine:

| # | Milestone | What it covers |
|---|-----------|----------------|
| 1 | Domain, validation, engine | Types, guards, and the deterministic calculation engine; passes the HCF acceptance fixture (Build Spec §20) |
| 2 | Life Reality | Current and intended living costs, security items, funding sources, deferred needs |
| 3 | Time Reality | Business hours against the hours a life can actually give |
| 4 | Business Profile | Model, stage, funding job, ownership intent |
| 5 | NOW | Current business reality, measured, run through the engine |
| 6 | NEXT | The intermediate workable model |
| 7 | ULTIMATELY | The mature intended model |
| 8 | COMPARE | NOW / NEXT / ULTIMATELY side by side |

`apps/web` now has the full wizard for that flow. **Every session is
ephemeral**: answers live in React state and are gone when the tab closes.
That is deliberate, not an oversight — see "What's not built yet" in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Persistence is gated behind
Supabase authentication and the approved Row-Level Security policies, and
neither is implemented yet. Nothing is deployed.

**Next milestone: persistence.** Schema and RLS design are reviewed and
written down; they have not been turned into migrations.

### Shipped alongside: Salary Needs

[`tools/salary-needs/`](tools/salary-needs) is a standalone owner-first
calculator drawn from Life Reality — what a life costs, what already helps
fund it, and the take-home still needed. It is a self-contained Webflow
embed with no build-time dependency on the packages above, and it is **live**
at <https://spauldingworks.global/salary-needs>. It shares this repo so the
life-cost semantics stay in one place (see the `v2` field on each category,
which maps to `LifeCategoryKind` / `SecurityItemKind`).

## Structure

```
packages/domain           — pure TypeScript types, no logic
packages/validation       — input parsing, guards, structural validators
packages/revenue-engine   — the deterministic calculation engine (decimal.js)
apps/web                  — Next.js wizard over the engine (ephemeral state)
tools/salary-needs        — standalone Salary Needs calculator (Webflow embed)
```

Each package's tests live alongside its source as `*.test.ts`.

## Working in this repo

```bash
npm install        # installs all workspaces
npm run typecheck  # tsc --build across all packages
npm test           # vitest run — engine + validation (369 tests)

npm run dev --workspace=apps/web          # the wizard, on :3000
node tools/salary-needs/build.mjs         # rebuild the Salary Needs embeds
node --test tools/salary-needs/calc.test.cjs   # its own suite (15 tests)
```

Node 18+ required. No database and no external services are wired up — the
engine is a standalone library by design (Method v1.4: "core calculations
must be code, not LLM-generated reasoning," runnable and testable
independent of any UI).

`tools/salary-needs/dist/` is committed on purpose, against `.gitignore`, so
the exact code installed in Webflow is versioned next to its source.

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
