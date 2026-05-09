package main

import (
	"log"

	"litelink/client/internal/api"
	"litelink/client/internal/config"
)

func main() {
	cfg := config.Load()
	log.Printf("link-client starting on %s", cfg.ListenAddress)
	if cfg.MasterPasswordMode {
		log.Printf("master password mode enabled, idle lock after %s", cfg.IdleLockAfter)
	}
	srv := api.NewServerWithLock(cfg.ListenAddress, cfg.MasterPasswordMode, cfg.MasterPassword, cfg.IdleLockAfter)
	if err := srv.Start(); err != nil {
		log.Fatal(err)
	}
}
