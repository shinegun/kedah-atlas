# Architecture decision records

Short records of decisions that shape the site, why we made them, and what they cost. One file per decision, numbered in order. A record is never rewritten after it is accepted: if a decision changes, add a new record that supersedes the old one and update the old one's status.

| # | Decision | Status |
|---|---|---|
| [0001](0001-readers-and-entry-points.md) | Who the site is for, and a page for each reader | Accepted (2026-09-28) |
| [0002](0002-collapsible-sidebar-and-home-intro.md) | Collapsible sidebar and full-screen home intro | Accepted (2026-09-28) |

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context
What problem or pressure made a decision necessary.

## Decision
What we chose, concretely (files, routes, rules).

## Alternatives considered
What else we looked at and why we didn't pick it.

## Consequences
What gets easier, what gets harder, and what we must keep doing.
```
