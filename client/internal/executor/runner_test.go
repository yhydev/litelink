package executor

import (
	"context"
	"path/filepath"
	"runtime"
	"testing"
)

func TestCommandContextForOS(t *testing.T) {
	ctx := context.Background()
	cmd := commandContextForOS(ctx, "echo hi")

	if runtime.GOOS == "windows" {
		if filepath.Base(cmd.Path) != "cmd" {
			t.Fatalf("expected windows shell cmd, got %s", cmd.Path)
		}
		if len(cmd.Args) < 3 || cmd.Args[1] != "/C" {
			t.Fatalf("expected cmd /C args, got %#v", cmd.Args)
		}
		return
	}

	if filepath.Base(cmd.Path) != "sh" {
		t.Fatalf("expected unix shell sh, got %s", cmd.Path)
	}
	if len(cmd.Args) < 3 || cmd.Args[1] != "-c" {
		t.Fatalf("expected sh -c args, got %#v", cmd.Args)
	}
}
