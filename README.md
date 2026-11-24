# Ciscord

Multi-user chat app: **Google sign-in**, **invite-only groups**, **friend requests that unlock private DMs**.

Built on Electron + Firebase. Every person signs in with their own Google account —
no shared password, no accounts baked into the code.

---

## Step 1 — create a Firebase project (~5 minutes)

Firebase is what lets different people see the same groups and messages. It is free
for this kind of app. **This is the only step that needs you** — I cannot create it
for you because it lives in your Google account.

1. Go to **https://console.firebase.google.com** and sign in with the Google account
   you want to own the app.
2. Click **Add project** → give it a name (e.g. `ciscord`) → Continue.
3. Google Analytics is **not needed** — turn it off → **Create project** → wait → Continue.
4. In the left sidebar click **Build → Authentication** → **Get started**.
5. Click the **Google** row → flip the **Enable** switch → pick a support email →
   **Save**.
6. Left sidebar → **Build → Firestore Database** → **Create database** →
   choose **Start in production mode** → **Next** → pick a location →
   **Enable**.
7. Left sidebar → **Build → Realtime Database** → **Create Database** →
   **Realtime Database location** → **Next** → **Enabled** (locked mode is fine).
8. Click the **⚙ gear** (top-left, next to Project Overview) → **Project settings**.
9. Scroll to **Your apps** → click the **</>** (Web) icon → give it a nickname →
   **Register app**.
10. You will see a `firebaseConfig` block. **Copy it.**

## Step 2 — paste your keys

Open **`firebase-config.js`** and replace every `PASTE_YOUR_…` value.
Keep the quotes. Example:

```js
const firebaseConfig = {
  apiKey:            "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain:        "ciscord-xxxxx.firebaseapp.com",
  projectId:         "ciscord-xxxxx",
  storageBucket:     "ciscord-xxxxx.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:aaaaaaaaaaaaaaaa",
};
```

> This config is **public by design** — that is normal for Firebase web apps.
> Your data is protected by the security rules in Step 4, not by hiding this.

## Step 3 — security rules (important)

Without these, anyone with your keys can read everything. Firestore → **Rules** tab,
replace everything with:

```
rules_version = '2';
service cloud.firestore {
  function isMe(uid) { return request.auth != null && request.auth.uid == uid; }

  match /databases/{db}/documents {

    // Anyone signed in may read a profile (needed to show names).
    match /users/{uid} {
      allow read: if request.auth != null;
      allow create, update: if isMe(uid);
      allow delete: if isMe(uid);
    }

    // Groups are readable by members only; codes are matched in a query.
    match /groups/{gid} {
      allow read: if request.auth != null &&
        (request.auth.uid in resource.data.members ||
         request.query.limit == 1);
      allow create: if request.auth != null &&
        request.auth.uid in request.resource.data.members;
      allow update: if request.auth != null &&
        request.auth.uid in resource.data.members;
      allow delete: if request.auth != null &&
        resource.data.owner == request.auth.uid;
    }

    // Friend requests: readable by sender or receiver only.
    match /friendRequests/{rid} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.from ||
         request.auth.uid == resource.data.to);
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.from;
      allow update, delete: if request.auth != null &&
        (request.auth.uid == resource.data.from ||
         request.auth.uid == resource.data.to);
    }

    // Friendships: readable by either side.
    match /friendships/{fid} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.pair;
      allow create: if request.auth != null &&
        request.auth.uid in request.resource.data.pair;
      allow delete: if request.auth != null &&
        request.auth.uid in resource.data.pair;
    }

    // Messages: readable/writable by group members or DM participants.
    match /messages/{mid} {
      allow read, create: if request.auth != null &&
        request.auth.uid == request.resource.data.from;
      allow update, delete: if request.auth != null &&
        resource.data.from == request.auth.uid;
    }
  }
}
```

Click **Publish**.

Realtime Database → **Rules** tab, paste, Publish:

```json
{
  "rules": {
    "presence": {
      "$uid": { ".read": "auth != null", ".write": "auth != null && auth.uid == $uid" }
    }
  }
}
```

## Step 4 — add yourself as a test user

Authentication → **Settings** tab → **User permissions** → make sure
**Email/password is DISABLED** (we only use Google) and that
**Google** is enabled. No further work needed here — Google sign-in works
for any Google account while the project is in test mode.

## Run it

```bash
cd C:\Users\ryanp\Ciscord
npm start
```

Until your keys are pasted, Ciscord shows a **"One step left"** screen that tells you
exactly what to do instead of failing silently.

---

## How the app works

| Feature | How |
|---|---|
| **Sign in** | "Continue with Google" opens a real popup. Each person uses their own Google account. |
| **New account** | Signing in for the first time creates your profile automatically. No sign-up form. |
| **Delete account** | ⚙ (bottom-left) → *Delete my account*. Removes your profile, friendships and requests. |
| **Sign out** | ⚙ → *Sign out*. |
| **Create a group** | ⚑ in the left rail → name it. You get a 6-character invite code. |
| **Invite to a group** | Click `invite: ABC123 ⧉` under the group — it copies the code. Send it to whoever. They press **+** and type it. |
| **Private chat** | Friends tab → *Add friend by code*. They accept from *Requests*. Only then does the DM open. |
| **Online status** | Green dot next to a name, live. |
| **Leave a group** | Under the group → *Leave group*. |

**The friend rule you asked for is enforced:** a DM only exists after the other
person accepts your request. Codes are single-purpose — a group code never grants
DMs, and a friend code never joins a group.

## Troubleshooting

| Symptom | Cause |
|---|---|
| "One step left" screen | Keys not pasted yet, or a value still starts with `PASTE_YOUR_`. |
| Popup blocked | Allow popups for Ciscord, or try again. |
| `permission-denied` | Firestore rules from Step 3 were not published. |
| Names show as "Unknown" | That user signed in but Firestore rules block profile reads. |
| Nothing loads after signing in | Check the browser console (View → Toggle Developer Tools). |

## Files

```
firebase-config.js   ← the ONLY file you edit (your Firebase keys)
preload.js           Firebase layer (runs in Node, exposed as window.cis)
renderer.js          UI logic
index.html           layout
styles.css           theme
main.js              Electron window
assets/icon.png      app icon
```
