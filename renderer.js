/* Ciscord renderer - auth, groups by invite, friends, DMs, voice, files */

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

let me = null;
let groups = [];
let friends = [];
let requests = [];
let view = 'groups';
let active = null;
let unsubs = [];
const profileCache = new Map();
const presenceCache = new Map();
const userCache = {};

let activeCall = null;
let callUnsub = null;
// WebRTC ICE servers with TURN for reliable connections
const ICE_SERVERS = [
  // Google STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Cloudflare STUN
  { urls: 'stun:stun.cloudflare.com:3478' },
  // Metered TURN servers (free tier - 20GB/month)
  { 
    urls: 'turn:global.relay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  { 
    urls: 'turn:global.relay.metered.ca:80?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  { 
    urls: 'turn:global.relay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  { 
    urls: 'turns:global.relay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

const cfg = window.CISCORD_CONFIG || {};
const IS_CONFIGURED = !!cfg.CONFIGURED;
let auth, db, rtdb = null, F, provider;

// AI Settings - stored per user in localStorage
let aiSettings = JSON.parse(localStorage.getItem('ciscord_ai_settings') || '{}');
function getAiSettings() {
  return JSON.parse(localStorage.getItem('ciscord_ai_settings') || '{}');
}
function saveAiSettings(settings) {
  localStorage.setItem('ciscord_ai_settings', JSON.stringify(settings));
  aiSettings = settings;
}

// Web-compatible AI integration
async function sendToAI(message, conversationHistory = null) {
  const settings = getAiSettings();
  if (!settings.apiKey) {
    return { success: false, error: 'No API key configured. Please add your API key in AI settings.' };
  }
  
  try {
    let apiUrl = settings.apiUrl || getDefaultApiUrl(settings.provider || 'groq');
    const model = settings.model || getDefaultModel(settings.provider || 'groq');
    
    // Prepare messages array
    let messages;
    if (conversationHistory && conversationHistory.length > 0) {
      // Use conversation history for AI Mode
      messages = conversationHistory.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : msg.role,
        content: msg.content
      }));
    } else {
      // Single message for /ai command
      messages = [{ role: 'user', content: message }];
    }
    
    let response;
    if (settings.provider === 'anthropic') {
      // Anthropic API format
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 1000,
          messages: messages
        })
      });
      const data = await response.json();
      if (data.error) {
        return { success: false, error: data.error.message || 'Unknown API error' };
      }
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        return { success: false, error: 'Invalid response format from AI API' };
      }
      
      return { success: true, reply: data.content[0].text, tokens: data.usage?.total_tokens || 0, model: model };
    } else {
      // OpenAI-compatible API format (Alibaba, DeepSeek, OpenAI, etc.)
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        return { 
          success: false, 
          error: `API request failed with status ${response.status}: ${response.statusText}` 
        };
      }
      
      const data = await response.json();
      if (data.error) {
        return { success: false, error: data.error.message || 'Unknown API error' };
      }
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        return { success: false, error: 'Invalid response format from AI API' };
      }
      
      return { success: true, reply: data.choices[0].message.content, tokens: data.usage?.total_tokens || 0, model: model };
    }
  } catch (e) {
    console.error('[AI] Error:', e);
    
    // Detect network errors
    if (e.message === 'Failed to fetch' || e.name === 'TypeError') {
      return { 
        success: false, 
        error: 'Network error: Could not connect to AI API. Check your internet connection and API settings.'
      };
    }
    
    return { success: false, error: e.message || 'An unexpected error occurred' };
  }
}

let toastTimer;
function toast(msg, ms = 2800) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

function ask({ title, text, placeholder = '', confirmText = 'OK' }) {
  return new Promise(resolve => {
    $('dlgTitle').textContent = title;
    $('dlgText').textContent = text || '';
    $('dlgErr').textContent = '';
    const input = $('dlgInput');
    input.placeholder = placeholder;
    input.value = '';
    input.classList.remove('hidden');
    $('dlgOk').textContent = confirmText;
    $('dlgOk').className = 'primary';
    $('dialog').classList.remove('hidden');
    setTimeout(() => input.focus(), 30);
    const done = result => {
      $('dialog').classList.add('hidden');
      $('dlgOk').onclick = $('dlgCancel').onclick = null;
      input.onkeydown = null;
      resolve(result);
    };
    $('dlgOk').onclick = () => done(input.value.trim());
    $('dlgCancel').onclick = () => done(null);
    input.onkeydown = e => {
      if (e.key === 'Enter') done(input.value.trim());
      if (e.key === 'Escape') done(null);
    };
  });
}

function confirmBox(title, text, confirmText = 'Confirm') {
  return new Promise(resolve => {
    $('dlgTitle').textContent = title;
    $('dlgText').textContent = text || '';
    $('dlgErr').textContent = '';
    $('dlgInput').classList.add('hidden');
    $('dlgOk').textContent = confirmText;
    $('dlgOk').className = 'danger';
    $('dialog').classList.remove('hidden');
    const done = r => {
      $('dialog').classList.add('hidden');
      $('dlgOk').onclick = $('dlgCancel').onclick = null;
      resolve(r);
    };
    $('dlgOk').onclick = () => done(true);
    $('dlgCancel').onclick = () => done(false);
  });
}

const uidOf = () => {
  const u = auth.currentUser;
  if (!u) throw new Error('You are not signed in.');
  return u.uid;
};

const plain = d => {
  const o = { id: d.id, ...d.data() };
  if (o.createdAt && typeof o.createdAt.toMillis === 'function') o.createdAt = o.createdAt.toMillis();
  return o;
};

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function makeCode(collection) {
  for (let i = 0; i < 8; i++) {
    let c = '';
    for (let j = 0; j < 6; j++) c += ALPHA[Math.floor(Math.random() * ALPHA.length)];
    const hit = await db.collection(collection).where('code', '==', c).limit(1).get();
    if (hit.empty) return c;
  }
  throw new Error('Could not allocate an invite code.');
}

const cis = {
  currentUid: () => (auth.currentUser ? auth.currentUser.uid : null),
  onAuthChange: cb => auth.onAuthStateChanged(cb),
  signInWithGoogle: () => auth.signInWithPopup(provider),
  signOut: () => auth.signOut(),

  async deleteAccount() {
    const u = auth.currentUser;
    if (!u) throw new Error('You are not signed in.');
    const batch = db.batch();
    batch.delete(db.collection('users').doc(u.uid));
    await batch.commit();
    await u.delete();
  },

  async ensureProfile() {
    const u = auth.currentUser;
    const ref = db.collection('users').doc(u.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        uid: u.uid,
        name: u.displayName || u.email.split('@')[0],
        displayName: '',
        email: u.email,
        photo: u.photoURL || '',
        avatar: u.photoURL || '',
        createdAt: F.serverTimestamp(),
      });
    }
    return plain(await ref.get());
  },

  async getUser(uid) {
    const s = await db.collection('users').doc(uid).get();
    const result = s.exists ? plain(s) : null;
    return result;
  },

  async updateProfile(updates) {
    const ref = db.collection('users').doc(uidOf());
    await ref.update(updates);
    const snap = await ref.get();
    const updated = plain(snap);
    Object.assign(me, updated);
    userCache[uidOf()] = updated;
    profileCache.set(uidOf(), updated);
    return updated;
  },

  async myInviteCode() {
    const ref = db.collection('users').doc(uidOf());
    const snap = await ref.get();
    if (snap.data().inviteCode) return snap.data().inviteCode;
    const code = await makeCode('users');
    await ref.update({ inviteCode: code });
    return code;
  },

  async createGroup(name) {
    const code = await makeCode('groups');
    const meUid = uidOf();
    const ref = await db.collection('groups').add({
      name, code, owner: meUid, members: [meUid], createdAt: F.serverTimestamp(),
    });
    return { id: ref.id, code };
  },

  async joinGroup(code) {
    const c = String(code || '').trim().toUpperCase();
    if (!c) throw new Error('Enter an invite code.');
    const hit = await db.collection('groups').where('code', '==', c).limit(1).get();
    if (hit.empty) throw new Error('No group matches that invite code.');
    const doc = hit.docs[0];
    const meUid = uidOf();
    if (doc.data().members.includes(meUid)) return { id: doc.id, already: true };
    await doc.ref.update({ members: F.arrayUnion(meUid) });
    return { id: doc.id, already: false };
  },

  async leaveGroup(groupId) {
    await db.collection('groups').doc(groupId).update({ members: F.arrayRemove(uidOf()) });
  },

  watchGroups(cb) {
    return db.collection('groups')
      .where('members', 'array-contains', uidOf())
      .onSnapshot(snap => cb(snap.docs.map(plain)));
  },

  async sendFriendRequest(code) {
    const c = String(code || '').trim().toUpperCase();
    if (!c) throw new Error('Enter a friend invite code.');
    const hit = await db.collection('users').where('inviteCode', '==', c).limit(1).get();
    if (hit.empty) throw new Error('No user matches that invite code.');
    const to = hit.docs[0];
    const meUid = uidOf();
    if (to.id === meUid) throw new Error('That is your own code.');
    const pair = [meUid, to.id].sort();
    const existing = await db.collection('friendships')
      .where('a', '==', pair[0]).where('b', '==', pair[1]).limit(1).get();
    if (!existing.empty) throw new Error('You are already friends.');
    const dup = await db.collection('friendRequests')
      .where('from', '==', meUid).where('to', '==', to.id).limit(1).get();
    if (!dup.empty) throw new Error('Request already sent.');
    await db.collection('friendRequests').add({
      from: meUid, to: to.id, a: pair[0], b: pair[1], status: 'pending',
      createdAt: F.serverTimestamp(),
    });
  },

  async acceptFriendRequest(requestId, fromUid) {
    const meUid = uidOf();
    const pair = [meUid, fromUid].sort();
    const batch = db.batch();
    batch.delete(db.collection('friendRequests').doc(requestId));
    batch.set(db.collection('friendships').doc(pair[0] + '_' + pair[1]), {
      pair, a: pair[0], b: pair[1], createdAt: F.serverTimestamp(),
    });
    await batch.commit();
  },

  async declineFriendRequest(requestId) {
    await db.collection('friendRequests').doc(requestId).delete();
  },

  watchIncomingRequests(cb) {
    return db.collection('friendRequests')
      .where('to', '==', uidOf())
      .where('status', '==', 'pending')
      .onSnapshot(snap => cb(snap.docs.map(plain)));
  },

  watchFriends(cb) {
    const meUid = uidOf();
    return db.collection('friendships')
      .where('pair', 'array-contains', meUid)
      .onSnapshot(async snap => {
        const list = await Promise.all(snap.docs.map(async d => {
          const data = d.data();
          const other = data.pair.find(u => u !== meUid);
          const p = userCache[other] || await cis.getUser(other);
          if (p) userCache[other] = p;
          return p ? { friendshipId: d.id, ...p } : null;
        }));
        cb(list.filter(Boolean));
      });
  },

  async removeFriend(friendshipId) {
    await db.collection('friendships').doc(friendshipId).delete();
  },

  watchMessages(scope, thread, cb) {
    let queryThread = thread;
    if (scope === 'dm') {
      const uids = [uidOf(), thread].sort();
      queryThread = uids.join('_');
    }
    const q = db.collection('messages')
      .where('scope', '==', scope)
      .where('thread', '==', queryThread)
      .orderBy('createdAt', 'asc');
    return q.onSnapshot(
      snap => cb(snap.docs.map(plain)),
      err => { console.error('[watchMessages] listener failed:', err.code, err.message); }
    );
  },

  async sendMessage(scope, thread, body, extra) {
    extra = extra || {};
    const text = String(body || '').trim();
    if (!text && !extra.file && !extra.audio) return;
    let participants = [uidOf()];
    let consistentThread = thread;
    if (scope === 'dm') {
      const uids = [uidOf(), thread].sort();
      consistentThread = uids.join('_');
      participants = uids;
    }
    const msgData = {
      scope, thread: consistentThread,
      from: uidOf(),
      body: text.slice(0, 2000),
      participants: participants,
      createdAt: F.serverTimestamp(),
    };
    if (extra.file) msgData.file = extra.file;
    if (extra.audio) msgData.audio = extra.audio;
    if (extra.fileName) msgData.fileName = extra.fileName;
    if (extra.fileType) msgData.fileType = extra.fileType;
    if (extra.fileSize) msgData.fileSize = extra.fileSize;
    await db.collection('messages').add(msgData);
  },

  watchPresence(uid, cb) {
    if (!rtdb) return () => {};
    return rtdb.ref('presence/' + uid).on('value', s => cb(s.val()));
  },

  async startCall(scope, threadId, participantUids) {
    const meUid = uidOf();
    let callThread = threadId;
    if (scope === 'dm') {
      const uids = [meUid, threadId].sort();
      callThread = uids.join('_');
    }
    const callRef = await db.collection('calls').add({
      scope, thread: callThread, participants: participantUids,
      createdBy: meUid, status: 'ringing', createdAt: F.serverTimestamp(),
    });
    return callRef.id;
  },

  watchCall(callId, cb) {
    return db.collection('calls').doc(callId).onSnapshot(snap => {
      if (snap.exists) cb(plain(snap));
    });
  },

  async joinCall(callId) {
    await db.collection('calls').doc(callId).update({
      status: 'active', joinedBy: F.arrayUnion(uidOf()),
    });
  },

  async leaveCall(callId) {
    await db.collection('calls').doc(callId).update({
      joinedBy: F.arrayRemove(uidOf()),
    });
  },

  async endCall(callId) {
    await db.collection('calls').doc(callId).update({ status: 'ended' });
  },

  async setCallOffer(callId, uid, offer) {
    await db.collection('calls').doc(callId).update({ ['offers.' + uid]: offer });
  },

  async setCallAnswer(callId, uid, answer) {
    await db.collection('calls').doc(callId).update({ ['answers.' + uid]: answer });
  },

  async setCallIce(callId, uid, candidate) {
    await db.collection('calls').doc(callId).update({
      ['ice.' + uid]: F.arrayUnion(candidate),
    });
  },

  watchActiveCall(scope, thread, cb) {
    let callThread = thread;
    if (scope === 'dm') {
      const uids = [uidOf(), thread].sort();
      callThread = uids.join('_');
    }
    return db.collection('calls')
      .where('scope', '==', scope)
      .where('thread', '==', callThread)
      .where('status', 'in', ['ringing', 'active'])
      .onSnapshot(snap => {
        if (!snap.empty) {
          const call = plain(snap.docs[0]);
          call.callId = snap.docs[0].id;
          cb(call);
        } else { cb(null); }
      });
  },
};

function initFirebase() {
  if (!window.firebase) { console.error('Firebase SDK did not load.'); return false; }
  try {
    firebase.initializeApp(cfg.firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    F = firebase.firestore.FieldValue;
    try { rtdb = firebase.database(); } catch (e) { rtdb = null; }
    provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return true;
  } catch (e) { console.error('Firebase init failed:', e); return false; }
}

// Wait for DOM to be ready before initializing
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Ciscord] DOM ready, checking config...');
  console.log('[Ciscord] IS_CONFIGURED:', IS_CONFIGURED);
  
  // ALWAYS set up event listeners first, regardless of Firebase status
  setupEventListeners();
  
  if (!IS_CONFIGURED) {
    const authEl = $('auth');
    const gateEl = $('gate');
    const gateBodyEl = $('gateBody');
    if (authEl) authEl.classList.add('hidden');
    if (gateEl) gateEl.classList.remove('hidden');
    if (gateBodyEl) gateBodyEl.textContent = 'Ciscord needs your Firebase keys. Open firebase-config.js and replace the placeholder values.';
  } else if (initFirebase()) {
    console.log('[Ciscord] Firebase initialized successfully');
    bootApp();
  } else {
    const authEl = $('auth');
    const gateEl = $('gate');
    const gateBodyEl = $('gateBody');
    if (authEl) authEl.classList.add('hidden');
    if (gateEl) gateEl.classList.remove('hidden');
    if (gateBodyEl) gateBodyEl.textContent = 'Firebase could not start. Check the developer console.';
  }
});

function setupEventListeners() {
  console.log('[Ciscord] Setting up event listeners...');
  
  $('send').addEventListener('click', send);
  $('input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) send(); });
  $('btnNewGroup').addEventListener('click', newGroup);
  $('btnJoinGroup').addEventListener('click', joinGroup);
  $('navHome').addEventListener('click', () => { 
    view = 'groups'; 
    renderSidebar(); 
    showMainView();
    updateNavButtons('home');
  });
  $('navFriends').addEventListener('click', () => { 
    view = 'friends'; 
    renderSidebar(); 
    showMainView();
    updateNavButtons('friends');
  });
  $('navAI').addEventListener('click', () => { 
    showAIMode();
    updateNavButtons('ai');
  });
  
  // AI Mode navigation buttons
  const aiNavHome = $('aiNavHome');
  if (aiNavHome) aiNavHome.addEventListener('click', () => { 
    view = 'groups'; 
    renderSidebar(); 
    showMainView();
    updateNavButtons('home');
  });
  const aiNavFriends = $('aiNavFriends');
  if (aiNavFriends) aiNavFriends.addEventListener('click', () => { 
    view = 'friends'; 
    renderSidebar(); 
    showMainView();
    updateNavButtons('friends');
  });
  const aiNavAI = $('aiNavAI');
  if (aiNavAI) aiNavAI.addEventListener('click', () => { 
    showAIMode();
    updateNavButtons('ai');
  });
  
  // AI Mode chat
  const aiSend = $('aiSend');
  if (aiSend) aiSend.addEventListener('click', sendAIMessage);
  const aiInput = $('aiInput');
  if (aiInput) aiInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) sendAIMessage(); });
  
  // AI Mode buttons
  const btnAiConfig = $('btnAiConfig');
  if (btnAiConfig) btnAiConfig.addEventListener('click', openAiSettings);
  const btnClearAiChat = $('btnClearAiChat');
  if (btnClearAiChat) btnClearAiChat.addEventListener('click', clearAIChat);
  const btnAiMe = $('btnAiMe');
  if (btnAiMe) btnAiMe.addEventListener('click', () => {
    const acctMenu = $('acctMenu');
    if (acctMenu) acctMenu.classList.remove('hidden');
  });

  const btnCall = $('btnCall');
  if (btnCall) btnCall.addEventListener('click', startVoiceCall);
  const btnMic = $('btnMic');
  if (btnMic) btnMic.addEventListener('click', toggleRecording);
  
  // Hangup buttons - always wire them up with debug logging
  const btnHangup = $('btnHangup');
  console.log('[Voice] btnHangup exists:', !!btnHangup);
  if (btnHangup) {
    btnHangup.addEventListener('click', () => {
      console.log('[Voice] Hangup button clicked (callBar) via addEventListener');
      endCurrentCall();
    });
  }
  const modalBtnHangup = $('modalBtnHangup');
  console.log('[Voice] modalBtnHangup exists:', !!modalBtnHangup);
  if (modalBtnHangup) {
    modalBtnHangup.addEventListener('click', () => {
      console.log('[Voice] Hangup button clicked (modal) via addEventListener');
      endCurrentCall();
    });
  }
  
  // Mute buttons
  const btnMute = $('btnMute');
  if (btnMute) btnMute.addEventListener('click', toggleMute);
  const modalBtnMute = $('modalBtnMute');
  if (modalBtnMute) modalBtnMute.addEventListener('click', toggleMute);

  $('googleBtn').addEventListener('click', async () => {
    const msg = $('authMsg');
    msg.textContent = 'Opening Google sign-in...';
    try { await cis.signInWithGoogle(); }
    catch (e) {
      msg.textContent = e.code === 'auth/popup-blocked' ? 'Popup was blocked - try again.'
        : (e.code === 'auth/operation-not-allowed' ? 'Google sign-in is not enabled in the Firebase console yet.'
        : (e.message || 'Sign-in failed'));
    }
  });

  initAccountMenu();
  initAiSettingsMenu();
  initFileDrop();
  
  console.log('[Ciscord] Event listeners setup complete');
}

function bootApp() {
  cis.onAuthChange(async user => {
    if (!user) {
      teardown();
      $('app').classList.add('hidden');
      $('auth').classList.remove('hidden');
      $('authMsg').textContent = '';
      return;
    }
    try { me = await cis.ensureProfile(); }
    catch (e) { $('authMsg').textContent = e.message || 'Could not load your profile.'; return; }
    $('auth').classList.add('hidden');
    $('app').classList.remove('hidden');
    renderMe();
    startWatching();
  });
  if (rtdb) {
    rtdb.ref('.info/connected').on('value', snap => {
      const uid = auth.currentUser && auth.currentUser.uid;
      if (!snap.val() || !uid) return;
      const ref = rtdb.ref('presence/' + uid);
      ref.onDisconnect().set({ online: false });
      ref.set({ online: true });
    });
  }
}

function teardown() {
  unsubs.splice(0).forEach(u => { try { u(); } catch {} });
  groups = []; friends = []; requests = [];
  active = null;
  profileCache.clear();
  presenceCache.clear();
  endCurrentCall();
}

function getDisplayName(userObj) {
  if (!userObj) return 'Unknown';
  return userObj.displayName || userObj.name || 'Unknown';
}

function getAvatarUrl(userObj) {
  if (!userObj) return '';
  return userObj.avatar || userObj.photo || '';
}

function renderMe() {
  const displayName = getDisplayName(me);
  $('meName').textContent = displayName || 'You';
  $('meEmail').textContent = me.email || '';
  const avatarUrl = getAvatarUrl(me);
  if (avatarUrl) {
    $('mePhoto').src = avatarUrl;
    $('mePhoto').classList.remove('hidden');
    $('meInitial').classList.add('hidden');
  } else {
    $('meInitial').textContent = (displayName || '?').charAt(0).toUpperCase();
    $('mePhoto').classList.add('hidden');
    $('meInitial').classList.remove('hidden');
  }
  $('acctEmail').textContent = me.email || '';
  if ($('acctDisplayName')) $('acctDisplayName').value = me.displayName || '';
  
  // Also update AI Mode view
  const aiMeName = $('aiMeName');
  const aiMeEmail = $('aiMeEmail');
  const aiMePhoto = $('aiMePhoto');
  const aiMeInitial = $('aiMeInitial');
  if (aiMeName) aiMeName.textContent = displayName || 'You';
  if (aiMeEmail) aiMeEmail.textContent = me.email || '';
  if (aiMePhoto && aiMeInitial) {
    if (avatarUrl) {
      aiMePhoto.src = avatarUrl;
      aiMePhoto.classList.remove('hidden');
      aiMeInitial.classList.add('hidden');
    } else {
      aiMeInitial.textContent = (displayName || '?').charAt(0).toUpperCase();
      aiMePhoto.classList.add('hidden');
      aiMeInitial.classList.remove('hidden');
    }
  }
}

function startWatching() {
  unsubs.push(cis.watchGroups(list => {
    const first = groups.length === 0 && list.length > 0;
    groups = list;
    renderRail();
    if (view === 'groups') renderSidebar();
    if (first) openGroup(groups[0]);
    if (active && active.scope === 'group' && !groups.some(g => g.id === active.id)) resetChat();
  }));
  unsubs.push(cis.watchFriends(list => {
    friends = list;
    if (view === 'friends') renderSidebar();
    if (active && active.scope === 'dm') renderMembers();
  }));
  unsubs.push(cis.watchIncomingRequests(list => {
    requests = list;
    if (view === 'friends') renderSidebar();
  }));
}

function renderRail() {
  const stack = $('railGroups');
  stack.innerHTML = '';
  groups.forEach(g => {
    const b = document.createElement('button');
    b.className = 'rail-btn';
    b.textContent = g.name.charAt(0).toUpperCase();
    b.title = g.name;
    if (active && active.scope === 'group' && active.id === g.id) {
      b.style.background = 'var(--accent)';
      b.style.color = '#06231f';
    }
    b.addEventListener('click', () => { view = 'groups'; openGroup(g); });
    stack.appendChild(b);
  });
}

function renderSidebar() {
  const body = $('sideBody');
  body.innerHTML = '';
  if (view === 'groups') {
    if (!groups.length) {
      $('sideHead').textContent = 'Groups';
      body.innerHTML = '<div class="empty">No groups yet.<br>Create one, or join with an invite code.</div>';
      return;
    }
    groups.forEach(g => {
      $('sideHead').textContent = g.name;
      const el = document.createElement('div');
      el.className = 'side-item' + (active && active.id === g.id ? ' active' : '');
      el.innerHTML = '<span style="opacity:.55">#</span><span>' + esc(g.name) + '</span>';
      el.addEventListener('click', () => openGroup(g));
      body.appendChild(el);
      const code = document.createElement('div');
      code.className = 'side-head-2';
      code.style.cursor = 'pointer';
      code.title = 'Copy the group invite code';
      code.textContent = 'invite: ' + esc(g.code);
      code.addEventListener('click', async () => {
        await navigator.clipboard.writeText(g.code);
        toast('Invite code ' + g.code + ' copied');
      });
      body.appendChild(code);
      const leave = document.createElement('div');
      leave.className = 'side-item';
      leave.style.fontSize = '12px';
      leave.textContent = 'Leave group';
      leave.addEventListener('click', async () => {
        if (await confirmBox('Leave group?', 'You will stop seeing "' + g.name + '".', 'Leave')) {
          await cis.leaveGroup(g.id);
          toast('Left the group');
        }
      });
      body.appendChild(leave);
    });
    return;
  }
  $('sideHead').textContent = 'Friends';
  const reqHead = document.createElement('div');
  reqHead.className = 'side-head-2';
  reqHead.textContent = requests.length ? 'Requests (' + requests.length + ')' : 'Requests';
  body.appendChild(reqHead);
  if (!requests.length) {
    const none = document.createElement('div');
    none.className = 'side-item';
    none.style.fontSize = '12px';
    none.textContent = 'No pending requests';
    body.appendChild(none);
  }
  requests.forEach(r => {
    const el = document.createElement('div');
    el.className = 'side-item';
    el.innerHTML = '<span class="dot"></span><span>...</span><span class="badge">new</span>';
    const accept = document.createElement('div');
    accept.className = 'side-item';
    accept.style.fontSize = '12px';
    accept.textContent = 'Accept request';
    accept.addEventListener('click', async () => {
      const who = await profile(r.from);
      await cis.acceptFriendRequest(r.id, r.from);
      toast('You and ' + getDisplayName(who) + ' are now friends');
    });
    body.appendChild(el);
    body.appendChild(accept);
    profile(r.from).then(p => { el.children[1].textContent = getDisplayName(p); });
  });
  const addItem = document.createElement('div');
  addItem.className = 'side-item';
  addItem.innerHTML = '<span>+</span><span>Add friend by code</span>';
  addItem.addEventListener('click', addFriend);
  body.appendChild(addItem);
  const myItem = document.createElement('div');
  myItem.className = 'side-item';
  myItem.innerHTML = '<span>*</span><span>Show my invite code</span>';
  myItem.addEventListener('click', showMyCode);
  body.appendChild(myItem);
  const frHead = document.createElement('div');
  frHead.className = 'side-head-2';
  frHead.textContent = 'Friends (' + friends.length + ')';
  body.appendChild(frHead);
  if (!friends.length) {
    const none = document.createElement('div');
    none.className = 'side-item';
    none.style.fontSize = '12px';
    none.textContent = 'No friends yet';
    body.appendChild(none);
  }
  friends.forEach(f => {
    const el = document.createElement('div');
    el.className = 'side-item' + (active && active.id === f.uid ? ' active' : '');
    const avatarUrl = getAvatarUrl(f);
    const avatarHtml = avatarUrl
      ? '<img class="avatar-img side-avatar" src="' + esc(avatarUrl) + '" alt="">'
      : '<span class="dot off" data-presence="' + esc(f.uid) + '"></span>';
    el.innerHTML = avatarHtml + '<span>' + esc(getDisplayName(f)) + '</span>';
    el.addEventListener('click', () => openDM(f));
    body.appendChild(el);
    watchPresenceDot(f.uid);
  });
}

function watchPresenceDot(uid) {
  if (presenceCache.has(uid)) return;
  presenceCache.set(uid, true);
  cis.watchPresence(uid, v => {
    const on = !!(v && v.online);
    document.querySelectorAll('[data-presence="' + uid + '"]').forEach(d => d.classList.toggle('off', !on));
    if (active && active.id === uid) renderMembers();
  });
}

async function profile(uid) {
  if (profileCache.has(uid)) return profileCache.get(uid);
  const p = (await cis.getUser(uid)) || { uid, name: 'Unknown' };
  profileCache.set(uid, p);
  return p;
}

function openGroup(g) {
  view = 'groups';
  active = { scope: 'group', id: g.id, title: g.name, ref: g };
  $('chatTitle').textContent = '# ' + g.name;
  $('sideHead').textContent = g.name;
  $('input').placeholder = 'Message #' + g.name;
  enableComposer(true);
  renderRail();
  renderSidebar();
  watchMessages();
  renderGroupMembers(g);
  watchCallState();
}

function openDM(f) {
  active = { scope: 'dm', id: f.uid, title: getDisplayName(f), ref: f };
  $('chatTitle').textContent = getDisplayName(f);
  $('sideHead').textContent = 'Friends';
  $('input').placeholder = 'Message ' + getDisplayName(f);
  enableComposer(true);
  renderSidebar();
  watchMessages();
  renderMembers();
  watchCallState();
}

function resetChat() {
  active = null;
  $('chatTitle').textContent = 'Ciscord';
  $('messages').innerHTML = '<div class="empty">Select a group or a friend</div>';
  $('members').innerHTML = '<div class="empty">-</div>';
  enableComposer(false);
  renderRail();
  renderSidebar();
  if (callUnsub) { try { callUnsub(); } catch {} callUnsub = null; }
  hideCallBar();
}

function enableComposer(on) {
  $('input').disabled = !on;
  $('send').disabled = !on;
  const btnAttach = $('btnAttach');
  const btnMic = $('btnMic');
  const btnCall = $('btnCall');
  if (btnAttach) btnAttach.disabled = !on;
  if (btnMic) btnMic.disabled = !on;
  if (btnCall) btnCall.disabled = !on;
  if (on) $('input').focus();
}

function watchMessages() {
  unsubs.splice(3).forEach(u => { try { u(); } catch {} });
  unsubs.push(cis.watchMessages(active.scope, active.id, renderMessages));
}

async function renderMessages(list) {
  window._lastMessages = list;
  const box = $('messages');
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<div class="empty">No messages yet - say something</div>';
    return;
  }
  const meUid = cis.currentUid();
  const profiles = {};
  for (const m of list) {
    if (m.from === meUid) { profiles[m.from] = me; }
    else if (!profiles[m.from]) { profiles[m.from] = await profile(m.from); }
  }
  list.forEach(m => {
    const authorProfile = profiles[m.from] || { name: 'Unknown' };
    const author = getDisplayName(authorProfile);
    const avatarUrl = getAvatarUrl(authorProfile);
    const el = document.createElement('div');
    el.className = 'msg';
    let contentHtml = '';
    
    if (m.type === 'call') {
      const callType = m.callType === 'group_voice' ? 'Group Call' : 'Voice Call';
      const isParticipant = m.participants && m.participants.includes(meUid);
      contentHtml += '<div class="msg-call">';
      contentHtml += '<div class="call-icon">📞</div>';
      contentHtml += '<div class="call-info">';
      contentHtml += '<div class="call-title">' + esc(callType) + '</div>';
      contentHtml += '<div class="call-status">' + (isParticipant ? 'You are in this call' : 'Call in progress') + '</div>';
      contentHtml += '</div>';
      if (!isParticipant && !activeCall) {
        contentHtml += '<button class="call-join-btn" data-call-id="' + esc(m.callId) + '">Join</button>';
      }
      contentHtml += '</div>';
    } else {
      if (m.body) contentHtml += '<div class="msg-text">' + esc(m.body) + '</div>';
      if (m.audio) contentHtml += '<div class="msg-audio"><audio controls preload="metadata" src="' + esc(m.audio) + '"></audio></div>';
      if (m.file) {
        const isImage = m.fileType && m.fileType.startsWith('image/');
        if (isImage) {
          contentHtml += '<div class="msg-file"><img class="msg-image" src="' + esc(m.file) + '" alt="' + esc(m.fileName || 'image') + '"></div>';
        } else {
          const sizeStr = m.fileSize ? formatFileSize(m.fileSize) : '';
          contentHtml += '<div class="msg-file"><a href="' + esc(m.file) + '" download="' + esc(m.fileName || 'file') + '" class="file-attachment">[file] ' + esc(m.fileName || 'file') + ' ' + (sizeStr ? '(' + sizeStr + ')' : '') + '</a></div>';
        }
      }
    }
    
    const avatarHtml = avatarUrl
      ? '<img class="avatar-img msg-avatar" src="' + esc(avatarUrl) + '" alt="">'
      : '<div class="avatar-txt">' + esc(author.charAt(0).toUpperCase()) + '</div>';
    el.innerHTML = avatarHtml +
      '<div class="msg-body"><div class="msg-head"><span class="msg-author">' + esc(author) + '</span><span class="msg-time">' + esc(fmtTime(m.createdAt)) + '</span></div>' + contentHtml + '</div>';
    box.appendChild(el);
  });
  
  box.querySelectorAll('.call-join-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const callId = e.target.dataset.callId;
      console.log('[Voice] Joining call from message:', callId);
      try {
        const callDoc = await db.collection('calls').doc(callId).get();
        const callData = callDoc.exists ? plain(callDoc) : null;
        if (!callData) { toast('Call not found'); return; }
        await joinExistingCall({ callId, scope: active.scope, thread: active.id, participants: callData.participants || [], createdBy: callData.createdBy });
      } catch (e) { console.error('[Voice] Could not join call:', e); toast('Could not join call'); }
    });
  });
  box.scrollTop = box.scrollHeight;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fmtTime(ts) {
  if (!ts) return '...';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-GB', { hour12: false, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function send() {
  const input = $('input');
  const body = input.value.trim();
  if (!body || !active) return;
  input.value = '';
  
  // Check if this is a DeepSeek command
  if (body.startsWith('/deepseek ') || body.startsWith('/ai ')) {
    const deepseekMessage = body.replace(/^\/(deepseek|ai)\s+/, '');
    const meUid = cis.currentUid();
    
    // Show user's message in chat
    const userMsg = { from: meUid, body: body, createdAt: new Date(), _optimistic: true };
    const currentMessages = [...(window._lastMessages || [])];
    currentMessages.push(userMsg);
    renderMessages(currentMessages);
    
    // Show "thinking" indicator
    const thinkingMsg = { from: 'deepseek', body: '🤔 Thinking...', createdAt: new Date(), _thinking: true };
    currentMessages.push(thinkingMsg);
    renderMessages(currentMessages);
    
    try {
      const result = await sendToAI(deepseekMessage);
      // Remove thinking indicator
      const thinkIdx = currentMessages.findIndex(m => m._thinking);
      if (thinkIdx >= 0) currentMessages.splice(thinkIdx, 1);
      
      if (result.success) {
        // Add AI's reply to chat
        const aiMsg = { 
          from: 'ai', 
          body: result.reply, 
          createdAt: new Date(),
          tokens: result.tokens,
          model: result.model
        };
        currentMessages.push(aiMsg);
        renderMessages(currentMessages);
        toast('AI replied ✓');
      } else {
        toast('AI error: ' + (result.error || 'Unknown error'));
        renderMessages(currentMessages);
      }
    } catch (e) {
      const thinkIdx = currentMessages.findIndex(m => m._thinking);
      if (thinkIdx >= 0) currentMessages.splice(thinkIdx, 1);
      renderMessages(currentMessages);
      toast('Could not send to AI: ' + e.message);
    }
    return; // Don't send as regular message
  }
  
  const meUid = cis.currentUid();
  const optimisticMsg = { from: meUid, body: body, createdAt: new Date(), _optimistic: true };
  const currentMessages = [...(window._lastMessages || [])];
  currentMessages.push(optimisticMsg);
  renderMessages(currentMessages);
  try { await cis.sendMessage(active.scope, active.id, body); }
  catch (e) {
    toast(e.message || 'Could not send');
    const idx = currentMessages.findIndex(m => m._optimistic);
    if (idx >= 0) { currentMessages.splice(idx, 1); renderMessages(currentMessages); }
  }
}

function initFileDrop() {
  const composer = document.querySelector('.composer');
  const messagesArea = $('messages');
  function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evtName => {
    if (composer) composer.addEventListener(evtName, preventDefaults);
    if (messagesArea) messagesArea.addEventListener(evtName, preventDefaults);
  });
  ['dragenter', 'dragover'].forEach(evtName => {
    if (composer) composer.addEventListener(evtName, () => composer.classList.add('drag-over'));
    if (messagesArea) messagesArea.addEventListener(evtName, () => messagesArea.classList.add('drag-over'));
  });
  ['dragleave', 'drop'].forEach(evtName => {
    if (composer) composer.addEventListener(evtName, () => composer.classList.remove('drag-over'));
    if (messagesArea) messagesArea.addEventListener(evtName, () => messagesArea.classList.remove('drag-over'));
  });
  if (composer) composer.addEventListener('drop', handleDrop);
  if (messagesArea) messagesArea.addEventListener('drop', handleDrop);
  function handleDrop(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0 && active) sendFile(files[0]);
  }
  const attachBtn = $('btnAttach');
  if (attachBtn) {
    attachBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = () => { if (input.files[0] && active) sendFile(input.files[0]); };
      input.click();
    });
  }
}

async function sendFile(file) {
  if (!active) return;
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) { toast('File too large (max 5MB)'); return; }
  toast('Uploading file...');
  try {
    const dataUrl = await readFileAsDataUrl(file);
    await cis.sendMessage(active.scope, active.id, '', { file: dataUrl, fileName: file.name, fileType: file.type, fileSize: file.size });
    toast('File sent');
  } catch (e) { console.error('File send error:', e); toast('Could not send file'); }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function startRecording() {
  if (isRecording) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      if (blob.size > 0 && active) {
        const dataUrl = await blobToDataUrl(blob);
        try { await cis.sendMessage(active.scope, active.id, '', { audio: dataUrl }); toast('Voice message sent'); }
        catch (e) { toast('Could not send voice message'); }
      }
      const btn = $('btnMic');
      if (btn) { btn.classList.remove('recording'); btn.textContent = 'MIC'; }
      isRecording = false;
    };
    mediaRecorder.start();
    isRecording = true;
    const btn = $('btnMic');
    if (btn) { btn.classList.add('recording'); btn.textContent = 'STOP'; }
    toast('Recording... click to stop');
  } catch (e) { console.error('Recording error:', e); toast('Microphone access denied'); }
}

function stopRecording() { if (mediaRecorder && isRecording) mediaRecorder.stop(); }

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function toggleRecording() { if (isRecording) stopRecording(); else startRecording(); }

// ══ Voice/Video Chat (PeerJS) - Group Calls (Max 10) ═══════
const MAX_GROUP_CALL_PARTICIPANTS = 10;
let localMediaStream = null;
let peer = null;
let activeCalls = new Map(); // Map of peerId -> call object (mesh network)
let currentCallId = null;
let isMuted = false;
let isVideoOff = false;

function initPeerJS() {
  if (peer && peer.open) {
    console.log('[Voice] PeerJS already initialized');
    return Promise.resolve(peer);
  }
  
  const myUid = uidOf();
  console.log('[Voice] Initializing PeerJS with ID:', myUid);
  
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    peer = new Peer(myUid, {
      debug: 2,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });
    
    peer.on('open', (id) => {
      console.log('[Voice] PeerJS connected with ID:', id);
      resolved = true;
      resolve(peer);
    });
    
    peer.on('error', (err) => {
      console.error('[Voice] PeerJS error:', err.type, err.message);
      
      // Only reject during initialization
      if (!resolved) {
        if (err.type === 'unavailable-id') {
          peer.destroy();
          peer = null;
          reject(new Error('Peer ID already in use'));
        } else {
          reject(err);
        }
      } else {
        // Runtime errors - just log them
        if (err.type === 'peer-unavailable') {
          console.error('[Voice] ❌ Peer is not available - they may not be connected yet');
        }
      }
    });
    
    peer.on('call', async (call) => {
      console.log('[Voice] 📞 Incoming call from:', call.peer);
      console.log('[Voice] My PeerJS ID:', peer.id);
      
      if (!localMediaStream) {
        try {
          localMediaStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: { width: 640, height: 480 }
          });
          console.log('[Voice] ✅ Microphone and camera granted for incoming call');
          localMediaStream.getTracks().forEach(t => { 
            t.enabled = true;
          });
        } catch (e) {
          console.error('[Voice] ❌ Could not get microphone/camera:', e);
          // Try audio only if camera fails
          try {
            localMediaStream = await navigator.mediaDevices.getUserMedia({ 
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
              video: false
            });
            console.log('[Voice] ✅ Microphone only (camera not available)');
          } catch (e2) {
            call.close();
            return;
          }
        }
      }
      
      console.log('[Voice] Answering call with stream:', localMediaStream.getTracks().length, 'tracks');
      call.answer(localMediaStream);
      handleCallStream(call);
    });
    
    setTimeout(() => {
      if (!resolved) {
        reject(new Error('PeerJS connection timeout'));
      }
    }, 10000);
  });
}

function handleCallStream(call) {
  activeCalls.set(call.peer, call); // Add to active calls map (supports multiple peers)
  console.log('[Voice] 🔗 Handling call stream with peer:', call.peer);
  console.log('[Voice] Active calls count:', activeCalls.size);
  
  call.on('stream', (remoteStream) => {
    console.log('[Voice] 🎵 Received remote stream from:', call.peer);
    console.log('[Voice] Stream tracks:', remoteStream.getTracks().map(t => t.kind + ':' + t.label));
    
    // Check if stream has video
    const hasVideo = remoteStream.getVideoTracks().length > 0;
    
    let mediaEl = document.getElementById('media-' + call.peer);
    if (!mediaEl) {
      // Create video element if stream has video, otherwise audio
      mediaEl = document.createElement(hasVideo ? 'video' : 'audio');
      mediaEl.id = 'media-' + call.peer;
      mediaEl.autoplay = true;
      mediaEl.playsInline = true;
      mediaEl.muted = false;
      mediaEl.volume = 1.0;
      if (hasVideo) {
        mediaEl.style.cssText = 'width:320px;height:240px;border-radius:8px;margin:8px;background:#000;';
      } else {
        mediaEl.style.display = 'none';
      }
      document.body.appendChild(mediaEl);
    }
    
    if ('srcObject' in mediaEl) {
      mediaEl.srcObject = remoteStream;
    } else {
      mediaEl.src = window.URL.createObjectURL(remoteStream);
    }
    
    const tryPlay = async (attempt) => {
      attempt = attempt || 1;
      try {
        await mediaEl.play();
        console.log('[Voice] Media playing for', call.peer, 'attempt', attempt);
      } catch (err) {
        if (attempt < 8) setTimeout(() => tryPlay(attempt + 1), 300 * attempt);
        else console.error('[Voice] Media playback failed for', call.peer);
      }
    };
    tryPlay();
    
    const s = $('callModalStatus');
    if (s) s.textContent = `Connected (${activeCalls.size} participant${activeCalls.size > 1 ? 's' : ''})`;
    
    // Update call UI to show participant
    updateCallParticipants();
  });
  
  call.on('close', () => {
    console.log('[Voice] 📴 Call closed with peer:', call.peer);
    activeCalls.delete(call.peer);
    const mediaEl = document.getElementById('media-' + call.peer);
    if (mediaEl) mediaEl.remove();
    updateCallParticipants();
    
    // If no more active calls, end the call
    if (activeCalls.size === 0) {
      endCurrentCall();
    }
  });
  
  call.on('error', (err) => {
    console.error('[Voice] Call error with peer:', call.peer, err);
    activeCalls.delete(call.peer);
    const mediaEl = document.getElementById('media-' + call.peer);
    if (mediaEl) mediaEl.remove();
    updateCallParticipants();
  });
}

function updateCallParticipants() {
  const participantList = $('callParticipants');
  if (!participantList) return;
  
  participantList.innerHTML = '';
  
  // Add local user
  const localDiv = document.createElement('div');
  localDiv.className = 'participant';
  localDiv.innerHTML = `
    <div class="participant-info">
      <span class="participant-name">${me.displayName || me.email} (You)</span>
      <span class="participant-status">${isMuted ? '🔇 Muted' : '🎤 Speaking'}</span>
      ${isVideoOff ? '<span class="participant-status">📷 Camera Off</span>' : ''}
    </div>
  `;
  participantList.appendChild(localDiv);
  
  // Add remote participants
  activeCalls.forEach((call, peerId) => {
    const participantDiv = document.createElement('div');
    participantDiv.className = 'participant';
    participantDiv.innerHTML = `
      <div class="participant-info">
        <span class="participant-name">User ${peerId.substring(0, 5)}</span>
        <span class="participant-status">🎤 Connected</span>
      </div>
    `;
    participantList.appendChild(participantDiv);
  });
}

function toggleVideo() {
  if (!localMediaStream) return;
  
  const videoTracks = localMediaStream.getVideoTracks();
  if (videoTracks.length === 0) {
    toast('No camera available');
    return;
  }
  
  isVideoOff = !isVideoOff;
  videoTracks.forEach(track => {
    track.enabled = !isVideoOff;
  });
  
  toast(isVideoOff ? 'Camera off' : 'Camera on');
  updateCallParticipants();
}

function disconnectVoiceServer() {
  console.log('[Voice] ========== disconnectVoiceServer START ==========');
  console.log('[Voice] activeCalls.size:', activeCalls.size);
  console.log('[Voice] peer:', peer ? 'exists' : 'null');
  console.log('[Voice] localMediaStream:', localMediaStream ? 'exists' : 'null');
  
  try {
    // Close all active PeerJS calls
    console.log('[Voice] Closing', activeCalls.size, 'active calls');
    activeCalls.forEach((call, peerId) => {
      console.log('[Voice] Closing call with peer:', peerId);
      try {
        call.close();
        console.log('[Voice] Call closed successfully with peer:', peerId);
      } catch (err) {
        console.error('[Voice] Error closing call with peer:', peerId, err);
      }
    });
    activeCalls.clear();
    console.log('[Voice] All calls cleared');
    
    if (peer) {
      console.log('[Voice] Destroying peer connection');
      peer.destroy();
      peer = null;
      console.log('[Voice] Peer destroyed');
    }
    
    if (localMediaStream) {
      console.log('[Voice] Stopping local media tracks');
      localMediaStream.getTracks().forEach(t => {
        t.stop();
        console.log('[Voice] Stopped local track:', t.kind, t.label);
      });
      localMediaStream = null;
      console.log('[Voice] Local media stream cleared');
    }
    
    // Remove all media elements
    console.log('[Voice] Removing media elements');
    document.querySelectorAll('[id^="media-"]').forEach(el => {
      el.srcObject = null;
      el.remove();
    });
    document.querySelectorAll('[id^="audio-"]').forEach(el => {
      el.srcObject = null;
      el.remove();
    });
    
    isMuted = false;
    isVideoOff = false;
    
    console.log('[Voice] ========== disconnectVoiceServer COMPLETE ==========');
  } catch (error) {
    console.error('[Voice] ERROR in disconnectVoiceServer:', error);
    console.error('[Voice] Error stack:', error.stack);
  }
}

async function startVoiceCall() {
  if (!active || activeCall) {
    if (activeCall) toast('Already in a call');
    return;
  }
  
  try {
    console.log('[Voice] Starting call in', active.scope, active.id);
    const meUid = uidOf();
    
    // Check participant limit for group calls
    let allParticipants = [];
    if (active.scope === 'group') {
      allParticipants = active.ref.members || [meUid];
      if (allParticipants.length > MAX_GROUP_CALL_PARTICIPANTS) {
        toast(`Group too large for voice call (max ${MAX_GROUP_CALL_PARTICIPANTS} participants)`);
        return;
      }
    }
    
    // Clean up old calls
    let callThread = active.id;
    if (active.scope === 'dm') {
      const uids = [meUid, active.id].sort();
      callThread = uids.join('_');
    }
    const existing = await db.collection('calls')
      .where('scope', '==', active.scope)
      .where('thread', '==', callThread)
      .where('status', 'in', ['ringing', 'active'])
      .get();
    if (!existing.empty) {
      for (const d of existing.docs) {
        await db.collection('calls').doc(d.id).update({ status: 'ended' }).catch(() => {});
      }
    }
    
    // Get microphone only (audio-only for voice calls)
    localMediaStream = await navigator.mediaDevices.getUserMedia({ 
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
    console.log('[Voice] Microphone granted');
    localMediaStream.getAudioTracks().forEach(t => {
      t.enabled = true;
      console.log('[Voice] Audio track:', t.label);
    });
    
    // Initialize PeerJS
    await initPeerJS();
    
    // Create call in Firestore
    let participants = [];
    if (active.scope === 'dm') participants = [meUid, active.id];
    else if (active.scope === 'group') participants = allParticipants;
    
    const callId = await cis.startCall(active.scope, active.id, participants);
    console.log('[Voice] Call created:', callId);
    
    await cis.sendMessage(active.scope, active.id, '', { 
      type: 'call', 
      callId: callId, 
      callType: active.scope === 'dm' ? 'voice' : 'group_voice',
      participants: participants 
    });
    await cis.joinCall(callId);
    
    activeCall = { callId, scope: active.scope, thread: active.id, participants };
    showCallBar('Waiting for others to join...');
    toast('Call started');
    
    // Watch for peers to join
    if (callUnsub) { try { callUnsub(); } catch {} }
    callUnsub = cis.watchCall(callId, async (cd) => {
      if (cd.status === 'ended') {
        endCurrentCall();
        return;
      }
      
      // Only the CALLER initiates PeerJS calls to all joined peers
      if (cd.createdBy === meUid && cd.joinedBy && cd.joinedBy.length > 1) {
        const peersToCall = cd.joinedBy.filter(u => u !== meUid && !activeCalls.has(u));
        
        // Check if we're at max capacity
        if (activeCalls.size + peersToCall.length > MAX_GROUP_CALL_PARTICIPANTS) {
          console.log('[Voice] ⚠️ Would exceed max participants, skipping some');
        }
        
        // Call each peer who hasn't been called yet
        peersToCall.forEach((peerId, index) => {
          if (activeCalls.size >= MAX_GROUP_CALL_PARTICIPANTS) {
            console.log('[Voice] ⚠️ Max participants reached');
            return;
          }
          
          // Stagger calls to avoid overwhelming the network
          setTimeout(() => {
            if (activeCalls.has(peerId)) return; // Already called
            
            console.log('[Voice] 📞 Calling peer:', peerId, `(${index + 1}/${peersToCall.length})`);
            console.log('[Voice] Active calls:', activeCalls.size, '/', MAX_GROUP_CALL_PARTICIPANTS);
            
            try {
              const call = peer.call(peerId, localMediaStream);
              console.log('[Voice] ✅ Call initiated to:', peerId);
              handleCallStream(call);
            } catch (err) {
              console.error('[Voice] ❌ Failed to call peer:', peerId, err);
            }
          }, 1500 * (index + 1));
        });
        
        // Update UI with current participant count
        const joinedCount = cd.joinedBy.length;
        showCallBar(`Connected (${joinedCount} participant${joinedCount > 1 ? 's' : ''})`);
      }
    });
    
  } catch (e) {
    console.error('[Voice] Call error:', e);
    if (localMediaStream) {
      localMediaStream.getTracks().forEach(t => t.stop());
      localMediaStream = null;
    }
    disconnectVoiceServer();
    toast('Could not start call');
  }
}

async function joinExistingCall(callData) {
  try {
    console.log('[Voice] Joining call:', callData.callId);
    
    // Check participant limit
    const currentParticipants = callData.joinedBy ? callData.joinedBy.length : 1;
    if (currentParticipants >= MAX_GROUP_CALL_PARTICIPANTS) {
      toast(`Call is full (${MAX_GROUP_CALL_PARTICIPANTS} participants max)`);
      return;
    }
    
    // Get microphone only (audio-only for voice calls)
    localMediaStream = await navigator.mediaDevices.getUserMedia({ 
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
    console.log('[Voice] Microphone granted');
    localMediaStream.getAudioTracks().forEach(t => { 
      t.enabled = true;
    });
    
    await cis.joinCall(callData.callId);
    activeCall = { 
      callId: callData.callId, 
      scope: callData.scope, 
      thread: callData.thread, 
      participants: callData.participants 
    };
    
    // Initialize PeerJS - will handle incoming call via peer.on('call')
    await initPeerJS();
    
    showCallBar('Connecting...');
    
    if (callUnsub) { try { callUnsub(); } catch {} }
    callUnsub = cis.watchCall(callData.callId, async (cd) => {
      if (cd.status === 'ended') endCurrentCall();
      else if (cd.joinedBy) {
        const joinedCount = cd.joinedBy.length;
        showCallBar(`Connected (${joinedCount} participant${joinedCount > 1 ? 's' : ''})`);
      }
    });
    
    toast('Joined call');
  } catch (e) {
    console.error('[Voice] Join error:', e);
    if (localMediaStream) {
      localMediaStream.getTracks().forEach(t => t.stop());
      localMediaStream = null;
    }
    disconnectVoiceServer();
    toast('Could not join call');
    hideCallBar();
  }
}

function endCurrentCall() {
  console.log('[Voice] ========== endCurrentCall START ==========');
  console.log('[Voice] activeCall:', activeCall);
  console.log('[Voice] activeCalls.size:', activeCalls.size);
  console.log('[Voice] peer:', peer ? 'exists' : 'null');
  console.log('[Voice] localMediaStream:', localMediaStream ? 'exists' : 'null');
  
  try {
    // Always clean up, even if activeCall is null
    if (activeCall && activeCall.callId) {
      console.log('[Voice] Ending call ID:', activeCall.callId);
      cis.endCall(activeCall.callId)
        .then(() => console.log('[Voice] endCall success'))
        .catch(e => console.error('[Voice] endCall error:', e));
      cis.leaveCall(activeCall.callId)
        .then(() => console.log('[Voice] leaveCall success'))
        .catch(e => console.error('[Voice] leaveCall error:', e));
    }
    
    // Clean up PeerJS connections
    console.log('[Voice] Calling disconnectVoiceServer()');
    disconnectVoiceServer();
    
    // Reset state
    activeCall = null;
    
    // Hide UI
    console.log('[Voice] Hiding call UI');
    hideCallBar();
    const modal = $('callModal');
    if (modal) modal.classList.add('hidden');
    
    console.log('[Voice] ========== endCurrentCall COMPLETE ==========');
  } catch (error) {
    console.error('[Voice] ERROR in endCurrentCall:', error);
    console.error('[Voice] Error stack:', error.stack);
  }
}

// Make functions globally accessible for inline onclick handlers
window.endCurrentCall = endCurrentCall;
window.toggleMute = toggleMute;

function toggleMute() {
  if (!activeCall || !localMediaStream) return;
  const audioTracks = localMediaStream.getAudioTracks();
  isMuted = !isMuted;
  audioTracks.forEach(track => { track.enabled = !isMuted; });
  const btn = $('btnMute');
  if (btn) btn.textContent = isMuted ? 'Unmute' : 'Mute';
  const modalBtn = $('modalBtnMute');
  if (modalBtn) {
    modalBtn.querySelector('.label').textContent = isMuted ? 'Unmute' : 'Mute';
    if (isMuted) modalBtn.classList.add('active'); else modalBtn.classList.remove('active');
  }
  toast(isMuted ? 'Microphone muted' : 'Microphone unmuted');
}

function watchCallState() {
  if (callUnsub) { try { callUnsub(); } catch {} callUnsub = null; }
  if (!active) return;
  callUnsub = cis.watchActiveCall(active.scope, active.id, callData => {
    if (callData && !activeCall) {
      let callTime;
      if (callData.createdAt?.toDate) callTime = callData.createdAt.toDate();
      else if (typeof callData.createdAt === 'number') callTime = new Date(callData.createdAt);
      else { console.warn('[Call] Invalid timestamp for call:', callData.callId); return; }
      const now = new Date();
      const diffMinutes = (now - callTime) / (1000 * 60);
      if (diffMinutes < 0 || diffMinutes > 60 * 24) { console.warn('[Call] Unreasonable age:', Math.round(diffMinutes), 'min - ignoring'); return; }
      const meUid = uidOf();
      if (callData.createdBy === meUid) return;
      if (diffMinutes < 5) showIncomingCall(callData);
      else { console.log('[Call] Auto-ending old call:', callData.callId); cis.endCall(callData.callId).catch(() => {}); }
    }
    else if (!callData && activeCall) endCurrentCall();
  });
}

function showIncomingCall(callData) {
  console.log('[Voice] showIncomingCall called');
  const modal = $('callModal');
  const bar = $('callBar');
  
  // Show modal (primary UI) and hide call bar (redundant)
  if (modal) {
    modal.classList.remove('hidden');
    $('callModalTitle').textContent = 'Incoming Call';
    $('callModalStatus').textContent = 'Incoming call...';
    const modalBtnMute = $('modalBtnMute');
    if (modalBtnMute) modalBtnMute.style.display = 'none';
    const controls = modal.querySelector('.call-controls');
    if (controls) {
      const oldAccept = controls.querySelector('#modalCallAccept');
      const oldDecline = controls.querySelector('#modalCallDecline');
      if (oldAccept) oldAccept.remove();
      if (oldDecline) oldDecline.remove();
      const btnAccept = document.createElement('button');
      btnAccept.id = 'modalCallAccept';
      btnAccept.className = 'call-control-btn';
      btnAccept.style.background = 'var(--accent)';
      btnAccept.style.borderColor = 'var(--accent)';
      btnAccept.style.color = '#06231f';
      btnAccept.innerHTML = '<span class="icon">✓</span><span class="label">Accept</span>';
      const btnDecline = document.createElement('button');
      btnDecline.id = 'modalCallDecline';
      btnDecline.className = 'call-control-btn hangup';
      btnDecline.innerHTML = '<span class="icon">✕</span><span class="label">Decline</span>';
      controls.appendChild(btnAccept);
      controls.appendChild(btnDecline);
      btnAccept.onclick = async () => {
        btnAccept.disabled = true; btnDecline.disabled = true;
        await joinExistingCall(callData);
        if (modalBtnMute) modalBtnMute.style.display = '';
        btnAccept.remove(); btnDecline.remove();
      };
      btnDecline.onclick = () => {
        if (modalBtnMute) modalBtnMute.style.display = '';
        btnAccept.remove(); btnDecline.remove();
        modal.classList.add('hidden');
      };
    }
  }
  
  // Hide the call bar since modal covers it
  if (bar) {
    bar.classList.add('hidden');
  }
}

function showCallBar(text) {
  console.log('[Voice] showCallBar called with text:', text);
  const modal = $('callModal');
  const bar = $('callBar');
  
  // Show modal (primary UI) and hide call bar (redundant)
  if (modal) {
    modal.classList.remove('hidden');
    $('callModalTitle').textContent = active ? (active.title || 'Voice Call') : 'Voice Call';
    $('callModalStatus').textContent = text;
    const modalBtnMute = $('modalBtnMute');
    const modalBtnHangup = $('modalBtnHangup');
    console.log('[Voice] Modal buttons:', { modalBtnMute: !!modalBtnMute, modalBtnHangup: !!modalBtnHangup });
    if (modalBtnMute) { 
      modalBtnMute.querySelector('.label').textContent = 'Mute'; 
      modalBtnMute.classList.remove('active'); 
    }
    updateCallParticipants();
  }
  
  // Hide the call bar since modal covers it
  if (bar) {
    bar.classList.add('hidden');
  }
}

function updateCallParticipants() {
  if (!activeCall) return;
  const container = $('callParticipants');
  if (!container) return;
  container.innerHTML = '';
  activeCall.participants.forEach(uid => {
    const participant = document.createElement('div');
    participant.className = 'call-participant';
    participant.style.cssText = 'width: 100px; height: 100px; border-radius: 50%; background: var(--bg-side); display: flex; align-items: center; justify-content: center; font-size: 32px; border: 3px solid var(--accent);';
    participant.textContent = uid === uidOf() ? 'You' : '👤';
    container.appendChild(participant);
  });
}

function hideCallBar() { 
  const bar = $('callBar'); 
  if (bar) bar.classList.add('hidden'); 
  const modal = $('callModal');
  if (modal) modal.classList.add('hidden');
}

async function renderGroupMembers(g) {
  const box = $('members');
  box.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'side-head-2';
  head.textContent = 'Members (' + g.members.length + ')';
  box.appendChild(head);
  for (const uid of g.members) {
    const p = await profile(uid);
    const el = document.createElement('div');
    el.className = 'member';
    const avatarUrl = getAvatarUrl(p);
    const avatarHtml = avatarUrl
      ? '<img class="avatar-img member-avatar" src="' + esc(avatarUrl) + '" alt="">'
      : '<span class="dot off" data-presence="' + esc(uid) + '"></span>';
    el.innerHTML = avatarHtml + '<div><div class="member-name">' + esc(getDisplayName(p)) + (uid === cis.currentUid() ? ' (you)' : '') + '</div><div class="member-role">' + (uid === g.owner ? 'Owner' : 'Member') + '</div></div>';
    box.appendChild(el);
    watchPresenceDot(uid);
  }
}

function renderMembers() {
  if (active && active.scope === 'group') return renderGroupMembers(active.ref);
  const box = $('members');
  box.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'side-head-2';
  head.textContent = 'Conversation';
  box.appendChild(head);
  const f = active && active.ref;
  if (!f) return;
  const el = document.createElement('div');
  el.className = 'member';
  const avatarUrl = getAvatarUrl(f);
  const avatarHtml = avatarUrl
    ? '<img class="avatar-img member-avatar" src="' + esc(avatarUrl) + '" alt="">'
    : '<span class="dot off" data-presence="' + esc(f.uid) + '"></span>';
  el.innerHTML = avatarHtml + '<div><div class="member-name">' + esc(getDisplayName(f)) + '</div><div class="member-role">' + esc(f.email || '') + '</div></div>';
  box.appendChild(el);
  watchPresenceDot(f.uid);
  const rm = document.createElement('div');
  rm.className = 'side-item';
  rm.style.fontSize = '12px';
  rm.textContent = 'Remove friend';
  rm.addEventListener('click', async () => {
    if (await confirmBox('Remove friend?', 'Your private chat with ' + getDisplayName(f) + ' will close.', 'Remove')) {
      await cis.removeFriend(f.friendshipId);
      resetChat();
      toast('Friend removed');
    }
  });
  box.appendChild(rm);
}

async function newGroup() {
  const name = await ask({ title: 'Create a group', text: 'Anyone with the invite code can join.', placeholder: 'Group name' });
  if (!name) return;
  try { const g = await cis.createGroup(name); toast('Group created - invite code ' + g.code); }
  catch (e) { toast(e.message || 'Could not create group'); }
}

async function joinGroup() {
  const code = await ask({ title: 'Join a group', text: 'Enter the invite code the owner gave you.', placeholder: 'ABC123' });
  if (!code) return;
  try { const r = await cis.joinGroup(code); toast(r.already ? 'You are already in that group' : 'Joined the group'); }
  catch (e) { toast(e.message || 'Could not join'); }
}

async function addFriend() {
  const code = await ask({ title: 'Add a friend', text: 'Enter the code your friend shared with you.', placeholder: 'ABC123' });
  if (!code) return;
  try { await cis.sendFriendRequest(code); toast('Friend request sent'); }
  catch (e) { toast(e.message || 'Could not send friend request'); }
}

async function showMyCode() {
  const code = await cis.myInviteCode();
  $('acctCode').textContent = code;
  openMeMenu();
}

function openMeMenu() { $('meMenu').classList.remove('hidden'); }
function closeMeMenu() { $('meMenu').classList.add('hidden'); }

function initAccountMenu() {
  $('btnMe').addEventListener('click', async () => {
    $('acctCode').textContent = '...';
    if ($('acctDisplayName')) $('acctDisplayName').value = me.displayName || '';
    openMeMenu();
    try { $('acctCode').textContent = await cis.myInviteCode(); }
    catch { $('acctCode').textContent = '-'; }
  });
  $('meMenu').addEventListener('click', e => { if (e.target.id === 'meMenu') closeMeMenu(); });
  $('btnCopyCode').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('acctCode').textContent);
    toast('Code copied');
  });
  $('btnSignOut').addEventListener('click', async () => { closeMeMenu(); await cis.signOut(); });
  $('btnDelete').addEventListener('click', async () => {
    if (await confirmBox('Delete your account?', 'Your profile, friendships and friend requests are removed. This cannot be undone.', 'Delete')) {
      closeMeMenu();
      try { await cis.deleteAccount(); toast('Account deleted'); }
      catch (e) { toast(e.message || 'Delete failed'); }
    }
  });
  const btnSaveDN = $('btnSaveDisplayName');
  if (btnSaveDN) {
    btnSaveDN.addEventListener('click', async () => {
      const displayName = $('acctDisplayName').value.trim();
      if (displayName) {
        try { await cis.updateProfile({ displayName }); toast('Display name updated'); }
        catch (e) { toast(e.message || 'Update failed'); }
      }
    });
  }
  
  // AI Settings button
  const btnAiSettings = $('btnAiSettings');
  if (btnAiSettings) {
    btnAiSettings.addEventListener('click', () => {
      closeMeMenu();
      openAiSettings();
    });
  }
}

// ════════════════════════════════════════════════════════════════════
// AI Mode - Private Chat with AI
// ════════════════════════════════════════════════════════════════════

let aiChatHistory = [];

function showAIMode() {
  console.log('[AI Mode] Showing AI Mode view');
  const app = document.querySelector('.app');
  const aiModeView = $('aiModeView');
  
  if (app) app.classList.add('hidden');
  if (aiModeView) aiModeView.classList.remove('hidden');
  
  // Update AI provider info
  updateAIProviderInfo();
  
  // Load chat history
  loadAIChat();
  
  // Focus input
  const aiInput = $('aiInput');
  if (aiInput) aiInput.focus();
}

function showMainView() {
  console.log('[AI Mode] Showing main view');
  const app = document.querySelector('.app');
  const aiModeView = $('aiModeView');
  
  if (app) app.classList.remove('hidden');
  if (aiModeView) aiModeView.classList.add('hidden');
}

function updateNavButtons(activeView) {
  // Remove active class from all nav buttons
  const allNavButtons = document.querySelectorAll('.rail-btn.nav-btn');
  allNavButtons.forEach(btn => btn.classList.remove('active'));
  
  // Add active class to the appropriate button
  if (activeView === 'home') {
    const homeBtn = $('navHome');
    if (homeBtn) homeBtn.classList.add('active');
  } else if (activeView === 'friends') {
    const friendsBtn = $('navFriends');
    if (friendsBtn) friendsBtn.classList.add('active');
  } else if (activeView === 'ai') {
    const aiBtn = $('navAI');
    if (aiBtn) aiBtn.classList.add('active');
  }
}

function updateAIProviderInfo() {
  const settings = getAiSettings();
  const providerInfo = $('aiCurrentProvider');
  if (providerInfo) {
    if (settings.provider && settings.apiKey) {
      const providerNames = {
        'openrouter': 'OpenRouter',
        'groq': 'Groq',
        'together': 'Together AI',
        'mistral': 'Mistral AI',
        'cohere': 'Cohere',
        'huggingface': 'Hugging Face',
        'alibaba': 'Alibaba (Qwen)',
        'deepseek': 'DeepSeek',
        'openai': 'OpenAI',
        'anthropic': 'Anthropic',
        'custom': 'Custom'
      };
      providerInfo.textContent = providerNames[settings.provider] || settings.provider;
    } else {
      providerInfo.textContent = 'Not configured';
    }
  }
}

function loadAIChat() {
  const saved = localStorage.getItem('ciscord_ai_chat_history');
  if (saved) {
    try {
      aiChatHistory = JSON.parse(saved);
      renderAIChat();
    } catch (e) {
      console.error('[AI Mode] Failed to load chat history:', e);
      aiChatHistory = [];
    }
  } else {
    aiChatHistory = [];
    renderAIChat();
  }
}

function saveAIChat() {
  localStorage.setItem('ciscord_ai_chat_history', JSON.stringify(aiChatHistory));
}

function renderAIChat() {
  const messagesEl = $('aiMessages');
  if (!messagesEl) return;
  
  if (aiChatHistory.length === 0) {
    messagesEl.innerHTML = `
      <div class="ai-welcome">
        <div class="ai-welcome-icon">🤖</div>
        <h2>Welcome to AI Mode</h2>
        <p>Your private chat with AI. Conversations are saved locally.</p>
        <p class="ai-tip">💡 <strong>Tip:</strong> Configure your AI provider in Settings for the best experience. We recommend <strong>Groq</strong> (free & fast) or <strong>OpenRouter</strong> (100+ models).</p>
      </div>
    `;
    return;
  }
  
  messagesEl.innerHTML = '';
  aiChatHistory.forEach(msg => {
    const msgEl = document.createElement('div');
    msgEl.className = `ai-message ${msg.role}`;
    
    const avatar = msg.role === 'user' ? '👤' : '🤖';
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    msgEl.innerHTML = `
      <div class="ai-message-avatar">${avatar}</div>
      <div>
        <div class="ai-message-content">${escapeHtml(msg.content)}</div>
        <div class="ai-message-time">${time}</div>
      </div>
    `;
    
    messagesEl.appendChild(msgEl);
  });
  
  // Scroll to bottom
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function sendAIMessage() {
  const input = $('aiInput');
  if (!input) return;
  
  const message = input.value.trim();
  if (!message) return;
  
  // Check if AI is configured
  const settings = getAiSettings();
  if (!settings.apiKey) {
    toast('⚠️ Please configure your AI provider first');
    openAiSettings();
    return;
  }
  
  // Add user message
  const userMsg = {
    role: 'user',
    content: message,
    timestamp: Date.now()
  };
  aiChatHistory.push(userMsg);
  saveAIChat();
  renderAIChat();
  
  // Clear input
  input.value = '';
  
  // Show thinking indicator
  const messagesEl = $('aiMessages');
  const thinkingEl = document.createElement('div');
  thinkingEl.className = 'ai-message ai';
  thinkingEl.id = 'ai-thinking';
  thinkingEl.innerHTML = `
    <div class="ai-message-avatar">🤖</div>
    <div>
      <div class="ai-message-content">
        <div class="ai-thinking">
          <div class="ai-thinking-dot"></div>
          <div class="ai-thinking-dot"></div>
          <div class="ai-thinking-dot"></div>
        </div>
      </div>
    </div>
  `;
  messagesEl.appendChild(thinkingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  
  // Send to AI
  try {
    // Pass conversation history for context (all messages)
    const result = await sendToAI(message, aiChatHistory);
    
    // Remove thinking indicator
    const thinking = $('ai-thinking');
    if (thinking) thinking.remove();
    
    // Check if result is valid
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from AI service');
    }
    
    if (result.success) {
      // Add AI response
      const aiMsg = {
        role: 'ai',
        content: result.reply || 'No response received',
        timestamp: Date.now()
      };
      aiChatHistory.push(aiMsg);
      saveAIChat();
      renderAIChat();
    } else {
      // Show error
      const errorMsg = {
        role: 'ai',
        content: '⚠️ Error: ' + (result.error || 'Unknown error occurred'),
        timestamp: Date.now()
      };
      aiChatHistory.push(errorMsg);
      saveAIChat();
      renderAIChat();
    }
  } catch (e) {
    console.error('[AI Mode] Error:', e);
    const thinking = $('ai-thinking');
    if (thinking) thinking.remove();
    
    const errorMsg = {
      role: 'ai',
      content: '⚠️ Error: ' + (e.message || 'An unexpected error occurred'),
      timestamp: Date.now()
    };
    aiChatHistory.push(errorMsg);
    saveAIChat();
    renderAIChat();
  }
}

function clearAIChat() {
  if (confirm('Are you sure you want to clear the AI chat history?')) {
    aiChatHistory = [];
    saveAIChat();
    renderAIChat();
    toast('AI chat cleared');
  }
}

function openAiSettings() {
  const aiSettings = $('aiSettings');
  if (!aiSettings) return;
  
  // Load saved settings from localStorage
  const savedSettings = JSON.parse(localStorage.getItem('ciscord_ai_settings') || '{}');
  
  // Populate fields
  if ($('aiProvider')) $('aiProvider').value = savedSettings.provider || 'groq';
  if ($('aiApiKey')) $('aiApiKey').value = savedSettings.apiKey || '';
  if ($('aiApiUrl')) $('aiApiUrl').value = savedSettings.apiUrl || getDefaultApiUrl(savedSettings.provider || 'groq');
  if ($('aiModel')) $('aiModel').value = savedSettings.model || getDefaultModel(savedSettings.provider || 'groq');
  if ($('aiUseCorsProxy')) $('aiUseCorsProxy').checked = savedSettings.useCorsProxy || false;
  if ($('aiCorsProxyUrl')) $('aiCorsProxyUrl').value = savedSettings.corsProxyUrl || 'https://api.allorigins.win/raw?url=';
  
  aiSettings.classList.remove('hidden');
}

function closeAiSettings() {
  const aiSettings = $('aiSettings');
  if (aiSettings) aiSettings.classList.add('hidden');
}

function getDefaultApiUrl(provider) {
  const urls = {
    'groq': 'https://api.groq.com/openai/v1/chat/completions',
    'openrouter': 'https://openrouter.ai/api/v1/chat/completions',
    'together': 'https://api.together.xyz/v1/chat/completions',
    'mistral': 'https://api.mistral.ai/v1/chat/completions',
    'cohere': 'https://api.cohere.ai/v1/chat',
    'huggingface': 'https://api-inference.huggingface.co/models',
    'custom': ''
  };
  return urls[provider] || '';
}

function getDefaultModel(provider) {
  const models = {
    'groq': 'llama-3.1-70b-versatile',
    'openrouter': 'openai/gpt-3.5-turbo',
    'together': 'meta-llama/Llama-3-70b-chat-hf',
    'mistral': 'mistral-large-latest',
    'cohere': 'command-r-plus',
    'huggingface': 'meta-llama/Llama-2-70b-chat-hf',
    'custom': ''
  };
  return models[provider] || '';
}

function initAiSettingsMenu() {
  const aiSettings = $('aiSettings');
  if (!aiSettings) return;
  
  // Close on backdrop click
  aiSettings.addEventListener('click', e => {
    if (e.target.id === 'aiSettings') closeAiSettings();
  });
  
  // Cancel button
  const btnCancel = $('btnAiCancel');
  if (btnCancel) {
    btnCancel.addEventListener('click', closeAiSettings);
  }
  
  // Save button
  const btnSave = $('btnAiSave');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const settings = {
        provider: $('aiProvider')?.value || 'groq',
        apiKey: $('aiApiKey')?.value || '',
        apiUrl: $('aiApiUrl')?.value || '',
        model: $('aiModel')?.value || '',
        useCorsProxy: $('aiUseCorsProxy')?.checked || false,
        corsProxyUrl: $('aiCorsProxyUrl')?.value || 'https://api.allorigins.win/raw?url='
      };
      
      // Validate
      if (!settings.apiKey) {
        toast('Please enter your API key');
        return;
      }
      
      // Save to localStorage (web version - no Electron IPC)
      localStorage.setItem('ciscord_ai_settings', JSON.stringify(settings));
      
      console.log('[AI] Settings saved:', { 
        provider: settings.provider, 
        model: settings.model, 
        useCorsProxy: settings.useCorsProxy,
        apiKey: settings.apiKey.substring(0, 5) + '...' 
      });
      toast('AI settings saved ✓');
      closeAiSettings();
    });
  }
  
  // Auto-fill URL and model when provider changes
  const providerSelect = $('aiProvider');
  if (providerSelect) {
    providerSelect.addEventListener('change', (e) => {
      const provider = e.target.value;
      if ($('aiApiUrl')) $('aiApiUrl').value = getDefaultApiUrl(provider);
      if ($('aiModel')) $('aiModel').value = getDefaultModel(provider);
    });
  }
  
  const btnUpload = $('btnUploadAvatar');
  if (btnUpload) {
    btnUpload.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast('Image too large (max 2MB)'); return; }
        try {
          const dataUrl = await readFileAsDataUrl(file);
          await cis.updateProfile({ avatar: dataUrl });
          me.avatar = dataUrl;
          renderMe();
          toast('Avatar updated');
        } catch (e) { toast('Could not upload avatar'); }
      };
      input.click();
    });
  }
}

// Event listeners are now set up in setupEventListeners() called after DOM is ready
