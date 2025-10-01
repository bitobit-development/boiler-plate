#!/bin/bash

# Test script for Claude Code notifications

echo "🔔 Testing notification sounds..."
echo ""

echo "1. Testing ACTION REQUIRED sound (Glass)..."
afplay "/System/Library/Sounds/Glass.aiff"
sleep 1

echo "2. Testing TASK COMPLETE sound (Hero)..."
afplay "/System/Library/Sounds/Hero.aiff"
sleep 1

echo "3. Testing Agent COMPLETE sound (Ping)..."
afplay "/System/Library/Sounds/Ping.aiff"

echo ""
echo "✅ Sound test complete!"