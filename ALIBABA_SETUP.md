# How to Use Alibaba (Qwen) in Ciscord Web

## ✅ CORS Proxy Support Added!

Alibaba's API now works in the web version using a CORS proxy!

---

## 🚀 Quick Setup (2 Minutes)

### Step 1: Get Alibaba API Key
1. Go to https://dashscope.console.aliyun.com/
2. Sign up / Log in
3. Go to **API Keys** section
4. Create a new API key
5. Copy your API key (starts with `sk-...`)

### Step 2: Configure in Ciscord
1. Open Ciscord web app
2. Click ⚙️ (Settings) → **AI Settings**
3. Configure these settings:

```
Provider: Alibaba Cloud (Qwen) ❌ CORS blocked
API Key: sk-your-alibaba-key-here
API URL: https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
Model: qwen-plus (or qwen-turbo, qwen-max)

✅ Use CORS Proxy: [CHECK THIS BOX]
CORS Proxy URL: https://corsproxy.io/?
```

4. Click **Save**

### Step 3: Test It!
1. Open any chat
2. Type: `/ai Hello!`
3. Press Enter
4. ✅ Alibaba Qwen should respond!

---

## 📋 Configuration Details

### Required Settings for Alibaba:

| Setting | Value |
|---------|-------|
| **Provider** | `Alibaba Cloud (Qwen) ❌ CORS blocked` |
| **API Key** | Your Alibaba API key |
| **API URL** | `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation` |
| **Model** | `qwen-plus` (recommended) |
| **Use CORS Proxy** | ✅ **MUST BE CHECKED** |
| **CORS Proxy URL** | `https://corsproxy.io/?` |

### Available Alibaba Models:
- `qwen-plus` - Balanced performance (recommended)
- `qwen-turbo` - Fast and cheap
- `qwen-max` - Most capable, most expensive
- `qwen-long` - Long context support

---

## 🔧 How CORS Proxy Works

### The Problem:
Alibaba's API blocks direct browser requests (CORS policy). When you try to call the API from a web browser, you get:
```
Access to fetch at 'https://dashscope.aliyuncs.com/...' has been blocked by CORS policy
```

### The Solution:
A CORS proxy acts as a middleman:
```
Browser → CORS Proxy → Alibaba API
        ←             ←
```

1. Your browser sends request to `https://corsproxy.io/?`
2. CORS proxy forwards it to Alibaba
3. Alibaba responds to CORS proxy
4. CORS proxy forwards response back to your browser

### Is It Safe?
- ✅ Your API key is sent through the proxy
- ⚠️ Use a trusted proxy like `corsproxy.io`
- ⚠️ For production, set up your own proxy server
- ✅ The proxy only sees your API requests, not your other data

---

## 🌐 Alternative CORS Proxies

If `corsproxy.io` doesn't work, try these:

| Proxy | URL | Notes |
|-------|-----|-------|
| **corsproxy.io** | `https://corsproxy.io/?` | ✅ Recommended, free |
| **allorigins.win** | `https://api.allorigins.win/raw?url=` | Free, may be slow |
| **cors-anywhere** | Self-hosted | Best for production |
| **Your own proxy** | Custom URL | Most secure |

### How to Change Proxy:
1. Go to AI Settings
2. Change **CORS Proxy URL** field
3. Save settings
4. Test with `/ai` command

---

## 🧪 Testing Your Setup

### Test 1: Check Settings
1. Open AI Settings
2. Verify:
   - ✅ Provider: Alibaba Cloud (Qwen)
   - ✅ API Key: Filled in
   - ✅ Use CORS Proxy: Checked
   - ✅ CORS Proxy URL: `https://corsproxy.io/?`

### Test 2: Test AI Command
1. Open any chat
2. Type: `/ai What is 2+2?`
3. Press Enter
4. Should see: "🤔 Thinking..." then AI response

### Test 3: Check Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Send AI command
4. Should see: `[AI] Using CORS proxy: https://corsproxy.io/?`

---

## 🐛 Troubleshooting

### Error: "CORS error: This AI API blocks browser requests"
**Problem**: CORS proxy is not enabled

**Solution**:
1. Open AI Settings
2. Check ✅ **Use CORS Proxy**
3. Save settings
4. Try again

### Error: "Network error: Could not connect to AI API"
**Problem**: CORS proxy is down or blocked

**Solution**:
1. Try a different CORS proxy URL
2. Check your internet connection
3. Try again in a few minutes

### Error: "Invalid API key"
**Problem**: Wrong API key or provider

**Solution**:
1. Double-check your Alibaba API key
2. Make sure you selected "Alibaba Cloud (Qwen)" as provider
3. Regenerate API key if needed

### No Response / Timeout
**Problem**: CORS proxy is slow or API is rate-limited

**Solution**:
1. Wait a moment and try again
2. Try a different CORS proxy
3. Check Alibaba API quota

---

## 💡 Tips

### Best Practices:
- ✅ Always enable CORS proxy for Alibaba/OpenAI/Anthropic/DeepSeek
- ✅ Use `corsproxy.io` for testing
- ⚠️ For production, set up your own proxy server
- ✅ Keep your API key secret
- ✅ Monitor your API usage

### Performance:
- CORS proxy adds ~100-500ms latency
- For faster response, use CORS-friendly providers (OpenRouter, Groq)
- Alibaba is still fast even with proxy

### Cost:
- CORS proxy is free (corsproxy.io)
- You still pay Alibaba for API usage
- Check your Alibaba dashboard for usage

---

## 🔒 Security Considerations

### Is CORS Proxy Safe?
- ✅ `corsproxy.io` is a public, trusted service
- ⚠️ Your API key passes through the proxy
- ⚠️ Don't use with sensitive/production API keys
- ✅ For production, use your own proxy server

### For Production Use:
Set up your own CORS proxy server:
```javascript
// Example Node.js proxy
app.use('/ai-proxy', (req, res) => {
  const targetUrl = req.query.url;
  fetch(targetUrl, {
    method: 'POST',
    headers: req.headers,
    body: req.body
  }).then(response => response.pipe(res));
});
```

Then use: `https://your-server.com/ai-proxy?url=`

---

## 📊 Comparison: With vs Without CORS Proxy

| Feature | Without Proxy | With Proxy |
|---------|---------------|------------|
| **Alibaba Works?** | ❌ No | ✅ Yes |
| **Speed** | N/A | ~100-500ms slower |
| **Security** | N/A | ⚠️ API key exposed to proxy |
| **Cost** | N/A | Free (public proxy) |
| **Reliability** | N/A | Depends on proxy service |

---

## 🎯 Summary

### To Use Alibaba:
1. ✅ Get Alibaba API key
2. ✅ Select "Alibaba Cloud (Qwen)" in AI Settings
3. ✅ Enter API key
4. ✅ **Check "Use CORS Proxy"**
5. ✅ Set CORS Proxy URL to `https://corsproxy.io/?`
6. ✅ Save settings
7. ✅ Test with `/ai` command

### Result:
✅ Alibaba Qwen now works in your web app! 🎉

---

## 🔗 Useful Links

- **Alibaba DashScope**: https://dashscope.console.aliyun.com/
- **Alibaba API Docs**: https://help.aliyun.com/zh/dashscope/
- **corsproxy.io**: https://corsproxy.io/
- **CORS Explanation**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

**Status**: ✅ **COMPLETE** - Alibaba now works with CORS proxy!

**Last Updated**: 2026-10-22
