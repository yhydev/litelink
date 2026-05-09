package safety

import "testing"

func TestValidateCommandRejectsWindowsDangerousTokens(t *testing.T) {
	tests := []string{
		"DEL /F /S /Q C:\\temp\\*",
		"rmdir /s /q C:\\Windows\\Temp",
		"format c:",
	}

	for _, tc := range tests {
		if err := ValidateCommand(tc); err == nil {
			t.Fatalf("expected rejection for command %q", tc)
		}
	}
}

func TestValidateCommandAcceptsCommonSafeCommand(t *testing.T) {
	if err := ValidateCommand("echo hello"); err != nil {
		t.Fatalf("expected command to pass, got error: %v", err)
	}
}
