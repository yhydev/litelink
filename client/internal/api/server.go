package api

import (
	"context"
	"net/http"
	"time"
)

type Server struct {
	httpServer *http.Server
}

func NewServer(listenAddr string) *Server {
	return NewServerWithLock(listenAddr, false, "", 0)
}

func NewServerWithLock(listenAddr string, masterPasswordMode bool, masterPassword string, idleLockAfter time.Duration) *Server {
	mux := http.NewServeMux()
	locker := NewLockManager(masterPasswordMode, masterPassword, idleLockAfter)
	mux.HandleFunc("/local/execute", ExecuteHandler(locker))
	mux.HandleFunc("/local/unlock", UnlockHandler(locker))

	return &Server{
		httpServer: &http.Server{
			Addr:    listenAddr,
			Handler: mux,
		},
	}
}

func (s *Server) Start() error {
	return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	return s.httpServer.Shutdown(ctx)
}
