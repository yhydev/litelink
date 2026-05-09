package main

import (
	"log"

	"litelink/client/internal/api"
	"litelink/client/internal/config"
)

func main() {
	cfg := config.Load()
	log.Printf("link-client starting on %s", cfg.ListenAddress)
	srv := api.NewServer(cfg.ListenAddress)
	if err := srv.Start(); err != nil {
		log.Fatal(err)
	}
}
