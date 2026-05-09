# Data Model - Configure Link Commands

## LinkConfig
- Purpose: Defines a reusable command workflow template.
- Fields:
  - `id` (string, immutable)
  - `name` (string, required, unique among active configs)
  - `description` (string, optional)
  - `schema` (object, required; valid JSON Schema subset)
  - `commandTemplate` (string, required)
  - `status` (enum: `active`, `inactive`)
  - `createdBy` (string, required)
  - `createdAt` (datetime, required)
  - `updatedBy` (string, required)
  - `updatedAt` (datetime, required)
- Validation Rules:
  - `schema` must parse and include deterministic field keys.
  - `commandTemplate` placeholders must map to schema-defined field keys.
  - Deactivated configs cannot be chosen for new records.

## LinkRecord
- Purpose: Stores one schema-conformant data instance for a selected LinkConfig.
- Fields:
  - `id` (string, immutable)
  - `linkConfigId` (string, required, FK to LinkConfig)
  - `values` (object, required)
  - `status` (enum: `active`, `archived`)
  - `createdBy` (string, required)
  - `createdAt` (datetime, required)
  - `updatedBy` (string, required)
  - `updatedAt` (datetime, required)
- Validation Rules:
  - `linkConfigId` must reference an existing LinkConfig.
  - `values` must satisfy selected LinkConfig schema.
  - Unknown keys are rejected unless schema explicitly allows additional properties.

## CommandRun
- Purpose: Represents one attempt to generate/dispatch/execute a command.
- Fields:
  - `id` (string, immutable)
  - `linkConfigId` (string, required)
  - `linkRecordId` (string, required)
  - `renderedCommand` (string, required)
  - `dispatchTarget` (string, required; local endpoint identity)
  - `requestStatus` (enum: `accepted`, `rejected`, `timeout`)
  - `executionStatus` (enum: `pending`, `running`, `succeeded`, `failed`, `cancelled`)
  - `statusMessage` (string, optional)
  - `requestedBy` (string, required)
  - `requestedAt` (datetime, required)
  - `completedAt` (datetime, optional)
- Validation Rules:
  - `renderedCommand` must have no unresolved placeholders.
  - `requestStatus=accepted` requires local endpoint acknowledgment.
  - `completedAt` required when execution reaches terminal state.

## AuditEvent
- Purpose: Immutable trace log for config/record/run operations.
- Fields:
  - `id` (string, immutable)
  - `actorId` (string, required)
  - `actionType` (enum: `config.create`, `config.update`, `config.deactivate`, `record.create`, `record.update`, `run.request`, `run.result`)
  - `targetType` (enum: `LinkConfig`, `LinkRecord`, `CommandRun`)
  - `targetId` (string, required)
  - `metadata` (object, optional)
  - `createdAt` (datetime, required)

## Relationships
- One `LinkConfig` to many `LinkRecord`.
- One `LinkConfig` to many `CommandRun`.
- One `LinkRecord` to many `CommandRun`.
- One `User` (actor) to many `AuditEvent`.

## State Transitions

### LinkConfig
- `active -> inactive` (deactivation)
- `inactive -> active` (reactivation)

### CommandRun
- `pending -> running -> succeeded`
- `pending -> running -> failed`
- `pending -> timeout`
- `pending -> rejected`
- `running -> cancelled`
