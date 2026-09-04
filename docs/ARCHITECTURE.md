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

Classification uncertainty must never collapse into a zero: an owner whose
NOW cash is `UNCLASSIFIED_TOTAL` still has a fully known dollar amount, even
though the labor/distribution split within it is unknown. That known amount
is preserved in full as `totalOwnerEconomicBenefit` and feeds
`ownerSupportSignal` directly — the backward solver's separate, conservative
treatment of that owner's *labor compensation* as $0 (it has no way to guess
the split) never leaks into either. `scenario.test.ts`'s "UNCLASSIFIED_TOTAL
preserves known cash as owner benefit" suite tests this distinction
directly, including a case where a large known amount ($5,000) correctly
produces `BUSINESS_SUPPORTS_OWNER` rather than being silently zeroed.

## What's not built yet

- **Persistence.** No Postgres schema is wired up. The full schema design
  (including Row-Level Security via Supabase Anonymous Sign-in) exists as a
  reviewed proposal but is not yet implemented as migrations.
- **`apps/web`.** No UI. Per the build sequence, visual work doesn't start
  until the engine and HCF fixture pass end-to-end (done) and Life/Time
  Reality intake exists.

**Gating condition for Milestone 2:** Milestone 2 (Life/Time Reality
persistence) will not persist real Life Reality financial data — a real
person's actual or intended living costs, security/savings figures, or
funding sources — until Supabase authentication and the approved Row-Level
Security policies (§02 of the architecture proposal: `account`,
`user_session.account_id`, the one-hop RLS predicate on every table) are
actually implemented and verified, not merely designed. Schema/migration
work and engine-adjacent persistence code that carries no real financial
data (e.g. wiring the tables themselves, seed/fixture data) is not blocked
by this — only real user financial data is.

## Resolved methodology decisions

These were open questions after the round-1 architecture review. Both are
now decided; neither is an engineering judgment call.

### Restructured businesses

Actual revenue stays attached to the exact measurement period it was
reported for (e.g. "$4,800 since August 1, 2026") and is never automatically
annualized, prorated, extrapolated, or converted into a run rate merely to
make it comparable to a normalized planning figure. Required Revenue may
remain normalized monthly/annual, as it already is throughout the engine.
When the two periods aren't methodologically comparable, the product may
display them side by side, but must not calculate a percentage gap between
them or otherwise imply direct equivalence — that comparison would itself be
a silent annualization.

Implication for later milestones: actual-revenue intake and persistence
(Milestone 4, Business intake) must carry explicit period metadata —
`periodStart`, `periodEnd`/through-date, and a period type — alongside the
amount. `ScenarioEngineInput.actualRevenue` is currently a bare `Money`
string in the engine; this metadata is a Milestone 4 intake/schema concern,
not something the engine itself needs to compute with, since the engine
never derives a run rate from `actualRevenue` today and this decision
confirms it must never start doing so.

### Multiple owners

Revenue Reality v1 has **one** Life Reality and Time Reality per session,
belonging to the primary operator/respondent. This relationship already
exists in the domain model and is enforced, not just documented:
`OwnerEconomics.isPrimaryRespondent` (`packages/domain/src/ownership.ts`) is
the `primaryRespondentOwnerId` relationship — scenario-scoped, one owner
per scenario — and `runScenario` throws if zero or more than one owner is
marked (`packages/revenue-engine/src/scenario.ts`), so the invariant can't
silently drift.

Other owners remain fully represented everywhere business economics touch
them — labor compensation, personal cash investment, personally-paid costs,
ownership percentage, and profit-distribution economics all already exist
per-owner (`OwnerInput`, `OwnerEconomics`) and are exercised in HCF's
two-owner fixture. What is **not** modeled is a co-owner's own household
Life Reality (their personal living costs, security goals, funding sources
outside the business) — that stays out of scope for v1's session-scoped
`life_profile`/`time_profile`.
