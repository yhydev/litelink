import { auditCommandRunRequested, auditCommandRunResult } from "../audit/command-run-audit"
import { dispatchToLocalEndpoint } from "./local-dispatch"
import { renderTemplateCommand } from "../validation/template-renderer"
import { CommandRun } from "./command-run.types"
import { Repository } from "./repository"

export class CommandRunService {
  constructor(private readonly repo: Repository) {}

  async render(recordId: string): Promise<{ renderedCommand: string; unresolvedVariables: string[]; linkConfigId: string }> {
    const record = await this.repo.getLinkRecordById(recordId)
    if (!record) {
      throw new Response(JSON.stringify({ error: "record_not_found" }), { status: 404 })
    }

    const config = await this.repo.getLinkConfigById(record.link_config_id)
    if (!config) {
      throw new Response(JSON.stringify({ error: "config_not_found" }), { status: 404 })
    }

    const values = JSON.parse(record.values_json) as Record<string, unknown>
    const rendered = renderTemplateCommand(config.command_template, values)
    return {
      renderedCommand: rendered.command,
      unresolvedVariables: rendered.unresolvedVariables,
      linkConfigId: config.id,
    }
  }

  async dispatch(input: {
    recordId: string
    localEndpoint: string
    actorId: string
  }): Promise<CommandRun> {
    const rendered = await this.render(input.recordId)
    if (rendered.unresolvedVariables.length > 0) {
      throw new Response(
        JSON.stringify({ error: "unresolved_variables", unresolvedVariables: rendered.unresolvedVariables }),
        { status: 422 }
      )
    }

    const runId = `run_${crypto.randomUUID()}`
    const now = new Date().toISOString()
    await auditCommandRunRequested(this.repo, input.actorId, runId)

    let requestStatus: CommandRun["requestStatus"] = "accepted"
    let executionStatus: CommandRun["executionStatus"] = "pending"
    let statusMessage = "accepted"
    let completedAt: string | undefined

    try {
      const dispatchResult = await dispatchToLocalEndpoint(input.localEndpoint, {
        runId,
        command: rendered.renderedCommand,
        sentAt: now,
      })

      if (!dispatchResult.accepted) {
        requestStatus = dispatchResult.status === 408 ? "timeout" : "rejected"
        executionStatus = "failed"
        statusMessage = `dispatch_failed_${dispatchResult.status}`
        completedAt = new Date().toISOString()
      } else {
        executionStatus = "running"
        statusMessage = "dispatched"
      }
    } catch {
      requestStatus = "timeout"
      executionStatus = "failed"
      statusMessage = "dispatch_exception"
      completedAt = new Date().toISOString()
    }

    await this.repo.createCommandRun({
      id: runId,
      linkConfigId: rendered.linkConfigId,
      linkRecordId: input.recordId,
      renderedCommand: rendered.renderedCommand,
      dispatchTarget: input.localEndpoint,
      requestStatus,
      executionStatus,
      statusMessage,
      requestedBy: input.actorId,
      requestedAt: now,
      completedAt,
    })

    await auditCommandRunResult(this.repo, input.actorId, runId, executionStatus)

    return {
      id: runId,
      linkConfigId: rendered.linkConfigId,
      linkRecordId: input.recordId,
      renderedCommand: rendered.renderedCommand,
      dispatchTarget: input.localEndpoint,
      requestStatus,
      executionStatus,
      statusMessage,
      requestedBy: input.actorId,
      requestedAt: now,
      completedAt,
    }
  }

  async listRuns(): Promise<CommandRun[]> {
    const rows = await this.repo.listCommandRuns()
    return rows.map((row) => ({
      id: row.id,
      linkConfigId: row.link_config_id,
      linkRecordId: row.link_record_id,
      renderedCommand: row.rendered_command,
      dispatchTarget: row.dispatch_target,
      requestStatus: row.request_status,
      executionStatus: row.execution_status,
      statusMessage: row.status_message ?? undefined,
      requestedBy: row.requested_by,
      requestedAt: row.requested_at,
      completedAt: row.completed_at ?? undefined,
    }))
  }
}
