# Testing Guide for Ciscord v1.3.8 Web

## How to Test the Hangup Button

### Step 1: Deploy to GitHub Pages
```bash
xcopy "C:\Users\ryanp\Documents\ciscord-1.3.8-web\*" "path\to\your\github\repo" /Y
cd path\to\your\github\repo
git add .
git commit -m "Test: comprehensive logging for hangup button"
git push
```

### Step 2: Open Browser Console
1. Go to your GitHub Pages URL
2. Press **F12** to open Developer Tools
3. Click the **Console** tab
4. Clear the console (click the 🚫 icon)

### Step 3: Start a Voice Call
1. Sign in with Google
2. Open a chat (DM or group)
3. Click the call button to start a voice call
4. You should see the call modal appear

### Step 4: Check Console Messages
When the call starts, you should see:
```
[Voice] showCallBar called with text: ...
[Voice] Modal buttons: {modalBtnMute: true, modalBtnHangup: true}
[Voice] Call bar buttons: {btnMute: true, btnHangup: true}
```

### Step 5: Click the Hangup Button
**IMPORTANT:** The call modal covers the entire screen (z-index: 1000). You should click the **"End" button INSIDE the modal**, not the hangup button on the call bar (which is hidden behind the modal).

When you click the hangup button, you should see:
```
[Voice] modalBtnHangup clicked
[Voice] ========== endCurrentCall START ==========
[Voice] activeCall: {...}
[Voice] activeCalls.size: X
[Voice] peer: exists
[Voice] localMediaStream: exists
[Voice] Ending call ID: xxx
[Voice] Calling disconnectVoiceServer()
[Voice] ========== disconnectVoiceServer START ==========
[Voice] activeCalls.size: X
[Voice] peer: exists
[Voice] localMediaStream: exists
[Voice] Closing X active calls
[Voice] Closing call with peer: yyy
[Voice] Call closed successfully with peer: yyy
[Voice] All calls cleared
[Voice] Destroying peer connection
[Voice] Peer destroyed
[Voice] Stopping local media tracks
[Voice] Stopped local track: audio ...
[Voice] Local media stream cleared
[Voice] Removing media elements
[Voice] ========== disconnectVoiceServer COMPLETE ==========
[Voice] Hiding call UI
[Voice] ========== endCurrentCall COMPLETE ==========
```

### Step 6: Verify Call Ended
- The call modal should disappear
- The call bar should disappear
- You should be back to the normal chat view
- The microphone should be released (no more recording indicator)

## Troubleshooting

### If you see NO console messages when clicking:
1. The button might not be clickable
2. Check if there's an overlay blocking clicks
3. Try right-clicking the button and selecting "Inspect" to see if it's the right element

### If you see "modalBtnHangup clicked" but nothing else:
1. The `endCurrentCall` function might not be defined
2. Check the console for errors
3. Try typing `endCurrentCall()` directly in the console to test

### If you see errors in the console:
1. Copy the full error message
2. Check the error stack trace
3. Report the error with the full console output

### If the call doesn't end:
1. Check if you see "endCurrentCall COMPLETE" in the console
2. If yes, the function ran but Firebase might not be updating
3. Check Firebase Console to see if the call status changed

## Expected Behavior

### Successful Call Flow:
1. ✅ Click call button → Call modal appears
2. ✅ See "showCallBar called" in console
3. ✅ Click "End" button in modal
4. ✅ See "modalBtnHangup clicked" in console
5. ✅ See "endCurrentCall START" in console
6. ✅ See "disconnectVoiceServer START" in console
7. ✅ See "endCurrentCall COMPLETE" in console
8. ✅ Modal disappears
9. ✅ Call bar disappears
10. ✅ Back to normal chat

### What Should NOT Happen:
- ❌ No console messages when clicking
- ❌ Errors in the console
- ❌ "endCurrentCall START" but no "COMPLETE"
- ❌ Modal stays visible after clicking hangup
- ❌ Microphone still active after ending call

## CSS Fixes Applied

To ensure buttons are clickable, I added:
- `pointer-events: auto` to modal and buttons
- `z-index: 1001` to modal buttons (higher than modal's 1000)
- `z-index: 61` to call bar buttons (higher than call bar's 60)

This ensures buttons are always on top and clickable, even if there are overlays.

## Files Modified

| File | Changes |
|------|---------|
| `index.html` | Added `pointer-events: auto`, `z-index`, inline onclick with logging |
| `renderer.js` | Added comprehensive logging to `endCurrentCall` and `disconnectVoiceServer` |

## Next Steps

After testing, report back with:
1. Did you see "modalBtnHangup clicked" in the console?
2. Did you see "endCurrentCall COMPLETE" in the console?
3. Did the call modal disappear?
4. Were there any errors in the console?
5. What was the last console message you saw?

This will help identify exactly where the problem is.
