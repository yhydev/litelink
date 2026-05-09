package config

import "os"

type Config struct {
	ListenAddress string
}

func Load() Config {
	addr := os.Getenv("LITELINK_CLIENT_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8788"
	}

	return Config{ListenAddress: addr}
}
