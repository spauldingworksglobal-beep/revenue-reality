# Architecture

This is a condensed reference for engineers working in this repo. It
summarizes decisions already implemented in `packages/*`. It is not a
substitute for the two source documents in this folder, which remain the
methodology's source of truth.

## Product flow

```
LIFE REALITY → TIME REALITY → BUSINESS → REVENUE REALITY ENGINE
  → NOW / NEXT / ULTIMATELY → COMPARE → PATH
```

NOW, NEXT, and ULTIMATELY are the same engine (`runScenario` in
`packages/revenue-engine/src/scenario.ts`) run against three different
`ScenarioEngineInput` objects. The function never branches on `scenarioType`
except to pick which revenue figure drives the forward pass:

- **NOW** — `actualRevenue` (measured, from Revenue + Cash intake), never annualized.
- **NEXT / ULTIMATELY** — the revenue solved backward from the scenario's
  funding target (see below).

## The one funding-responsibility calculation

`totalPersonalEconomicRequirement = lifeRequirement + securityRequirement`
(these two are disjoint by construction — see `LifeCategoryKind` vs.
`SecurityItemKind` in `packages/domain/src/life-time.ts` — so summing them is
always safe, never a double count).

`businessFundedRequirement = totalPersonalEconomicRequirement − outsideFundingRetained`,
where `outsideFundingRetained` is entered as *either* a flat amount *or* a
percent of the total — never both (`OutsideFundingRetained` in
`scenario-assumptions.ts`, enforced in `@revenue-reality/validation`). This
is computed once, in `resolveBusinessFundedRequirement` (`funding.ts`), and
never independently stored elsewhere.

## Ownership Economics + the Distribution Waterfall

Revenue → contribution economics → operating costs *and labor* → **Operating
Economic Surplus** → required business retention (working capital, reserve,
reinvestment, debt reduction — tagged `ONE_TIME` or `RECURRING`, see
`CapitalRequirementItem`) → **Distributable Economic Surplus** → owner
distribution share → **owner profit distribution** → *plus* owner labor
compensation → **total owner economic benefit**.

Labor compensation and profit distribution are tracked independently
(`OwnerEconomics` in `packages/domain/src/ownership.ts`) — ownership
percentage and distribution percentage are never assumed equal. Five
distribution rules are supported: `SAME_AS_OWNERSHIP`, `EQUAL_SPLIT`,
`CUSTOM_PERCENTAGE` (validated to sum to 100%), `DISCRETIONARY`, `OTHER`.

The engine solves both directions (`distribution.ts`):

- **Forward** — `revenue → distributableSurplus → ownerProfitDistribution`.
- **Backward** — an owner's required profit distribution `÷` their
  distribution percent gives required distributable surplus; required
  retained capital is added back (never treated as if it were distributed);
  the result plus known opex and all owners' labor comp gives the required
  revenue.

**The canonical comparison** is the primary respondent's
`businessFundedPersonalEconomicRequirement` against their
`totalOwnerEconomicBenefit` (labor + distribution) — never against revenue
or company profit directly (`primaryOwnerBenefitVsRequirement` in the
result; `ownerSupportSignal` is derived from it in `signals.ts`).

## Confidence, never a fabricated score

Every user-entered value carries one of four categorical tiers (`EXACT`,
`STRONG_ESTIMATE`, `ROUGH_ESTIMATE`, `INCOMPLETE`) via `ConfidenceValue<T>`.
Nothing blends these into a numeric score — `assembleConfidenceFlags`
(`confidence.ts`) returns a worst-first list of contributing fields. No
calculation stage blocks on `INCOMPLETE` input; see the DISCRETIONARY
distribution fallback and HCF's unclassified owner cash
(`scenario.test.ts`) for the two clearest examples.

## What's not built yet

- **Persistence.** No Postgres schema is wired up. The full schema design
  (including Row-Level Security via Supabase Anonymous Sign-in) exists as a
  reviewed proposal but is not yet implemented as migrations — that's
  Milestone 2+ (Life/Time Reality persistence).
- **`apps/web`.** No UI. Per the build sequence, visual work doesn't start
  until the engine and HCF fixture pass end-to-end (done) and Life/Time
  Reality intake exists.

## Open product questions (not engineering decisions)

Two questions from the architecture review remain genuinely unresolved and
will need a product-owner decision before the milestones that touch them:

1. How a restructured business's period revenue (e.g. "$4,800 since restart")
   displays against monthly-normalized figures like the break-even floor,
   without implying a run-rate. Relevant from Milestone 4 (Business intake) on.
2. Whether a multi-owner business needs one shared Life Reality (current
   design) or a separate one per co-owner. Relevant from Milestone 2 (Life
   Reality) on — a schema fork, not just a UI one.
