#!/usr/bin/env bash
# FlyHigh 2.0 — One-command local dev startup (Unix/Mac)
# Usage: ./start-dev.sh
#   Or:  ./start-dev.sh --docker     (use docker-compose)

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

if [ "${1:-}" = "--docker" ]; then
    echo -e "${CYAN}Starting all services via Docker...${NC}"
    docker-compose up -d
    echo ""
    echo -e "${GREEN}Services starting:${NC}"
    echo -e "${GREEN}  UI:        http://localhost:5173${NC}"
    echo -e "${GREEN}  Backend:   http://localhost:8081${NC}"
    echo -e "${GREEN}  Signaling: ws://localhost:5000${NC}"
    exit 0
fi

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  FlyHigh 2.0 — Local Dev Startup${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Load .env if present
if [ -f "$ROOT/.env" ]; then
    set -a; source "$ROOT/.env"; set +a
    echo -e "[OK] Loaded .env"
fi

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}[ERROR] Node.js not found${NC}"; exit 1; }
command -v java >/dev/null 2>&1 || { echo -e "${RED}[ERROR] Java not found${NC}"; exit 1; }
echo -e "  Node.js: $(node -v)"
echo -e "  Java: $(java -version 2>&1 | head -1)"

# Cleanup on Ctrl+C
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"
    kill $SIGNAL_PID $BACKEND_PID $UI_PID 2>/dev/null
    wait $SIGNAL_PID $BACKEND_PID $UI_PID 2>/dev/null
    echo -e "${YELLOW}All services stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start signaling server
echo -e "${GREEN}Starting Signaling Server on port 5000...${NC}"
cd "$ROOT/flyhigh-signaling-server"
node server.js &
SIGNAL_PID=$!
cd "$ROOT"

# Start backend
echo -e "${GREEN}Starting Backend on port 8081...${NC}"
cd "$ROOT/flyhigh-backend"
./mvnw spring-boot:run &
BACKEND_PID=$!
cd "$ROOT"

# Start frontend
echo -e "${GREEN}Starting Frontend on port 5173...${NC}"
cd "$ROOT/flyhigh-ui"
npm run dev &
UI_PID=$!
cd "$ROOT"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All services starting!${NC}"
echo -e "${GREEN}  UI:        http://localhost:5173${NC}"
echo -e "${GREEN}  Backend:   http://localhost:8081${NC}"
echo -e "${GREEN}  Signaling: ws://localhost:5000${NC}"
echo -e ""
echo -e "  Press Ctrl+C to stop all${NC}"
echo -e "${GREEN}========================================${NC}"

wait
