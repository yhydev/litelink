package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestLockManagerIdleTimeout(t *testing.T) {
	now := time.Now()
	manager := NewLockManager(true, "secret", 2*time.Second)

	if !manager.IsLocked(now) {
		t.Fatalf("expected initially locked")
	}

	if !manager.Unlock("secret", now) {
		t.Fatalf("expected unlock success")
	}

	if manager.IsLocked(now.Add(1 * time.Second)) {
		t.Fatalf("expected still unlocked before timeout")
	}

	if !manager.IsLocked(now.Add(3 * time.Second)) {
		t.Fatalf("expected locked after timeout")
	}
}

func TestUnlockHandlerAndExecuteLockFlow(t *testing.T) {
	locker := NewLockManager(true, "secret", 5*time.Minute)
	mux := http.NewServeMux()
	mux.HandleFunc("/local/unlock", UnlockHandler(locker))
	mux.HandleFunc("/local/execute", ExecuteHandler(locker))

	execReq := httptest.NewRequest(http.MethodPost, "/local/execute", bytes.NewBufferString(`{"runId":"r1","command":"echo hi"}`))
	execRes := httptest.NewRecorder()
	mux.ServeHTTP(execRes, execReq)
	if execRes.Code != http.StatusLocked {
		t.Fatalf("expected %d, got %d", http.StatusLocked, execRes.Code)
	}

	unlockBody, _ := json.Marshal(UnlockRequest{Password: "secret"})
	unlockReq := httptest.NewRequest(http.MethodPost, "/local/unlock", bytes.NewReader(unlockBody))
	unlockRes := httptest.NewRecorder()
	mux.ServeHTTP(unlockRes, unlockReq)
	if unlockRes.Code != http.StatusOK {
		t.Fatalf("expected %d, got %d", http.StatusOK, unlockRes.Code)
	}
}
