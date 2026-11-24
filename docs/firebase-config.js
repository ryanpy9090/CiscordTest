/* ══════════════════════════════════════════════════════════════════════════
   FIREBASE CONFIG  —  THIS IS THE ONLY FILE YOU MUST EDIT
   ══════════════════════════════════════════════════════════════════════════

   Ciscord talks to Firebase so that different people can share groups and
   DMs. Follow README.md → "Step 1: create a Firebase project", then paste
   the values from the Firebase Console into the block below.

   The console shows a snippet that looks like this:

     const firebaseConfig = {
       apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
       authDomain: "your-project.firebaseapp.com",
       projectId: "your-project",
       storageBucket: "your-project.appspot.com",
       messagingSenderId: "000000000000",
       appId: "1:000000000000:web:aaaaaaaaaaaaaaaaaaaaaa"
     };

   Copy each value between the quotes into the matching line below.
   Keep the quotes. Nothing else in the app needs editing.

   This config is PUBLIC BY DESIGN — that is normal for Firebase web apps.
   Your data is protected by Firestore security rules, not by hiding this.
   ══════════════════════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey: "AIzaSyCO0MVMr62w6fO1JnJgUTMFebyKKpZzoVo",
  authDomain: "ciscord-4ac24.firebaseapp.com",
  projectId: "ciscord-4ac24",
  storageBucket: "ciscord-4ac24.firebasestorage.app",
  messagingSenderId: "672144512764",
  appId: "1:672144512764:web:c99940dc9ebea94fafe979",
  measurementId: "G-KWW1RCRSD9"
};

// Wrapped in an IIFE so `firebaseConfig` and `CONFIGURED` stay local. Both
// files share one global scope in the renderer, and a bare top-level `const`
// here collides with any same-named declaration in renderer.js, which kills
// renderer.js with "Identifier has already been declared" before a single
// listener is wired.
//
// Loaded two ways on purpose: the renderer loads this file as a <script> and
// needs window.CISCORD_CONFIG; a Node require() needs module.exports.
// `typeof require` is the discriminator — the renderer does not have require.
(function () {
  const CONFIGURED = !Object.values(firebaseConfig).some(
    v => typeof v !== 'string' || v.startsWith('PASTE_YOUR_')
  );

  if (typeof require === 'undefined') {
    window.CISCORD_CONFIG = { firebaseConfig, CONFIGURED };
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, CONFIGURED };
  }
})();
