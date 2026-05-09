package api

import (
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"strconv"
	"time"

	"litelink/client/internal/executor"
	"litelink/client/internal/safety"
)

type ExecuteRequest struct {
	Command string `json:"command"`
	RunID   string `json:"runId"`
	SentAt  string `json:"sentAt"`
}

type UnlockRequest struct {
	Password string `json:"password"`
}

type ExecuteResponse struct {
	RunID       string `json:"runId"`
	Status      string `json:"status"`
	Message     string `json:"message,omitempty"`
	CompletedAt string `json:"completedAt,omitempty"`
}

const defaultAutoCloseSeconds = 3

func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func execute(command string, runID string) ExecuteResponse {
	res := executor.RunCommand(command, 10*time.Second)
	return ExecuteResponse{
		RunID:       runID,
		Status:      res.Status,
		Message:     res.Message,
		CompletedAt: time.Now().UTC().Format(time.RFC3339),
	}
}

func ExecuteHandler(locker *LockManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		if r.Method != http.MethodPost && r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, ExecuteResponse{Status: "rejected", Message: "method not allowed"})
			return
		}

		now := time.Now()
		if locker != nil && locker.IsLocked(now) {
			payload := ExecuteResponse{Status: "locked", Message: "client locked, unlock required"}
			if r.Method == http.MethodGet {
				writeHTML(w, http.StatusLocked, payload, defaultAutoCloseSeconds)
				return
			}
			writeJSON(w, http.StatusLocked, payload)
			return
		}

		if r.Method == http.MethodGet {
			command := r.URL.Query().Get("command")
			if command == "" {
				writeHTML(w, http.StatusBadRequest, ExecuteResponse{Status: "rejected", Message: "missing command"}, defaultAutoCloseSeconds)
				return
			}

			autoCloseSeconds := parseAutoCloseSeconds(r.URL.Query().Get("closeAfter"))

			runID := r.URL.Query().Get("runId")
			if runID == "" {
				runID = fmt.Sprintf("get_%d", time.Now().UnixMilli())
			}

			if err := safety.ValidateCommand(command); err != nil {
				writeHTML(w, http.StatusBadRequest, ExecuteResponse{RunID: runID, Status: "rejected", Message: err.Error()}, autoCloseSeconds)
				return
			}

			writeHTML(w, http.StatusOK, execute(command, runID), autoCloseSeconds)
			if locker != nil {
				locker.Touch(now)
			}
			return
		}

		var req ExecuteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, ExecuteResponse{Status: "rejected", Message: "invalid json"})
			return
		}

		if req.RunID == "" || req.Command == "" {
			writeJSON(w, http.StatusBadRequest, ExecuteResponse{Status: "rejected", Message: "missing command or runId"})
			return
		}

		if err := safety.ValidateCommand(req.Command); err != nil {
			writeJSON(w, http.StatusBadRequest, ExecuteResponse{RunID: req.RunID, Status: "rejected", Message: err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, execute(req.Command, req.RunID))
		if locker != nil {
			locker.Touch(now)
		}
	}
}

func UnlockHandler(locker *LockManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w)

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, ExecuteResponse{Status: "rejected", Message: "method not allowed"})
			return
		}

		if locker == nil || !locker.enabled {
			writeJSON(w, http.StatusOK, ExecuteResponse{Status: "ok", Message: "master password mode disabled"})
			return
		}

		var req UnlockRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, ExecuteResponse{Status: "rejected", Message: "invalid json"})
			return
		}

		if req.Password == "" {
			writeJSON(w, http.StatusBadRequest, ExecuteResponse{Status: "rejected", Message: "missing password"})
			return
		}

		if !locker.Unlock(req.Password, time.Now()) {
			writeJSON(w, http.StatusUnauthorized, ExecuteResponse{Status: "rejected", Message: "invalid master password"})
			return
		}

		writeJSON(w, http.StatusOK, ExecuteResponse{Status: "ok", Message: "unlocked"})
	}
}

func writeJSON(w http.ResponseWriter, status int, payload ExecuteResponse) {
	setCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func parseAutoCloseSeconds(raw string) int {
	if raw == "" {
		return defaultAutoCloseSeconds
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v < 1 {
		return defaultAutoCloseSeconds
	}
	if v > 30 {
		return 30
	}
	return v
}

func writeHTML(w http.ResponseWriter, status int, payload ExecuteResponse, autoCloseSeconds int) {
	setCORSHeaders(w)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)

	runID := html.EscapeString(payload.RunID)
	state := html.EscapeString(payload.Status)
	message := html.EscapeString(payload.Message)

	body := fmt.Sprintf(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Command Launch</title>
</head>
<body>
  <h1>Command Status</h1>
  <p><strong>runId:</strong> %s</p>
  <p><strong>status:</strong> %s</p>
  <p><strong>message:</strong> %s</p>
  <p>This page closes in %d second(s).</p>
  <script>
    setTimeout(function () { window.close(); }, %d);
  </script>
</body>
</html>`, runID, state, message, autoCloseSeconds, autoCloseSeconds*1000)

	_, _ = w.Write([]byte(body))
}
