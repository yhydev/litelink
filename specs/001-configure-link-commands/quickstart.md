# Quickstart - Configure Link Commands

## 1) Prepare environment
1. Configure Cloudflare deployment for `server/` (Pages + Worker runtime bindings).
2. Configure persistent storage bindings for feature data.
3. Build and run the Go local client from `client/` on a developer machine.

## 2) Create a LinkConfig
1. Open the admin page.
2. Create a new LinkConfig with:
   - Name and optional description
   - JSON schema describing input fields
   - Command template referencing schema fields
3. Save and confirm the LinkConfig appears in the list.

## 3) Create a LinkRecord
1. Start a new LinkRecord.
2. Select the target LinkConfig.
3. Complete the schema-rendered form fields.
4. Save and verify the record is linked to the selected LinkConfig.

## 4) Render and dispatch command
1. From a LinkRecord action menu, choose command preview/run.
2. Verify rendered command preview resolves all variables.
3. Dispatch command to the configured local endpoint.
4. Confirm run status transitions to accepted and then terminal state.

## 5) Validate outcomes
1. Confirm run status and timestamps are visible in history.
2. Confirm audit entries exist for config update, record create, and run execution.
3. Confirm failure states display actionable messages (schema error, unresolved variable, endpoint unreachable).

## 6) Test checklist
1. LinkConfig validation rejects invalid schema/template.
2. LinkRecord validation enforces schema requirements.
3. Unresolved template variables block dispatch.
4. Local client safety policy rejects disallowed commands.
5. End-to-end happy path succeeds from config creation to local execution result.

## 7) Operational notes
1. For dispatch replay protection, set `idempotency-key` header for every dispatch request.
2. If dispatch returns duplicate/rate-limit errors, wait for replay window expiration and retry with a new key.
3. Keep local client endpoint bound to loopback (`127.0.0.1`) in default deployments.
