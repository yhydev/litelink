# Feature Specification: Configure Link Commands

**Feature Branch**: `[001-configure-link-commands]`  
**Created**: 2026-05-09  
**Status**: Draft  
**Input**: User description: "帮我实现一个这样的后台管理程序，它可以配置LinkConfig，LinkConfig是由json schema + command template 组成的记录。json schema 会渲染command template。并且可以配置LinkRecord，它是json schema的数据组成，并且与LinkConfig是多对1关系，当用户添加LinkRecord时，需要选择LinkConfig，然后页面通过json schema渲染表单，然后提交到后台保存到LinkConfig。而command template的作用是用来生成一个命令，用于用户在页面上点击LinkConfig记录时，调用本地的一个接口，然后把它传入接口本地接口，本地接口程序就会运行这个命令行。从而实现云上一次配置，就可以运行自己的命令行程序。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Reusable Link Template (Priority: P1)

As an admin, I can create and manage a LinkConfig that defines a structured input schema and a command template, so business users can reuse one cloud-side configuration to run their local command workflows consistently.

**Why this priority**: This is the core capability; without LinkConfig, no records can be created and no commands can be generated.

**Independent Test**: Can be fully tested by creating a LinkConfig with valid schema and template, saving it, reopening it, and confirming it is listed and editable.

**Acceptance Scenarios**:

1. **Given** an admin is on the LinkConfig creation page, **When** they submit a valid name, valid JSON schema, and valid command template, **Then** the system saves the LinkConfig and shows it in the LinkConfig list.
2. **Given** an existing LinkConfig, **When** the admin updates its schema or template, **Then** the system stores the new version and uses it for future LinkRecord creation.
3. **Given** invalid schema content or missing required fields, **When** the admin submits, **Then** the system rejects the save and provides clear validation feedback.

---

### User Story 2 - Create LinkRecord From Selected LinkConfig (Priority: P2)

As an operator, I can select one LinkConfig and complete a dynamically rendered form to create a LinkRecord, so each record captures schema-based business input tied to exactly one configuration.

**Why this priority**: Records are the operational data used to produce executable commands; this enables day-to-day usage after setup.

**Independent Test**: Can be fully tested by selecting a LinkConfig, completing rendered fields, saving a LinkRecord, and verifying the LinkRecord is linked to that LinkConfig.

**Acceptance Scenarios**:

1. **Given** multiple LinkConfigs exist, **When** the user starts creating a LinkRecord, **Then** they must select one LinkConfig before form fields are shown.
2. **Given** a LinkConfig is selected, **When** the page loads the associated schema, **Then** the form renders all required and optional fields defined by that schema.
3. **Given** the user submits valid form values, **When** the record is saved, **Then** the system stores the values as one LinkRecord associated with the selected LinkConfig.

---

### User Story 3 - Generate and Trigger Local Command (Priority: P3)

As an operator, I can click a LinkConfig-related action to generate a command from template plus record data and send it to a local execution endpoint, so configured workflows can be run locally without manual command assembly.

**Why this priority**: This delivers the final business outcome (one-time cloud configuration, repeated local execution), but depends on both configuration and records.

**Independent Test**: Can be fully tested by selecting a LinkRecord, triggering command generation, and verifying the local endpoint receives the generated command and returns execution status.

**Acceptance Scenarios**:

1. **Given** a LinkConfig template and linked LinkRecord data exist, **When** the user clicks run, **Then** the system generates a command string by rendering template placeholders with LinkRecord values.
2. **Given** a generated command is ready, **When** the run action is confirmed, **Then** the system sends the command to the configured local endpoint and shows success or failure feedback.
3. **Given** template placeholders are missing corresponding data values, **When** command generation is attempted, **Then** the system blocks execution and reports which fields are missing.

---

### Edge Cases

- A LinkConfig is selected for LinkRecord creation but has an empty or malformed schema.
- A user tries to submit a LinkRecord where required schema fields are missing or wrong type.
- A LinkConfig is edited after records already exist; existing records remain intact and usable with compatible fields.
- Command template references fields not present in the selected LinkRecord.
- Local endpoint is unreachable, times out, or returns execution failure.
- Generated command exceeds allowed length or contains unsafe control characters.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authorized admins to create, view, edit, and deactivate LinkConfig records.
- **FR-002**: Each LinkConfig MUST include at minimum a unique display name, a JSON schema definition, and a command template.
- **FR-003**: System MUST validate LinkConfig schema and template format before saving and reject invalid entries with actionable error messages.
- **FR-004**: System MUST allow users to create LinkRecord entries only after selecting exactly one active LinkConfig.
- **FR-005**: System MUST render the LinkRecord input form dynamically based on the selected LinkConfig schema.
- **FR-006**: System MUST validate submitted LinkRecord values against the selected schema rules before persistence.
- **FR-007**: System MUST store each LinkRecord with a mandatory many-to-one association to its LinkConfig.
- **FR-008**: System MUST allow users to view LinkRecords grouped or filterable by LinkConfig.
- **FR-009**: System MUST generate a command by combining a LinkConfig command template with a chosen LinkRecord’s stored values.
- **FR-010**: System MUST prevent command execution when required template variables are unresolved and show the unresolved variable list.
- **FR-011**: System MUST provide a user action to send the generated command to a configured local execution endpoint.
- **FR-012**: System MUST display execution request result status (accepted, failed, timeout) with timestamp for each run attempt.
- **FR-013**: System MUST maintain an audit trail of create/update/run actions including actor, target record, and time.
- **FR-014**: System MUST enforce role-based permissions so only permitted users can manage LinkConfig and execute commands.

### Key Entities *(include if feature involves data)*

- **LinkConfig**: Reusable configuration template containing name, schema definition, command template, status, ownership/audit metadata.
- **LinkRecord**: Schema-conformant data instance created from one LinkConfig; includes values payload, creation metadata, and LinkConfig reference.
- **CommandRun**: Execution attempt generated from one LinkConfig + one LinkRecord; includes rendered command, submission status, result summary, and timestamps.
- **UserRole**: Permission profile that determines who can manage configurations, manage records, and trigger command execution.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of admins can create a valid LinkConfig (schema + template) in under 5 minutes on first attempt.
- **SC-002**: 95% of operators can create and save a LinkRecord from a selected LinkConfig in under 3 minutes.
- **SC-003**: 99% of command generation attempts for valid LinkRecord data complete without manual correction.
- **SC-004**: 95% of execution attempts show a clear success/failure status message to users within 10 seconds of trigger.
- **SC-005**: At least 90% of pilot users report they can run local workflows without manually composing command strings.

## Assumptions

- The organization already has authenticated users, and this feature reuses existing identity access controls.
- A local execution service exists per user environment and can receive command requests from the management system.
- Initial release targets desktop and laptop browser usage; advanced mobile workflow optimization is out of scope.
- LinkConfig deactivation does not delete existing LinkRecords; historical records remain queryable.
- Data retention and audit log retention follow existing organizational policy unless superseded later.
