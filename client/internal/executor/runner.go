package executor

import (
	"context"
	"os/exec"
	"runtime"
	"time"
)

type Result struct {
	Status  string
	Message string
}

func RunCommand(command string, timeout time.Duration) Result {
	if runtime.GOOS == "windows" {
		cmd := commandContextForOS(context.Background(), command)
		if err := cmd.Start(); err != nil {
			return Result{Status: "failed", Message: err.Error()}
		}
		return Result{Status: "succeeded", Message: "command launched in new window"}
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := commandContextForOS(ctx, command)
	output, err := cmd.CombinedOutput()
	if ctx.Err() == context.DeadlineExceeded {
		return Result{Status: "timeout", Message: "command timeout"}
	}
	if err != nil {
		return Result{Status: "failed", Message: string(output)}
	}
	return Result{Status: "succeeded", Message: string(output)}
}

func commandContextForOS(ctx context.Context, command string) *exec.Cmd {
	if runtime.GOOS == "windows" {
		return exec.CommandContext(ctx, "cmd", "/C", "start", "", "cmd", "/C", command)
	}
	return exec.CommandContext(ctx, "sh", "-c", command)
}
