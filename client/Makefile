APP_NAME := link-client
CMD_PATH := ./cmd/link-client
BIN_DIR := ./bin

GO ?= go

.PHONY: build build-linux build-windows build-all clean test

.DEFAULT_GOAL := build-all

build:
	$(GO) build -o $(BIN_DIR)/$(APP_NAME) $(CMD_PATH)

build-linux:
	GOOS=linux GOARCH=amd64 $(GO) build -o $(BIN_DIR)/$(APP_NAME)-linux-amd64 $(CMD_PATH)
	GOOS=linux GOARCH=arm64 $(GO) build -o $(BIN_DIR)/$(APP_NAME)-linux-arm64 $(CMD_PATH)

build-windows:
	GOOS=windows GOARCH=amd64 $(GO) build -o $(BIN_DIR)/$(APP_NAME)-windows-amd64.exe $(CMD_PATH)
	GOOS=windows GOARCH=arm64 $(GO) build -o $(BIN_DIR)/$(APP_NAME)-windows-arm64.exe $(CMD_PATH)

build-all: build-linux build-windows

test:
	$(GO) test ./...

clean:
	rm -rf $(BIN_DIR)
