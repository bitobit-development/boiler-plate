#!/bin/bash

# Claude Code Notification System
# Monitors input/output and plays sounds for specific keywords

# Sound file paths (macOS system sounds)
ALERT_SOUND="/System/Library/Sounds/Glass.aiff"
SUCCESS_SOUND="/System/Library/Sounds/Hero.aiff"
AGENT_SOUND="/System/Library/Sounds/Ping.aiff"

# Function to play sound
play_sound() {
    if [ -f "$1" ]; then
        afplay "$1" &
    fi
}

# Monitor stdin/stdout for keywords
while IFS= read -r line; do
    echo "$line"  # Pass through the line

    # Check for ACTION REQUIRED
    if echo "$line" | grep -q "⚠️ ACTION REQUIRED"; then
        play_sound "$ALERT_SOUND"
    fi

    # Check for TASK COMPLETE
    if echo "$line" | grep -q "✅ TASK COMPLETE"; then
        play_sound "$SUCCESS_SOUND"
    fi

    # Check for Agent COMPLETE
    if echo "$line" | grep -q "✅ Agent:.*COMPLETE"; then
        play_sound "$AGENT_SOUND"
    fi
done