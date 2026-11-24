# 🔊 Voice Call Debugging Guide

## Critical Fix Applied

**Issue Found:** Audio elements were being hidden with `display: none`, which prevents audio playback in many browsers.

**Fix Applied:** Audio elements are now positioned off-screen but remain in the DOM and visible to the browser, allowing audio to play properly.

---

## How to Test Voice Calls

### Step 1: Open Browser Console
1. Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
2. Click the **Console** tab
3. Keep it open during testing

### Step 2: Start a Call (Person A)
1. Open a DM or group chat with a friend
2. Click the **CALL** button (phone icon)
3. Watch the console for these messages:

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

### Step 3: Join the Call (Person B)
1. Your friend should see the call message in the chat
2. They click **Accept** or join the call
3. Watch the console for these messages:

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

### Step 4: Connection Established (Person A - Caller)
The caller will automatically call the joiner. Watch for:

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

### Step 5: Stream Received (Both Users)
Once the connection is established, both users should see:

```
[Voice] 🎵 Received remote stream from: xxx
[Voice] Stream tracks: [...]
[Voice] Audio tracks: 1
[Voice] Video tracks: 0
[Voice] ✅ Created media element for peer: xxx type: audio
[Voice] Setting srcObject for peer: xxx
[Voice] ✅ Media playing for xxx attempt 1
[Voice] Media element state: {
  paused: false,
  muted: false,
  volume: 1,
  readyState: 4,
  src: not set,
  srcObject: set
}
```

---

## ✅ Success Indicators

If everything is working, you should see:

1. **Both users** see "Media playing" in console
2. **Media element state** shows:
   - `paused: false` ✅
   - `muted: false` ✅
   - `volume: 1` ✅
   - `readyState: 4` ✅ (HAVE_ENOUGH_DATA)
   - `srcObject: set` ✅

3. **You can hear each other** through speakers/headphones
4. **You can speak** and the other person hears you

---

## ❌ Common Issues and Solutions

### Issue 1: "Media playback failed"
**Symptom:** Console shows repeated "Media playback failed" messages

**Solution:**
- Browsers require user interaction before playing audio
- Make sure you've clicked somewhere on the page first
- Try clicking the CALL button again
- Check if browser is blocking autoplay (allow it for the site)

### Issue 2: No Audio Tracks
**Symptom:** Console shows `Audio tracks: 0`

**Solution:**
- Browser didn't grant microphone permission
- Check browser settings → Site permissions → Microphone → Allow
- Try again and accept the microphone permission prompt
- Make sure you have a microphone connected

### Issue 3: PeerJS Connection Failed
**Symptom:** Console shows PeerJS errors

**Solution:**
- Check internet connection
- PeerJS uses WebRTC which requires:
  - HTTPS (GitHub Pages is HTTPS ✅)
  - Working STUN servers (using Google's public STUN servers)
- Try refreshing the page
- Check firewall/antivirus isn't blocking WebRTC

### Issue 4: Call Not Connecting
**Symptom:** Both users are in the call but no audio

**Solution:**
- Check console for "Received remote stream" messages
- If not seeing this, the WebRTC connection failed
- Try both users refreshing and calling again
- Check if both users are on the same network (some networks block P2P)

### Issue 5: One-Way Audio
**Symptom:** You can hear them but they can't hear you (or vice versa)

**Solution:**
- Check microphone permissions for both users
- Check if microphone is muted in system settings
- Check if microphone is working in other apps
- Try switching to a different microphone
- Check browser audio settings

---

## 🔍 Debug Checklist

Before reporting issues, verify:

### For Both Users:
- [ ] Browser console is open (F12)
- [ ] Microphone permission granted
- [ ] Microphone is not muted in system settings
- [ ] Speakers/headphones are working
- [ ] Volume is turned up
- [ ] Internet connection is stable
- [ ] Page is loaded over HTTPS (not HTTP)

### For Caller (Person A):
- [ ] See "✅ Call initiated to: xxx" in console
- [ ] See "🎵 Received remote stream" in console
- [ ] See "✅ Media playing" in console
- [ ] Media element state shows `paused: false`

### For Joiner (Person B):
- [ ] See "✅ PeerJS initialized" in console
- [ ] See "📞 Incoming call from: xxx" in console
- [ ] See "🎵 Received remote stream" in console
- [ ] See "✅ Media playing" in console

---

## 🎯 Expected Console Flow

### Person A (Caller):
```
1. startVoiceCall START
2. ✅ Microphone granted
3. ✅ PeerJS initialized
4. ✅ Call created
5. 📞 Call started - waiting
6. 📡 Call update received (friend joined)
7. 📞 Calling peer: xxx
8. ✅ Call initiated
9. 🎵 Received remote stream
10. ✅ Media playing
```

### Person B (Joiner):
```
1. joinExistingCall START
2. ✅ Microphone granted
3. ✅ PeerJS initialized
4. 📞 Joined call - waiting
5. 📞 Incoming call from: xxx
6. ✅ Answering call
7. 🎵 Received remote stream
8. ✅ Media playing
```

---

## 🐛 If Still Not Working

### Step 1: Check Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (may need permission)

### Step 2: Check WebRTC Support
Visit https://webrtc.org/ and check if your browser supports WebRTC

### Step 3: Test with Different Network
- Try both users on different networks (e.g., one on WiFi, one on mobile)
- Some networks block P2P connections

### Step 4: Check Firewall/Antivirus
- Temporarily disable firewall/antivirus
- Add browser to allowed apps
- Check if WebRTC is blocked

### Step 5: Try Different Browser
- If using Chrome, try Firefox
- If using Firefox, try Chrome
- This helps identify browser-specific issues

### Step 6: Check Console Errors
- Copy ALL console messages (not just [Voice] ones)
- Look for any red error messages
- Share the complete console output

---

## 📊 Console Log Legend

### Success Messages (✅):
- `✅ Microphone granted` - Microphone permission accepted
- `✅ PeerJS initialized` - WebRTC connection ready
- `✅ Call created` - Call registered in database
- `✅ Call initiated` - Calling another user
- `✅ Media playing` - Audio is playing
- `🎵 Received remote stream` - Receiving audio from peer

### Warning Messages (⚠️):
- `⚠️ Would exceed max participants` - Call is getting full
- `⚠️ Max participants reached` - Call is at capacity (10 users)

### Error Messages (❌):
- `❌ Could not get microphone` - Microphone permission denied
- `❌ Peer is not available` - Other user not connected yet
- `❌ Media playback failed` - Browser blocked audio playback
- `❌ Failed to call peer` - WebRTC connection failed

---

## 🎤 Testing Your Microphone

### In Browser:
1. Visit https://mictest.com/
2. Click "Start recording"
3. Speak and check if it records
4. If not working, fix microphone before testing Ciscord

### In System:
**Windows:**
1. Right-click speaker icon → Open Sound settings
2. Input → Test your microphone
3. Speak and check if bar moves

**Mac:**
1. System Preferences → Sound → Input
2. Select microphone
3. Check input level while speaking

---

## 🔊 Testing Your Speakers

### In Browser:
1. Visit https://www.youtube.com/
2. Play any video
3. Check if you can hear audio
4. If not, fix speakers before testing Ciscord

### In System:
**Windows:**
1. Right-click speaker icon → Open Sound settings
2. Output → Test
3. Check if you hear test sound

**Mac:**
1. System Preferences → Sound → Output
2. Select output device
3. Check volume and balance

---

## 📞 Quick Test Procedure

### Test 1: Basic Connection
1. Person A starts call
2. Person B joins call
3. Both see "✅ Media playing" in console
4. **Expected:** Can hear each other

### Test 2: Microphone Test
1. Person A speaks
2. Person B should hear it
3. Person B speaks
4. Person A should hear it
5. **Expected:** Two-way audio works

### Test 3: Mute Test
1. Person A clicks Mute button
2. Person A speaks
3. Person B should NOT hear it
4. Person A clicks Unmute
5. Person A speaks
6. Person B should hear it
7. **Expected:** Mute/unmute works

---

## 🆘 Still Need Help?

If voice calls still don't work after following this guide:

1. **Open browser console** (F12)
2. **Start a call** and have friend join
3. **Copy ALL console messages** (Ctrl+A, Ctrl+C)
4. **Share the complete log** for analysis

The console logs will show exactly where the issue is occurring.

---

## 🎉 Success!

If you see all the ✅ messages and can hear each other, voice calls are working perfectly!

**You should see:**
- Microphone granted ✅
- PeerJS initialized ✅
- Call created/joined ✅
- Remote stream received ✅
- Media playing ✅
- **Two-way audio working** ✅

---

**Last Updated:** 2026-11-06  
**Status:** ✅ Critical audio fix applied - comprehensive debugging added
