package api

import (
	"crypto/subtle"
	"sync"
	"time"
)

type LockManager struct {
	enabled      bool
	password     string
	idleLockAfter time.Duration

	mu           sync.Mutex
	unlocked     bool
	lastActivity time.Time
}

func NewLockManager(enabled bool, password string, idleLockAfter time.Duration) *LockManager {
	return &LockManager{
		enabled:       enabled,
		password:      password,
		idleLockAfter: idleLockAfter,
		unlocked:      !enabled,
		lastActivity:  time.Now(),
	}
}

func (m *LockManager) IsLocked(now time.Time) bool {
	if m == nil || !m.enabled {
		return false
	}
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.unlocked && now.Sub(m.lastActivity) >= m.idleLockAfter {
		m.unlocked = false
	}
	return !m.unlocked
}

func (m *LockManager) Touch(now time.Time) {
	if m == nil || !m.enabled {
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.unlocked {
		m.lastActivity = now
	}
}

func (m *LockManager) Unlock(password string, now time.Time) bool {
	if m == nil || !m.enabled {
		return true
	}
	if subtle.ConstantTimeCompare([]byte(password), []byte(m.password)) != 1 {
		return false
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.unlocked = true
	m.lastActivity = now
	return true
}
