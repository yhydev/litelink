# Phase 0 Research - Configure Link Commands

## Decision 1: Backend hosting model
- Decision: Use Cloudflare Pages for admin UI and Cloudflare Workers/Pages Functions for API endpoints in one deployment boundary.
- Rationale: Matches required runtime, reduces cross-service complexity, and keeps UI + API close with shared auth/session context.
- Alternatives considered:
  - Separate frontend hosting + standalone API service: rejected due to operational overhead.
  - Single Worker-only app: rejected because Pages is better aligned for admin UI assets and route handling.

## Decision 2: Data persistence strategy
- Decision: Store `LinkConfig`, `LinkRecord`, and `CommandRun` in Cloudflare-managed persistent storage with indexed query support.
- Rationale: Feature requires relational lookup (`LinkRecord` many-to-one `LinkConfig`), filtering, and audit history.
- Alternatives considered:
  - KV-only storage: rejected due to weak relational query ergonomics.
  - External hosted database: rejected for v1 to reduce operational scope.

## Decision 3: JSON schema driven form behavior
- Decision: Treat JSON schema as authoritative source for LinkRecord form generation and server-side validation.
- Rationale: Ensures consistent input constraints between UI and persistence, minimizing drift.
- Alternatives considered:
  - Client-only validation: rejected due to tampering risk and inconsistent enforcement.
  - Fixed field model: rejected because it conflicts with configurable schema requirement.

## Decision 4: Command template rendering safety
- Decision: Use placeholder substitution with strict variable whitelist derived from schema fields; reject unresolved or extra variables.
- Rationale: Prevents malformed commands and accidental placeholder leakage to execution endpoint.
- Alternatives considered:
  - Free-form templating with arbitrary expressions: rejected due to injection/safety risk.
  - No template validation at config time: rejected because failures would shift to runtime.

## Decision 5: Cloud-to-local execution handshake
- Decision: Backend dispatches generated command payload to user-local Go service endpoint with request authentication metadata and run identifier.
- Rationale: Supports cloud configuration with local execution while preserving traceability per run.
- Alternatives considered:
  - Browser directly executes local command: rejected due to security and browser sandbox limitations.
  - Poll-based local agent pulling tasks: deferred as possible future enhancement.

## Decision 6: Go local client execution model
- Decision: Implement local client as an HTTP service in Go that validates payload, enforces command safety policy, executes allowed command, and returns structured status.
- Rationale: Go provides cross-platform packaging and reliable process handling for local environments.
- Alternatives considered:
  - Shell script client: rejected due to portability and maintainability concerns.
  - Desktop GUI agent: rejected for v1 due to increased scope.

## Decision 7: Observability and audit trail
- Decision: Persist command-run lifecycle events (requested, accepted/rejected, completed/failed, timeout) with actor and timestamps.
- Rationale: Required by spec for compliance, troubleshooting, and user feedback.
- Alternatives considered:
  - Ephemeral logs only: rejected because historical run status is mandatory.
  - Audit only on failures: rejected because complete traceability is needed.

## Decision 8: Performance and scale assumptions
- Decision: Optimize for SMB-scale operational usage (hundreds of configs, tens of thousands of records, low thousands of daily runs).
- Rationale: Matches initial rollout scope and keeps design simple while preserving headroom.
- Alternatives considered:
  - Internet-scale multi-tenant assumptions from day one: rejected as premature complexity.
