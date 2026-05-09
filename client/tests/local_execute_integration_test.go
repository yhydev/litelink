package tests

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"litelink/client/internal/api"
)

func TestLocalExecuteRejectsInvalidPayload(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/local/execute", bytes.NewBufferString(`{"command":""}`))
	rr := httptest.NewRecorder()

	api.ExecuteHandler(nil)(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected %d, got %d", http.StatusBadRequest, rr.Code)
	}
}

func TestLocalExecuteGetRunsCommand(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/local/execute?command=echo%20hello&runId=get-1", nil)
	rr := httptest.NewRecorder()

	api.ExecuteHandler(nil)(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected %d, got %d", http.StatusOK, rr.Code)
	}

	body := rr.Body.String()
	if !strings.Contains(body, "get-1") {
		t.Fatalf("expected body to include runId get-1, got: %s", body)
	}

	if !strings.Contains(body, "text/html") && rr.Header().Get("Content-Type") != "text/html; charset=utf-8" {
		t.Fatalf("expected html content type, got %s", rr.Header().Get("Content-Type"))
	}
}

func TestLocalExecuteGetRejectsMissingCommand(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/local/execute", nil)
	rr := httptest.NewRecorder()

	api.ExecuteHandler(nil)(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected %d, got %d", http.StatusBadRequest, rr.Code)
	}
}
