package safety

import "strings"

var blockedTokens = []string{
	"rm -rf /",
	":(){:|:&};:",
	"shutdown",
	"del /f /s /q",
	"rmdir /s /q",
	"format ",
}

func ValidateCommand(command string) error {
	trimmed := strings.TrimSpace(command)
	if trimmed == "" {
		return ErrUnsafeCommand("empty command")
	}
	lower := strings.ToLower(trimmed)
	for _, token := range blockedTokens {
		if strings.Contains(lower, strings.ToLower(token)) {
			return ErrUnsafeCommand("blocked token detected")
		}
	}
	return nil
}

type unsafeCommandError struct {
	reason string
}

func (e unsafeCommandError) Error() string { return e.reason }

func ErrUnsafeCommand(reason string) error {
	return unsafeCommandError{reason: reason}
}
