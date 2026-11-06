# 🔊 Voice Call Testing Guide - Step by Step

## 🎯 Quick Test (2 Minutes)

### Step 1: Open Browser Console
1. Press **F12** or **Ctrl+Shift+I**
2. Click **Console** tab
3. Keep it open during entire test

### Step 2: Person A Starts Call
1. Open DM or group chat with friend
2. Click **CALL** button (phone icon)
3. **Watch console** for these messages:

```
[Voice] ========== startVoiceCall START ==========
[Voice] Active chat: {...}
[Voice] My UID: xxx
[Voice] Requesting microphone access...
[Voice] ✅ Microphone granted
[Voice] Audio tracks: 1
[Voice] Audio track: Microphone (...) enabled: true muted: false
[Voice] Initializing PeerJS...
[Voice] ✅ PeerJS initialized, peer ID: xxx
[Voice] Creating call in Firestore with participants: [...]
[Voice] ✅ Call created: xxx
[Voice] Sending call message to chat...
[Voice] ✅ Call message sent
[Voice] Joining call...
[Voice] ✅ Joined call
[Voice] 📞 Call started - waiting for others to join
```

### Step 3: Person B Joins Call
1. Friend sees call message in chat
2. They click to join
3. **Watch console** for:

```
[Voice] ========== joinExistingCall START ==========
[Voice] Call data: {...}
[Voice] Joining call: xxx
[Voice] Current participants: 1 / 10
[Voice] Requesting microphone access...
[Voice] ✅ Microphone granted
[Voice] Audio tracks: 1
[Voice] Audio track: Microphone (...) enabled: true muted: false
[Voice] Joining call in Firestore...
[Voice] ✅ Joined call in Firestore
[Voice] Initializing PeerJS...
[Voice] ✅ PeerJS initialized, peer ID: xxx
[Voice] Waiting for incoming call from caller...
[Voice] 📞 Joined call - waiting for connection
```

### Step 4: Connection Established
**Person A (Caller) should see:**

```
[Voice] 📡 Call update received: {...}
[Voice] I am the caller, checking for new peers to call...
[Voice] Peers to call: 1 Already connected: 0
[Voice] 📞 Calling peer: xxx (1/1)
[Voice] Active calls: 0 / 10
[Voice] Local stream tracks: 1
[Voice] ✅ Call initiated to: xxx
[Voice] Call object: created
[Voice] 🔗 Handling call stream with peer: xxx
[Voice] Active calls count: 1
```

**Both users should see:**

```
[Voice] 🎵 Received remote stream from: xxx
[Voice] Stream tracks: [...]
[Voice] Audio tracks: 1
[Voice] Video tracks: 0
[Voice] Audio track 0 : {
  label: "...",
  enabled: true,
  muted: false,
  readyState: "live",
  kind: "audio"
}
[Voice] ✅ Created media element for peer: xxx type: audio
[Voice] Media element initial state: {
  muted: false,
  volume: 1,
  autoplay: true,
  defaultMuted: false
}
[Voice] Setting srcObject for peer: xxx
[Voice] Attempting to play media for xxx attempt 1
[Voice] Media state before play: {
  paused: true,
  muted: false,
  volume: 1,
  readyState: 4,
  srcObject: set
}
[Voice] ✅ Media playing for xxx attempt 1
[Voice] Media element state after play: {
  paused: false,
  muted: false,
  volume: 1,
  readyState: 4,
  currentTime: 0.5,
  duration: Infinity,
  src: not set,
  srcObject: set
}
```

---

## ✅ Success Indicators

If voice calls are working, you should see:

### Both Users:
- ✅ "✅ Microphone granted"
- ✅ "✅ PeerJS initialized"
- ✅ "🎵 Received remote stream"
- ✅ "Audio tracks: 1" (or more)
- ✅ "Audio track 0: enabled: true, muted: false"
- ✅ "✅ Media playing"
- ✅ Media state shows:
  - `paused: false`
  - `muted: false`
  - `volume: 1`
  - `readyState: 4`
  - `srcObject: set`

### Audio Debug Panel:
You should see in the call modal:
```
Audio Status:
media-xxx: ▶️ Playing | 🔊 Unmuted | Vol: 1
```

---

## ❌ Common Issues and Solutions

### Issue 1: No "🎵 Received remote stream" Message

**Problem:** WebRTC connection not established

**Solution:**
1. Check both users see "✅ PeerJS initialized"
2. Check caller sees "📞 Calling peer: xxx"
3. Check joiner sees "📞 Incoming call from: xxx"
4. If not, try refreshing both pages and calling again
5. Check internet connection
6. Try different network (some block P2P)

---

### Issue 2: "Audio tracks: 0"

**Problem:** Remote stream has no audio

**Solution:**
1. Check sender's microphone is working
2. Check sender sees "✅ Microphone granted"
3. Check sender's audio track shows "enabled: true"
4. Try refreshing sender's page
5. Check browser microphone permissions

---

### Issue 3: "❌ Media playback failed"

**Problem:** Browser blocked audio autoplay

**Solution:**
1. **Click anywhere on the page** (user interaction required)
2. Look for orange **"🔊 Unmute Audio"** button in call modal
3. Click the "Unmute Audio" button
4. Check console for "✅ Playback started"
5. You should now hear audio

---

### Issue 4: Media Shows "paused: true"

**Problem:** Audio element is paused

**Solution:**
1. Click **"🔊 Unmute Audio"** button in call modal
2. Or click anywhere on the page and refresh
3. Check console for errors

---

### Issue 5: Media Shows "muted: true"

**Problem:** Audio element is muted

**Solution:**
1. Click **"🔊 Unmute Audio"** button in call modal
2. Check browser site settings → Sound → Allow
3. Check system volume

---

### Issue 6: One-Way Audio

**Problem:** You can hear them but they can't hear you (or vice versa)

**Solution:**
1. Check both users' microphones:
   - Both see "✅ Microphone granted"
   - Both see "Audio track: enabled: true, muted: false"
2. Check both users' speakers:
   - Both see "✅ Media playing"
   - Both see "paused: false, muted: false"
3. Try switching microphone/speaker devices
4. Check system audio settings

---

## 🔍 Debug Checklist

Before reporting issues, verify:

### For Both Users:
- [ ] Browser console open (F12)
- [ ] Microphone permission granted
- [ ] Microphone is not muted in system settings
- [ ] Speakers/headphones are working
- [ ] Volume is turned up
- [ ] Internet connection is stable
- [ ] Page is loaded over HTTPS (GitHub Pages)

### For Caller (Person A):
- [ ] See "✅ Call initiated to: xxx" in console
- [ ] See "🎵 Received remote stream" in console
- [ ] See "✅ Media playing" in console
- [ ] Media element state shows `paused: false`
- [ ] Media element state shows `muted: false`
- [ ] Audio debug panel shows "▶️ Playing"

### For Joiner (Person B):
- [ ] See "✅ PeerJS initialized" in console
- [ ] See "📞 Incoming call from: xxx" in console
- [ ] See "🎵 Received remote stream" in console
- [ ] See "✅ Media playing" in console
- [ ] Media element state shows `paused: false`
- [ ] Media element state shows `muted: false`
- [ ] Audio debug panel shows "▶️ Playing"

---

## 🆘 Still Not Working?

### Step 1: Copy ALL Console Messages
1. Open console (F12)
2. Start a call
3. Have friend join
4. **Copy ALL console messages** (Ctrl+A, Ctrl+C)
5. Share the complete log

### Step 2: Check Audio Debug Panel
1. Look at the call modal
2. Find the "Audio Status" section at the bottom
3. Note what it shows for each audio element
4. Share this information

### Step 3: Try "Unmute Audio" Button
1. If you see the orange "🔊 Unmute Audio" button
2. Click it
3. Check if audio starts playing
4. Report what happens

### Step 4: Test Microphone and Speakers
1. Test microphone: https://mictest.com/
2. Test speakers: https://www.youtube.com/
3. Make sure both work before testing Ciscord

### Step 5: Try Different Browser
1. If using Chrome, try Firefox
2. If using Firefox, try Chrome
3. This helps identify browser-specific issues

---

## 📊 Expected Console Flow

### Person A (Caller):
```
1. [Voice] ========== startVoiceCall START ==========
2. [Voice] ✅ Microphone granted
3. [Voice] ✅ PeerJS initialized
4. [Voice] ✅ Call created
5. [Voice] 📞 Call started - waiting
6. [Voice] 📡 Call update received (friend joined)
7. [Voice] 📞 Calling peer: xxx
8. [Voice] ✅ Call initiated
9. [Voice] 🔗 Handling call stream
10. [Voice] 🎵 Received remote stream
11. [Voice] Audio tracks: 1
12. [Voice] ✅ Created media element
13. [Voice] ✅ Media playing
14. [Voice] Media state: paused: false, muted: false
```

### Person B (Joiner):
```
1. [Voice] ========== joinExistingCall START ==========
2. [Voice] ✅ Microphone granted
3. [Voice] ✅ PeerJS initialized
4. [Voice] 📞 Joined call - waiting
5. [Voice] 📞 Incoming call from: xxx
6. [Voice] ✅ Answering call
7. [Voice] 🔗 Handling call stream
8. [Voice] 🎵 Received remote stream
9. [Voice] Audio tracks: 1
10. [Voice] ✅ Created media element
11. [Voice] ✅ Media playing
12. [Voice] Media state: paused: false, muted: false
```

---

## 🎯 Quick Fixes

### If you can't hear audio:
1. Click **"🔊 Unmute Audio"** button in call modal
2. Or click anywhere on page and refresh
3. Check system volume
4. Check browser site settings → Sound → Allow

### If they can't hear you:
1. Check microphone is not muted
2. Check microphone permission granted
3. Try refreshing your page
4. Check system microphone settings

### If call won't connect:
1. Both refresh pages
2. Check internet connection
3. Try different network
4. Check firewall/antivirus

---

## 📞 Support

If voice calls still don't work:

1. **Open browser console** (F12)
2. **Start a test call**
3. **Copy ALL console messages** (Ctrl+A, Ctrl+C)
4. **Note the audio debug panel** status
5. **Share the complete information**

The comprehensive logging will show exactly where the issue is.

---

**Last Updated:** 2026-11-06  
**Status:** ✅ Enhanced debugging and manual unmute button added
