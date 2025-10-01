#!/bin/bash

# Play sound helper - runs afplay in background

SOUND_FILE="$1"

if [ -z "$SOUND_FILE" ]; then
    echo "Usage: $0 <sound_type>"
    echo "Types: alert, success, agent"
    exit 1
fi

case "$SOUND_FILE" in
    alert)
        afplay "/System/Library/Sounds/Glass.aiff" 2>/dev/null &
        ;;
    success)
        afplay "/System/Library/Sounds/Hero.aiff" 2>/dev/null &
        ;;
    agent)
        afplay "/System/Library/Sounds/Ping.aiff" 2>/dev/null &
        ;;
    *)
        echo "Unknown sound type: $SOUND_FILE"
        exit 1
        ;;
esac