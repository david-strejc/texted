#!/bin/bash

# TxtEd Server Management Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.server.pid"
LOG_FILE="$SCRIPT_DIR/.server.log"
PORT=8080

start_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Server is already running on port $PORT (PID: $PID)"
            return 1
        else
            rm "$PID_FILE"
        fi
    fi
    
    echo "Starting TxtEd server on port $PORT..."
    cd "$SCRIPT_DIR"
    nohup python3 -m http.server "$PORT" > "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    
    sleep 1
    if ps -p "$PID" > /dev/null; then
        echo "Server started successfully (PID: $PID)"
        echo "Access the editor at: http://localhost:$PORT"
    else
        echo "Failed to start server"
        rm -f "$PID_FILE"
        return 1
    fi
}

stop_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Stopping server (PID: $PID)..."
            kill "$PID"
            rm -f "$PID_FILE"
            echo "Server stopped"
        else
            echo "Server is not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        echo "Server is not running"
    fi
}

restart_server() {
    stop_server
    sleep 1
    start_server
}

status_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Server is running on port $PORT (PID: $PID)"
            echo "Access the editor at: http://localhost:$PORT"
        else
            echo "Server is not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        echo "Server is not running"
    fi
}

logs_server() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "No log file found"
    fi
}

case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        status_server
        ;;
    logs)
        logs_server
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the TxtEd server"
        echo "  stop     - Stop the TxtEd server"
        echo "  restart  - Restart the TxtEd server"
        echo "  status   - Check server status"
        echo "  logs     - View server logs (tail -f)"
        exit 1
        ;;
esac

exit 0