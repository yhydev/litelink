package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	ListenAddress       string
	MasterPassword      string
	IdleLockAfter       time.Duration
	MasterPasswordMode  bool
}

func Load() Config {
	addr := os.Getenv("LITELINK_CLIENT_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8788"
	}

	masterPassword := strings.TrimSpace(os.Getenv("LITELINK_MASTER_PASSWORD"))
	idleLockAfter := parseIdleLockSeconds(os.Getenv("LITELINK_IDLE_LOCK_SECONDS"))

	return Config{
		ListenAddress:      addr,
		MasterPassword:     masterPassword,
		IdleLockAfter:      idleLockAfter,
		MasterPasswordMode: masterPassword != "",
	}
}

func parseIdleLockSeconds(raw string) time.Duration {
	if raw == "" {
		return 5 * time.Minute
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v < 30 {
		return 5 * time.Minute
	}
	if v > 86400 {
		return 24 * time.Hour
	}
	return time.Duration(v) * time.Second
}
