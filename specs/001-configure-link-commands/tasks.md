# Tasks: Configure Link Commands

**Input**: Design documents from `/specs/001-configure-link-commands/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No explicit TDD mandate in spec; implementation tasks include verification checkpoints and quickstart validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and baseline runtime configuration

- [X] T001 Create Cloudflare environment configuration in `server/wrangler.toml`
- [X] T002 Create server package/workspace scripts for build and deploy in `server/package.json`
- [X] T003 [P] Create Go client module and executable entrypoint in `client/go.mod` and `client/cmd/link-client/main.go`
- [X] T004 [P] Create shared documentation for local endpoint configuration in `client/internal/config/config.go` and `server/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Define persistence schema for LinkConfig, LinkRecord, CommandRun, and AuditEvent in `server/functions/db/schema.sql`
- [X] T006 Implement data-access layer for core entities in `server/functions/services/repository.ts`
- [X] T007 [P] Implement authentication and role guard middleware in `server/functions/api/middleware/auth.ts`
- [X] T008 [P] Implement audit event writer utility in `server/functions/audit/audit-service.ts`
- [X] T009 [P] Implement JSON schema validation utility in `server/functions/validation/schema-validator.ts`
- [X] T010 [P] Implement command template rendering utility with unresolved-variable detection in `server/functions/validation/template-renderer.ts`
- [X] T011 Implement API router bootstrap and error envelope in `server/functions/api/router.ts`
- [X] T012 Implement local dispatch client with timeout/retry policy in `server/functions/services/local-dispatch.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Configure Reusable Link Template (Priority: P1) 🎯 MVP

**Goal**: Let admins create, view, edit, and deactivate LinkConfig with schema/template validation.

**Independent Test**: Admin can create valid LinkConfig, see it listed, edit it, and receive clear errors for invalid schema/template.

### Implementation for User Story 1

- [X] T013 [P] [US1] Implement LinkConfig entity types and DTOs in `server/functions/services/link-config.types.ts`
- [X] T014 [US1] Implement LinkConfig create/list service logic in `server/functions/services/link-config.service.ts`
- [X] T015 [US1] Implement LinkConfig update/deactivate service logic in `server/functions/services/link-config.service.ts`
- [X] T016 [US1] Implement `GET /api/link-configs` and `POST /api/link-configs` handlers in `server/functions/api/link-configs.ts`
- [X] T017 [US1] Implement `PATCH /api/link-configs/{configId}` handler in `server/functions/api/link-config-by-id.ts`
- [X] T018 [P] [US1] Build LinkConfig list page in `server/web/pages/link-configs/index.tsx`
- [X] T019 [P] [US1] Build LinkConfig create/edit form with schema/template fields in `server/web/components/link-config/LinkConfigForm.tsx`
- [X] T020 [US1] Wire LinkConfig UI data calls and validation messages in `server/web/services/link-config-api.ts`
- [X] T021 [US1] Record create/update/deactivate audit actions for LinkConfig in `server/functions/audit/link-config-audit.ts`

**Checkpoint**: User Story 1 is independently functional and testable

---

## Phase 4: User Story 2 - Create LinkRecord From Selected LinkConfig (Priority: P2)

**Goal**: Let operators select a LinkConfig, render schema-driven form, and save LinkRecord linked to that config.

**Independent Test**: Operator selects active LinkConfig, fills rendered form, saves record, and sees the association persisted.

### Implementation for User Story 2

- [X] T022 [P] [US2] Implement LinkRecord entity types and DTOs in `server/functions/services/link-record.types.ts`
- [X] T023 [US2] Implement LinkRecord create/query service with LinkConfig association checks in `server/functions/services/link-record.service.ts`
- [X] T024 [US2] Implement `POST /api/link-records` handler in `server/functions/api/link-records.ts`
- [X] T025 [P] [US2] Implement schema-driven form renderer component in `server/web/components/link-record/SchemaDrivenForm.tsx`
- [X] T026 [P] [US2] Build LinkRecord create page with LinkConfig selector in `server/web/pages/link-records/new.tsx`
- [X] T027 [US2] Implement LinkRecord API client and submission error mapping in `server/web/services/link-record-api.ts`
- [X] T028 [US2] Implement LinkRecord list/filter by LinkConfig in `server/web/pages/link-records/index.tsx`
- [X] T029 [US2] Record create/update audit actions for LinkRecord in `server/functions/audit/link-record-audit.ts`

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - Generate and Trigger Local Command (Priority: P3)

**Goal**: Generate command from LinkConfig template + LinkRecord values and dispatch to local Go endpoint with status tracking.

**Independent Test**: Operator triggers run from a LinkRecord, command renders without unresolved variables, local endpoint executes, and run status is shown.

### Implementation for User Story 3

- [X] T030 [US3] Implement CommandRun entity types and lifecycle transitions in `server/functions/services/command-run.types.ts`
- [X] T031 [US3] Implement command render + run orchestration service in `server/functions/services/command-run.service.ts`
- [X] T032 [US3] Implement `POST /api/link-records/{recordId}/render-command` handler in `server/functions/api/link-record-render.ts`
- [X] T033 [US3] Implement `POST /api/link-records/{recordId}/dispatch` handler in `server/functions/api/link-record-dispatch.ts`
- [X] T034 [P] [US3] Build run action and command preview UI in `server/web/components/link-record/RunCommandPanel.tsx`
- [X] T035 [US3] Build command run history/status page in `server/web/pages/command-runs/index.tsx`
- [X] T036 [US3] Implement local execute endpoint request contract in `client/internal/api/execute_handler.go`
- [X] T037 [US3] Implement command safety policy and allow/deny evaluation in `client/internal/safety/policy.go`
- [X] T038 [US3] Implement OS command executor and status mapping in `client/internal/executor/runner.go`
- [X] T039 [US3] Wire local HTTP server routing and lifecycle in `client/internal/api/server.go`
- [X] T040 [US3] Record run request/result audit entries in `server/functions/audit/command-run-audit.ts`

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Hardening and end-to-end readiness across all stories

- [X] T041 [P] Add end-to-end flow verification script for quickstart journey in `server/tests/e2e/link-command-flow.spec.ts`
- [X] T042 [P] Add Go client integration verification for local execute contract in `client/tests/local_execute_integration_test.go`
- [X] T043 Improve failure UX copy for schema/template/dispatch errors in `server/web/components/common/ErrorNotice.tsx`
- [X] T044 Add rate limiting and replay protection checks for dispatch endpoint in `server/functions/api/middleware/dispatch-guard.ts`
- [X] T045 Update operator/admin runbook and setup instructions in `specs/001-configure-link-commands/quickstart.md` and `server/README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies, start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1, blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2 and reuses active LinkConfig data from US1 endpoints.
- **Phase 5 (US3)**: Depends on Phase 2 and requires LinkRecord flow from US2.
- **Phase 6 (Polish)**: Depends on completion of desired user stories.

### User Story Dependencies

- **US1 (P1)**: No dependency on other user stories; earliest MVP slice.
- **US2 (P2)**: Depends on LinkConfig management capabilities from US1.
- **US3 (P3)**: Depends on both LinkConfig (US1) and LinkRecord (US2).

### Within Each User Story

- Backend types/services before API handlers.
- API handlers before UI wiring.
- For local execution, safety policy before command runner before server route wiring.

### Parallel Opportunities

- Setup: `T003` and `T004` can run in parallel.
- Foundational: `T007`, `T008`, `T009`, `T010` can run in parallel after `T005`.
- US1: `T018` and `T019` can run in parallel while backend handlers are being finalized.
- US2: `T025` and `T026` can run in parallel.
- US3: `T034` can run in parallel with Go client tasks `T036`-`T039`.
- Polish: `T041` and `T042` can run in parallel.

---

## Parallel Example: User Story 3

```bash
Task: "T034 [US3] Build run action and command preview UI in server/web/components/link-record/RunCommandPanel.tsx"
Task: "T036 [US3] Implement local execute endpoint request contract in client/internal/api/execute_handler.go"
Task: "T037 [US3] Implement command safety policy and allow/deny evaluation in client/internal/safety/policy.go"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) only.
3. Validate admin can create/edit/deactivate LinkConfig with proper validation.

### Incremental Delivery

1. Ship US1 (config management) as MVP.
2. Add US2 (record creation) and validate independent operator flow.
3. Add US3 (command run + local dispatch) and validate full cloud-to-local workflow.
4. Finish with Phase 6 hardening and operational docs.

### Parallel Team Strategy

1. Team completes Setup + Foundational together.
2. Then split by capability:
   - Dev A: Server API and persistence
   - Dev B: Admin UI pages/components
   - Dev C: Go local client execution service
