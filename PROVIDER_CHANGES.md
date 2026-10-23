# AI Provider Changes - Removed CORS-Blocked Providers

## Summary

We've removed support for Alibaba, OpenAI, Anthropic, and DeepSeek from the web version of Ciscord due to CORS (Cross-Origin Resource Sharing) restrictions. These providers block direct browser requests, making them incompatible with web applications.

## What Changed

### Removed Providers
- ❌ **Alibaba Cloud (Qwen)** - CORS blocked
- ❌ **OpenAI (GPT)** - CORS blocked  
- ❌ **Anthropic (Claude)** - CORS blocked
- ❌ **DeepSeek** - CORS blocked

### Supported Providers
- ✅ **Groq** (Recommended) - Free, fast, no CORS issues
- ✅ **OpenRouter** - 100+ models, pay-per-use
- ✅ **Together AI** - Open-source models
- ✅ **Mistral AI** - European provider
- ✅ **Cohere** - Enterprise features
- ✅ **Hugging Face** - Huge model library
- ✅ **Custom API** - For CORS-friendly providers

## Why These Providers Were Removed

### The CORS Problem

CORS (Cross-Origin Resource Sharing) is a browser security feature that prevents web pages from making requests to a different domain than the one that served the web page. AI providers like OpenAI, Anthropic, Alibaba, and DeepSeek block browser requests for several reasons:

1. **Security**: API keys exposed in browser code can be stolen
2. **Abuse Prevention**: Harder to track and rate-limit browser requests
3. **Cost Control**: Browser requests are harder to monetize properly
4. **Architecture**: These APIs are designed for server-to-server communication

### Why CORS Proxies Don't Work

We tried using CORS proxies (like allorigins.win) to bypass these restrictions, but:
- Free proxies block AI API endpoints
- They don't forward POST requests properly
- Authentication headers get stripped
- Rate limits are too strict
- Unreliable for production use

## What You Need to Do

### For Current Users

If you were using Alibaba, OpenAI, Anthropic, or DeepSeek:

1. **Switch to Groq** (Recommended)
   - Sign up: https://console.groq.com/
   - Get free API key
   - Fast, reliable, no CORS issues
   - Model: `llama-3.1-70b-versatile`

2. **Or switch to OpenRouter**
   - Sign up: https://openrouter.ai/
   - Access 100+ models
   - One API key for all
   - Pay-per-use pricing

### Configuration Steps

1. Open Ciscord
2. Click your profile icon (⚙️) → AI Settings
3. Select a supported provider (Groq recommended)
4. Enter your API key
5. Click Save
6. Test in AI Mode

## Code Changes

### Files Modified

1. **index.html**
   - Removed blocked providers from dropdown
   - Added warning message about CORS restrictions
   - Set Groq as default provider

2. **renderer.js**
   - Removed blocked providers from `getDefaultApiUrl()`
   - Removed blocked providers from `getDefaultModel()`
   - Changed default provider from 'alibaba' to 'groq'
   - Removed CORS proxy logic (no longer needed)
   - Simplified error handling

### Default Provider

Changed from `alibaba` to `groq`:
```javascript
// Before
provider: $('aiProvider')?.value || 'alibaba'

// After
provider: $('aiProvider')?.value || 'groq'
```

## Benefits of This Change

1. **No More 403 Errors**: Users won't encounter CORS-related errors
2. **Simpler Code**: Removed complex CORS proxy logic
3. **Better UX**: Clear warning message instead of confusing errors
4. **Faster Setup**: Groq is free and takes 2 minutes to configure
5. **More Reliable**: Supported providers work consistently in browsers

## Migration Guide

### From Alibaba to Groq

**Before (Alibaba):**
```
Provider: Alibaba Cloud (Qwen)
API Key: sk-...
API URL: https://dashscope.aliyuncs.com/api/v1/...
Model: qwen-plus
```

**After (Groq):**
```
Provider: Groq (Fast & Free)
API Key: gsk_...
API URL: https://api.groq.com/openai/v1/chat/completions
Model: llama-3.1-70b-versatile
```

### From OpenAI to OpenRouter

**Before (OpenAI):**
```
Provider: OpenAI (GPT)
API Key: sk-...
API URL: https://api.openai.com/v1/chat/completions
Model: gpt-4
```

**After (OpenRouter):**
```
Provider: OpenRouter (100+ models)
API Key: sk-or-...
API URL: https://openrouter.ai/api/v1/chat/completions
Model: openai/gpt-4
```

## FAQ

### Q: Can I still use OpenAI/Anthropic/Alibaba/DeepSeek?

**A:** Not in the web version. These providers block browser requests. You would need to:
- Use the desktop (Electron) version
- Set up your own backend proxy server
- Switch to a CORS-friendly provider

### Q: Why not just use a CORS proxy?

**A:** Free CORS proxies don't work reliably for AI APIs because:
- They block AI API endpoints
- They strip authentication headers
- They have strict rate limits
- They're unreliable for production use

### Q: Is Groq really free?

**A:** Yes! Groq offers a generous free tier with:
- 14,400 requests per day
- 720,000 tokens per day
- No credit card required
- Fast inference speeds

### Q: What if I need GPT-4 or Claude?

**A:** Use OpenRouter, which provides access to:
- OpenAI GPT-4, GPT-3.5
- Anthropic Claude 3, Claude 2
- Google Gemini
- Meta Llama
- And 100+ other models

All through one API key with pay-per-use pricing.

### Q: Will this affect my existing chats?

**A:** No. Your chat history is stored locally and remains intact. You just need to configure a new provider to continue using AI features.

## Testing

After making these changes, test the following:

1. ✅ Open AI Settings
2. ✅ Verify blocked providers are not in dropdown
3. ✅ Verify warning message is displayed
4. ✅ Select Groq as provider
5. ✅ Enter API key
6. ✅ Save settings
7. ✅ Open AI Mode
8. ✅ Send a test message
9. ✅ Verify response is received

## Support

If you encounter any issues:

1. Check that you're using a supported provider
2. Verify your API key is correct
3. Check your internet connection
4. Review browser console for error messages
5. Refer to AI_PROVIDERS_GUIDE.md for detailed setup instructions

## Conclusion

By removing CORS-blocked providers, we've made Ciscord more reliable and easier to use. Groq and OpenRouter provide excellent alternatives that work seamlessly in web browsers without any CORS issues.

**Recommended Action:** Switch to Groq (free) or OpenRouter (paid) for the best experience.

---

**Last Updated:** 2026-10-23  
**Status:** ✅ Complete - All CORS-blocked providers removed
