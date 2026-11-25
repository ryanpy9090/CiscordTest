/* ══════════════════════════════════════════════════════════════════════════
   Ciscord Web Push — serverless push (RFC 8291 / RFC 8292, WebCrypto only)

   How it works without any server:
   1. Receiver: PushManager.subscribe(VAPID_PUBLIC) → subscription saved in
      Firestore `pushTokens/{uid}.subs` (multiple devices per user).
   2. Receiver's service worker (sw.js) wakes on `push` → shows notification
      even when every Ciscord tab/app is fully closed.
   3. Sender: reads recipients' subscriptions, encrypts the payload with
      aes128gcm (WebCrypto), signs VAPID (ES256 JWT), POSTs to the push
      endpoint directly. The browser push service delivers it.

   NOTE: the VAPID private key ships in this public client. It alone is
   useless — pushing also requires a device's subscription keys, which live
   in Firestore at pushTokens/{uid}. Fine for this app's trust model.
   ══════════════════════════════════════════════════════════════════════════ */

const PUSH = (() => {
  const VAPID_PUBLIC_B64 = 'BB19IqMnaMDiMELOtudtI3TjSt2jKInZicylvhPe3BbvNT3LVgjQ23h_4F3Csvx5V1bsssB5S3z_aeF5i8e0avg';
  const VAPID_PRIVATE_JWK = { crv: 'P-256', kty: 'EC', x: 'HX0ioydowOIwQs62520jdONK3aMoidmJzKW-E97cFu8', y: 'NT3LVgjQ23h_4F3Csvx5V1bsssB5S3z_aeF5i8e0avg', d: '9HjRxGAoKm7gjgCgeU3CUfbwwIph_l-rW6qhe4u8SJk' };
  const VAPID_SUBJECT = 'mailto:ryan.anabtawi.pc@gmail.com';
  const PUSH_AUD = 'https://fcm.googleapis.com';

  const enc = new TextEncoder();
  const b64uToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), c => c.charCodeAt(0));
  const bytesToB64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const concat = (...arrs) => {
    const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
    let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; }
    return out;
  };

  async function hkdf(ikm, salt, info, length) {
    const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
  }

  // ── VAPID (RFC 8292): ES256 JWT ──
  let vapidPrivKey = null;
  async function vapidAuthorization(endpoint) {
    if (!vapidPrivKey) {
      vapidPrivKey = await crypto.subtle.importKey('jwk', VAPID_PRIVATE_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    }
    const aud = new URL(endpoint).origin;
    const header = bytesToB64u(enc.encode('{"typ":"JWT","alg":"ES256"}'));
    const payload = bytesToB64u(enc.encode(JSON.stringify({
      aud,
      exp: Math.floor(Date.now() / 1000) + 12 * 3600,
      sub: VAPID_SUBJECT
    })));
    const data = enc.encode(header + '.' + payload);
    const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, vapidPrivKey, data));
    const jwt = header + '.' + payload + '.' + bytesToB64u(sig);
    return 'vapid t=' + jwt + ', k=' + VAPID_PUBLIC_B64;
  }

  // ── Payload encryption (RFC 8291, aes128gcm) ──
  async function encrypt(payloadStr, subscription) {
    const uaPubRaw = b64uToBytes(subscription.keys.p256dh);
    const authSecret = b64uToBytes(subscription.keys.auth);

    // Ephemeral sender key pair + ECDH shared secret
    const asKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const uaPubKey = await crypto.subtle.importKey('raw', uaPubRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPubKey }, asKeys.privateKey, 256));
    const asPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));

    // IKM = HKDF(salt=auth, IKM=ECDH, info="WebPush: info" || 0x00 || uaPub || asPub, 32)
    const ikm = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info'), new Uint8Array(1), uaPubRaw, asPubRaw), 32);
    // CEK (16) and NONCE (12) = HKDF(salt=IKM, IKM=empty, info)
    const cek = await hkdf(ikm, new Uint8Array(0), concat(enc.encode('Content-Encoding: aes128gcm'), new Uint8Array(1)), 16);
    const nonce = await hkdf(ikm, new Uint8Array(0), concat(enc.encode('Content-Encoding: nonce'), new Uint8Array(1)), 12);

    // Plaintext: payload + padding delimiter 0x02 (aes128gcm)
    const plaintext = concat(enc.encode(payloadStr), new Uint8Array([2]));
    const iv = nonce.map((b, i) => b); // record #0 → nonce XOR 0
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']), plaintext));

    // aes128gcm header: salt(16) || rs(4, BE) || idlen(1) || keyid(asPubRaw)
    const rs = 4096;
    const header = concat(crypto.getRandomValues(new Uint8Array(16)),
      new Uint8Array([(rs >>> 24) & 255, (rs >>> 16) & 255, (rs >>> 8) & 255, rs & 255]),
      new Uint8Array([asPubRaw.length]), asPubRaw);
    return concat(header, ct);
  }

  // ── Send one push ──
  async function sendTo(subscription, payloadObj) {
    const body = await encrypt(JSON.stringify(payloadObj), subscription);
    const auth = await vapidAuthorization(subscription.endpoint);
    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '2419200',
        Urgency: payloadObj.call ? 'high' : 'normal'
      },
      body
    });
    return res.ok || res.status === 201;
  }

  // Push to a set of uids; drops dead subscriptions.
  async function pushToUids(uids, payloadObj) {
    for (const uid of uids) {
      if (!uid) continue;
      let doc;
      try { doc = await db.collection('pushTokens').doc(uid).get(); } catch (e) { continue; }
      if (!doc || !doc.exists) continue;
      const subs = doc.get('subs') || {};
      for (const [endpoint, sub] of Object.entries(subs)) {
        if (!sub || !sub.endpoint || !sub.keys) continue;
        try {
          const ok = await sendTo(sub, payloadObj);
          if (!ok && true) { /* non-2xx */ }
        } catch (e) {
          // 404/410 = gone → remove; other errors → keep
          if (String(e && e.message).indexOf('410') >= 0 || String(e && e.message).indexOf('404') >= 0) {
            try { await db.collection('pushTokens').doc(uid).set({ subs: { [endpoint]: null } }, { merge: true }); } catch (e2) {}
          }
        }
      }
    }
  }

  // ── Receiver: subscribe this device ──
  async function subscribeDevice(uid, registration) {
    const perm = ('Notification' in window) ? Notification.permission : 'denied';
    if (perm !== 'granted') return null;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64uToBytes(VAPID_PUBLIC_B64)
    });
    const json = sub.toJSON();
    await db.collection('pushTokens').doc(uid)
      .set({ subs: { [json.endpoint]: json } }, { merge: true });
    return json;
  }

  return { subscribeDevice, pushToUids };
})();
