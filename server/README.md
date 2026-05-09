# Litelink Server

## Local endpoint configuration

- Default local client endpoint: `http://127.0.0.1:8788/local/execute`
- Client listen address is controlled by `LITELINK_CLIENT_ADDR`
- Server dispatch target should be configurable per environment before production use

## Dispatch safety controls

- Require idempotency header (`idempotency-key` or `x-idempotency-key`) for dispatch calls.
- Duplicate dispatch attempts within the replay window are rejected with HTTP 429.
- Local command execution is protected by a deny-token policy in client safety checks.
