/* Ciscord push gateway (Firestore → Web Push via web-push lib).
   Sends a real push notification whenever a new message or a new call doc is
   written to Firestore — works even when every Ciscord tab/app is fully
   closed on the receiver's device.

   Flow:
   1. A user sends a message → Firestore `messages/{id}` (or a call → `calls/{id}`).
   2. This Cloud Function triggers on the new document.
   3. It reads the recipients' web-push subscriptions from `pushTokens/{uid}.subs`
      (written by the browser via PushManager.subscribe — see web/push.js).
   4. It encrypts + signs VAPID server-side (web-push lib) and POSTs to the
      push endpoint. The VAPID PRIVATE key lives ONLY here in env config —
      never in client code.

   Deploy (one time) — optionally set the VAPID keys as function secrets:
     firebase functions:secrets:set VAPID_PUBLIC_KEY
     firebase functions:secrets:set VAPID_PRIVATE_KEY
   Without secrets the historical keys below are used so existing
   subscriptions keep working.
*/
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const webpush = require('web-push');

initializeApp();
setGlobalOptions({ region: 'us-central1', memory: '256MiB' });

// VAPID keys come from secret env (set via firebase functions:secrets:set).
// Fall back to the historical values so existing subscriptions keep working.
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ||
  'BB19IqMnaMDiMELOtudtI3TjSt2jKInZicylvhPe3BbvNT3LVgjQ23h_4F3Csvx5V1bsssB5S3z_aeF5i8e0avg';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ||
  '9HjRxGAoKm7gjgCgeU3CUfbwwIph_l-rW6qhe4u8SJk';
const VAPID_SUBJECT = 'mailto:ryan.anabtawi.pc@gmail.com';

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  vapidReady = true;
}

// Read recipients' web-push subscriptions: pushTokens/{uid}.subs = {endpoint: sub}
async function subsFor(uids) {
  const subs = [];
  for (const uid of uids) {
    if (!uid) continue;
    try {
      const snap = await getFirestore().doc('pushTokens/' + uid).get();
      const subsMap = snap.get('subs');
      if (subsMap && typeof subsMap === 'object') {
        for (const [endpoint, sub] of Object.entries(subsMap)) {
          if (sub && sub.endpoint && sub.keys) subs.push({ endpoint, sub, uid });
        }
      }
    } catch (e) { /* skip user without subs */ }
  }
  return subs;
}

// Resolve who should hear about an event. DMs carry participants on the doc;
// group messages only carry the sender, so look up the group's members.
async function resolveRecipients(scope, thread, doc) {
  const sender = doc.from || doc.createdBy || doc.uid || '';
  if (scope === 'group') {
    try {
      const g = await getFirestore().doc('groups/' + thread).get();
      const members = g.get('members');
      if (Array.isArray(members)) return members.filter(u => u && u !== sender);
    } catch (e) { /* fall through */ }
    return [];
  }
  const parts = (doc.participants || []).filter(u => u && u !== sender);
  return parts.length ? parts : [];
}

async function nameFor(uid) {
  try {
    const p = await getFirestore().doc('users/' + uid).get();
    return p.get('displayName') || p.get('name') || 'Someone';
  } catch (e) { return 'Someone'; }
}

// Send a web-push to one subscription; prune dead ones (404/410).
async function sendSub(entry, payload) {
  ensureVapid();
  try {
    await webpush.sendNotification(entry.sub, JSON.stringify(payload), {
      TTL: 2419200,
      urgency: payload.call ? 'high' : 'normal'
    });
    return 'ok';
  } catch (e) {
    if (e && (e.statusCode === 404 || e.statusCode === 410)) {
      try {
        await getFirestore().doc('pushTokens/' + entry.uid)
          .set({ subs: { [entry.endpoint]: null } }, { merge: true });
      } catch (e2) {}
      return 'gone';
    }
    console.error('web-push send failed:', e && (e.statusCode || e.message));
    return 'fail';
  }
}

// ── New message → notify recipients ─────────────────────────────────────
exports.onMessageCreated = onDocumentCreated('messages/{msgId}', async (event) => {
  const data = event.data && event.data.data();
  if (!data) return;
  if (data.type === 'call') return; // call docs notify via onCallCreated

  const recipients = await resolveRecipients(data.scope, data.thread, data);
  if (!recipients.length) return;

  const subs = await subsFor(recipients);
  if (!subs.length) return;

  const author = await nameFor(data.from || '');
  const body = (data.body || '').slice(0, 160) || 'Sent you a message';

  await Promise.all(subs.map(s => sendSub(s, {
    title: '💬 ' + author,
    body,
    call: false
  })));
});

// ── New call → notify with Accept/Decline actions ───────────────────────
exports.onCallCreated = onDocumentCreated('calls/{callId}', async (event) => {
  const data = event.data && event.data.data();
  if (!data) return;

  const recipients = await resolveRecipients(data.scope, data.thread, data);
  if (!recipients.length) return;

  const subs = await subsFor(recipients);
  if (!subs.length) return;

  const callerName = await nameFor(data.createdBy || '');
  const callId = event.params.callId;

  await Promise.all(subs.map(s => sendSub(s, {
    title: '📞 ' + callerName,
    body: callerName + ' is calling you on Ciscord',
    call: true,
    callId,
    scope: data.scope,
    thread: data.thread,
    createdBy: data.createdBy,
    participants: data.participants
  })));
});
