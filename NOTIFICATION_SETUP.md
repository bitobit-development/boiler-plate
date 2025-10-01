# Claude Code Notification System

Audio notifications for Claude Code actions and completions.

## 🔔 Notification Types

| Prefix | Sound | When It Plays |
|--------|-------|---------------|
| `⚠️ ACTION REQUIRED` | Glass.aiff | Claude needs your input or decision |
| `✅ TASK COMPLETE` | Hero.aiff | A task has been completed |
| `✅ Agent: [Name] - COMPLETE` | Ping.aiff | An agent has finished their work |

---

## 🚀 Quick Start

### Option 1: Manual Sound Testing (Recommended First)

Test if sounds work on your system:

```bash
# Test alert sound
./scripts/play-sound.sh alert

# Test success sound
./scripts/play-sound.sh success

# Test agent sound
./scripts/play-sound.sh agent
```

If you hear sounds, the system is working! ✅

---

### Option 2: Integrate with Claude Code

Since Claude Code doesn't support output monitoring hooks yet, you'll need to manually trigger sounds when you see the notification prefixes.

**Create keyboard shortcuts in your terminal:**

#### For iTerm2:
1. Go to `Preferences > Keys > Key Bindings`
2. Add shortcuts:
   - `⌘⌥A` → Send Text: `./scripts/play-sound.sh alert`
   - `⌘⌥S` → Send Text: `./scripts/play-sound.sh success`
   - `⌘⌥C` → Send Text: `./scripts/play-sound.sh agent`

#### For macOS Terminal:
Unfortunately, Terminal.app doesn't support custom key bindings well.

---

### Option 3: Auto-trigger via Shell Prompt (Advanced)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Claude Code notification helper
alias claude-alert='~/Projects/boiler-plate/scripts/play-sound.sh alert'
alias claude-success='~/Projects/boiler-plate/scripts/play-sound.sh success'
alias claude-agent='~/Projects/boiler-plate/scripts/play-sound.sh agent'
```

Reload shell: `source ~/.zshrc`

Now you can manually run:
```bash
claude-alert    # Play alert sound
claude-success  # Play success sound
claude-agent    # Play agent sound
```

---

## 🎵 Sound Files Used

| Sound Type | File Path | Description |
|------------|-----------|-------------|
| Alert | `/System/Library/Sounds/Glass.aiff` | Attention-grabbing |
| Success | `/System/Library/Sounds/Hero.aiff` | Triumphant completion |
| Agent | `/System/Library/Sounds/Ping.aiff` | Quick notification |

### Customize Sounds

Edit [scripts/play-sound.sh](scripts/play-sound.sh) to use different sounds:

```bash
alert)
    afplay "/System/Library/Sounds/Sosumi.aiff" 2>/dev/null &
    ;;
```

**Available macOS sounds:**
- Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink

Browse all: `ls /System/Library/Sounds/`

---

## 🧪 Testing

### Test individual sounds:
```bash
./scripts/play-sound.sh alert
./scripts/play-sound.sh success
./scripts/play-sound.sh agent
```

### Test with Claude Code prefixes:
Watch for these in Claude's output:
- `⚠️ ACTION REQUIRED:` → Manually run `claude-alert`
- `✅ TASK COMPLETE:` → Manually run `claude-success`
- `✅ Agent: Adi - COMPLETE` → Manually run `claude-agent`

---

## 🐛 Troubleshooting

### No sound plays
1. Check volume is not muted
2. Test with: `afplay /System/Library/Sounds/Glass.aiff`
3. Verify sound file exists: `ls /System/Library/Sounds/Glass.aiff`

### "Permission denied" error
Make scripts executable:
```bash
chmod +x scripts/play-sound.sh
chmod +x scripts/claude-notify.sh
```

### Wrong sound plays
Check sound type spelling in `play-sound.sh` (must be: `alert`, `success`, or `agent`)

---

## 📁 Files Created

```
scripts/
├── claude-notify.sh    # Pipe monitor (future use)
├── play-sound.sh       # Sound player helper
└── test-notify.sh      # Test all sounds
```

---

## 🔮 Future Enhancement

When Claude Code adds output monitoring hooks, the `claude-notify.sh` script will automatically detect notification prefixes and play sounds without manual intervention.

**Planned usage:**
```bash
# Pipe Claude Code output through notifier
claude-code | ./scripts/claude-notify.sh
```

---

## 💡 Tips

1. **Use keyboard shortcuts** - Fastest way to trigger sounds
2. **Watch for emoji prefixes** - `⚠️` and `✅` are your visual cues
3. **Test sounds first** - Run `./scripts/play-sound.sh alert` to verify setup
4. **Customize sounds** - Edit `play-sound.sh` to use your favorite macOS sounds

---

**Created:** 2025-09-30
**For:** Claude Code audio notification system