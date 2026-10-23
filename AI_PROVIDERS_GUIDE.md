# AI Providers That Support Web/CORS

## ✅ CORS-Supported Providers (Work in Browser)

These AI providers **support direct browser requests** and work in the web version of Ciscord:

### 🌟 OpenRouter (Recommended)
- **Website**: https://openrouter.ai/
- **CORS Support**: ✅ Yes
- **Models**: 100+ models (GPT-4, Claude, Llama, Mistral, etc.)
- **Pricing**: Pay-per-use, many free models available
- **Why Choose**: One API key for all models, easy setup

**Setup**:
1. Sign up at https://openrouter.ai/
2. Go to Keys → Create Key
3. In Ciscord:
   - Provider: `OpenRouter (100+ models) ⭐ Web Compatible`
   - API Key: Your OpenRouter key
   - Model: `openai/gpt-3.5-turbo` (or any model)

**Example Models**:
```
openai/gpt-4
openai/gpt-3.5-turbo
anthropic/claude-3-opus
anthropic/claude-3-sonnet
meta-llama/llama-3-70b
mistralai/mistral-large
google/gemini-pro
```

---

### 🚀 Groq (Fastest & Free Tier)
- **Website**: https://groq.com/
- **CORS Support**: ✅ Yes
- **Models**: Llama 3, Mixtral, Gemma
- **Pricing**: Free tier available, very fast inference
- **Why Choose**: Blazing fast, generous free tier

**Setup**:
1. Sign up at https://console.groq.com/
2. Go to API Keys → Create API Key
3. In Ciscord:
   - Provider: `Groq (Fast & Free) ⭐ Web Compatible`
   - API Key: Your Groq key
   - Model: `llama-3.1-70b-versatile`

**Example Models**:
```
llama-3.1-70b-versatile
llama-3.1-8b-instant
mixtral-8x7b-32768
gemma2-9b-it
```

---

### 🔧 Together AI
- **Website**: https://together.ai/
- **CORS Support**: ✅ Yes
- **Models**: Open-source models (Llama, Mistral, etc.)
- **Pricing**: Free tier, pay-per-use
- **Why Choose**: Good free tier, open-source focus

**Setup**:
1. Sign up at https://api.together.ai/
2. Get API key from dashboard
3. In Ciscord:
   - Provider: `Together AI ⭐ Web Compatible`
   - API Key: Your Together AI key
   - Model: `meta-llama/Llama-3-70b-chat-hf`

---

### 🌊 Mistral AI
- **Website**: https://mistral.ai/
- **CORS Support**: ✅ Yes
- **Models**: Mistral Large, Mistral Small, Codestral
- **Pricing**: Pay-per-use
- **Why Choose**: European provider, good performance

**Setup**:
1. Sign up at https://console.mistral.ai/
2. Get API key
3. In Ciscord:
   - Provider: `Mistral AI ⭐ Web Compatible`
   - API Key: Your Mistral key
   - Model: `mistral-large-latest`

---

### 🎯 Cohere
- **Website**: https://cohere.com/
- **CORS Support**: ✅ Yes
- **Models**: Command R+, Command, Command Light
- **Pricing**: Free trial, pay-per-use
- **Why Choose**: Enterprise-focused, good for RAG

**Setup**:
1. Sign up at https://dashboard.cohere.com/
2. Get API key
3. In Ciscord:
   - Provider: `Cohere ⭐ Web Compatible`
   - API Key: Your Cohere key
   - Model: `command-r-plus`

---

### 🤗 Hugging Face
- **Website**: https://huggingface.co/
- **CORS Support**: ✅ Yes
- **Models**: Any model on Hugging Face
- **Pricing**: Free tier, pay-per-use
- **Why Choose**: Huge model library, open-source

**Setup**:
1. Sign up at https://huggingface.co/
2. Get API token from Settings → Access Tokens
3. In Ciscord:
   - Provider: `Hugging Face ⭐ Web Compatible`
   - API Key: Your Hugging Face token
   - Model: `meta-llama/Llama-2-70b-chat-hf`

---

## ❌ CORS-Blocked Providers (Don't Work in Browser)

These providers **block direct browser requests** and require a backend proxy:

| Provider | CORS Support | Alternative |
|----------|--------------|-------------|
| OpenAI | ❌ No | Use OpenRouter instead |
| Anthropic | ❌ No | Use OpenRouter instead |
| Google (Gemini) | ❌ No | Use OpenRouter instead |
| Alibaba (Qwen) | ❌ No | Use OpenRouter instead |
| DeepSeek | ❌ No | Use Groq instead |

**Why They Block CORS**:
- Security: API keys exposed in browser code
- Abuse prevention: Harder to track/rate-limit
- Designed for server-to-server communication

---

## 🏆 Quick Start Guide

### Option 1: OpenRouter (Easiest)
1. Sign up: https://openrouter.ai/
2. Create API key
3. In Ciscord:
   - Provider: `OpenRouter (100+ models) ⭐ Web Compatible`
   - API Key: Your key
   - Model: `openai/gpt-3.5-turbo`
4. Test: Type `/ai Hello!` in chat

### Option 2: Groq (Fastest & Free)
1. Sign up: https://console.groq.com/
2. Create API key
3. In Ciscord:
   - Provider: `Groq (Fast & Free) ⭐ Web Compatible`
   - API Key: Your key
   - Model: `llama-3.1-70b-versatile`
4. Test: Type `/ai Hello!` in chat

---

## 💡 Tips

### Free Tier Comparison
| Provider | Free Tier | Best For |
|----------|-----------|----------|
| Groq | ✅ Generous | Fast inference, testing |
| Together AI | ✅ Good | Open-source models |
| Hugging Face | ✅ Limited | Experimenting |
| OpenRouter | ✅ Some models | Trying different models |

### Cost Comparison (per 1M tokens)
| Provider | Input | Output | Notes |
|----------|-------|--------|-------|
| Groq | $0.20 | $0.20 | Cheapest |
| Together AI | $0.20 | $0.20 | Very cheap |
| OpenRouter | Varies | Varies | Depends on model |
| Mistral | $2.00 | $6.00 | Mid-range |
| Cohere | $3.00 | $15.00 | Premium |

### Model Recommendations
- **Fast & Cheap**: Groq (Llama 3.1 70B)
- **Best Quality**: OpenRouter (GPT-4 or Claude 3)
- **Open Source**: Together AI (Llama 3)
- **Coding**: OpenRouter (Codestral or CodeLlama)

---

## 🔧 Custom API Setup

If your provider isn't listed, use "Custom API":

1. Provider: `Custom API`
2. API URL: Your provider's endpoint
3. Model: Model name
4. API Key: Your key

**Example for a CORS-friendly provider**:
```
API URL: https://api.yourprovider.com/v1/chat/completions
Model: your-model-name
API Key: your-api-key
```

---

## 🐛 Troubleshooting

### "CORS error" Message
- **Cause**: Provider doesn't support browser requests
- **Solution**: Switch to a CORS-supported provider (see list above)

### "Invalid API key" Error
- **Cause**: Wrong API key or provider
- **Solution**: Double-check your API key matches the provider

### "Model not found" Error
- **Cause**: Wrong model name
- **Solution**: Check provider's documentation for valid model names

### No Response / Timeout
- **Cause**: API rate limit or network issue
- **Solution**: Wait a moment and try again, or check API status

---

## 📊 Summary

**Best Choices for Web**:
1. 🥇 **OpenRouter** - Most flexible, 100+ models
2. 🥈 **Groq** - Fastest, free tier
3. 🥉 **Together AI** - Good free tier, open-source

**Avoid for Web**:
- OpenAI, Anthropic, Google, Alibaba, DeepSeek (CORS blocked)

**Quick Start**:
1. Sign up for Groq (free) or OpenRouter
2. Get API key
3. Configure in Ciscord AI Settings
4. Test with `/ai Hello!`

---

## 🔗 Useful Links

- OpenRouter: https://openrouter.ai/
- Groq: https://groq.com/
- Together AI: https://together.ai/
- Mistral: https://mistral.ai/
- Cohere: https://cohere.com/
- Hugging Face: https://huggingface.co/

---

**Last Updated**: 2026-10-22

**Note**: CORS support can change. Always check the provider's documentation for the latest information.
