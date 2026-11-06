# 🤖 AI Mode - Complete Guide

## What is AI Mode?

AI Mode is a **dedicated private chat interface** for conversing with AI assistants. Unlike the `/ai` command in regular chats, AI Mode provides:

✅ **Persistent conversation history** - Your chats are saved locally  
✅ **Full conversation context** - AI remembers previous messages  
✅ **Clean chat interface** - Dedicated UI just for AI conversations  
✅ **Private & secure** - Only you can see your AI conversations  
✅ **Easy navigation** - Switch between AI Mode and regular chats instantly  

---

## 🚀 How to Use AI Mode

### Step 1: Access AI Mode
1. Look at the left sidebar (rail)
2. Click the **🤖 AI Mode** button (bottom of the rail)
3. The AI Mode view will open

### Step 2: Configure AI Provider (First Time Only)
1. In AI Mode, click **⚙️ Configure AI** button
2. Or click your profile icon (⚙️) → **AI Settings**
3. Select a provider:
   - 🥇 **Groq** (Recommended) - Free & fast
   - 🥈 **OpenRouter** - 100+ models
   - Or any other CORS-friendly provider
4. Enter your API key
5. Click **Save**

### Step 3: Start Chatting!
1. Type your message in the input box at the bottom
2. Press **Enter** or click **Send**
3. Wait for the AI to respond
4. Continue the conversation - AI remembers context!

---

## 📋 Features

### 💬 Conversation History
- All messages are saved in your browser's localStorage
- History persists across sessions
- AI has full context of your conversation
- Click **🗑️ Clear Chat** to start fresh

### 🎨 Beautiful UI
- Clean, modern chat interface
- User messages on the right (blue)
- AI messages on the left (gray)
- Timestamps for each message
- Smooth animations and transitions

### 🔄 Easy Navigation
- Click **💬** to go back to Groups
- Click **👥** to go to Friends
- Click **🤖** to return to AI Mode
- Your place is remembered

### ⚙️ Quick Settings
- **⚙️ Configure AI** - Open AI settings directly from AI Mode
- **🗑️ Clear Chat** - Clear conversation history
- **Provider Info** - See which AI provider is active

---

## 🎯 AI Mode vs /ai Command

| Feature | AI Mode | /ai Command |
|---------|---------|-------------|
| **Conversation History** | ✅ Full history | ❌ Single message |
| **Context Awareness** | ✅ AI remembers | ❌ No context |
| **Privacy** | ✅ Private chat | ❌ Visible to others |
| **UI** | ✅ Dedicated interface | ❌ Inline in chat |
| **Persistence** | ✅ Saved locally | ❌ Not saved |
| **Use Case** | Long conversations | Quick questions |

### When to Use AI Mode:
- ✅ Long conversations with AI
- ✅ Complex problems needing context
- ✅ Private questions you don't want others to see
- ✅ Iterative problem solving
- ✅ Learning and exploration

### When to Use /ai Command:
- ✅ Quick one-off questions
- ✅ Shared conversations where everyone should see
- ✅ Simple translations or definitions
- ✅ When you want the group to see the AI response

---

## 🔧 Configuration

### Recommended Providers

#### 🥇 Groq (Best Choice)
- **Cost**: Free tier available
- **Speed**: Blazing fast (LPU hardware)
- **Models**: Llama 3.1 70B, Mixtral, Gemma
- **Setup**: 2 minutes
- **Sign up**: https://console.groq.com/

#### 🥈 OpenRouter
- **Cost**: Pay-per-use (cheap)
- **Speed**: Fast
- **Models**: 100+ (GPT-4, Claude, Llama, etc.)
- **Setup**: 2 minutes
- **Sign up**: https://openrouter.ai/

### Configuration Steps
1. Click **🤖 AI Mode** button
2. Click **⚙️ Configure AI**
3. Select provider (Groq recommended)
4. Enter API key
5. Select model (or use default)
6. Click **Save**
7. Start chatting!

---

## 💾 Data Storage

### Where is Chat History Stored?
- **Location**: Browser's localStorage
- **Key**: `ciscord_ai_chat_history`
- **Format**: JSON array of messages
- **Privacy**: Only accessible from your browser
- **Sync**: Not synced across devices (local only)

### Message Format
```json
{
  "role": "user" | "ai",
  "content": "message text",
  "timestamp": 1234567890
}
```

### Clearing History
1. In AI Mode, click **🗑️ Clear Chat**
2. Confirm the action
3. History is permanently deleted
4. Fresh start!

---

## 🎨 UI Elements

### Sidebar
- **AI Avatar** - Large 🤖 icon with gradient background
- **AI Assistant** - Title
- **Private chat with AI** - Subtitle
- **Provider Info** - Shows current AI provider
- **⚙️ Configure AI** - Open settings
- **🗑️ Clear Chat** - Clear history

### Chat Area
- **Welcome Screen** - Shown when no messages
- **User Messages** - Right-aligned, blue background
- **AI Messages** - Left-aligned, gray background
- **Timestamps** - Below each message
- **Thinking Indicator** - Animated dots while AI responds

### Navigation
- **🤖 Button** - Active when in AI Mode
- **💬 Button** - Go to Groups
- **👥 Button** - Go to Friends

---

## 🐛 Troubleshooting

### "Please configure your AI provider first"
**Problem**: No API key configured

**Solution**:
1. Click **⚙️ Configure AI**
2. Select a provider
3. Enter your API key
4. Click **Save**

### AI Not Responding
**Problem**: No response or error message

**Solutions**:
1. Check your API key is correct
2. Verify you have credits/quota with the provider
3. Check your internet connection
4. Try a different AI provider
5. Check browser console (F12) for errors

### Chat History Lost
**Problem**: Messages disappeared

**Possible Causes**:
- Cleared browser data/cache
- Used incognito/private mode
- Switched browsers
- localStorage was cleared

**Solution**: Unfortunately, localStorage data cannot be recovered. Start a new conversation.

### Slow Responses
**Problem**: AI takes too long to respond

**Solutions**:
1. Switch to Groq (fastest provider)
2. Use a smaller/faster model
3. Check your internet connection
4. Clear chat history (longer history = slower)

---

## 🔒 Privacy & Security

### Is AI Mode Private?
✅ **Yes!** AI Mode conversations are:
- Stored only in your browser
- Not visible to other users
- Not synced to Firebase
- Not shared with anyone

### What About the AI Provider?
⚠️ **Note**: Your messages are sent to the AI provider's API:
- Groq, OpenRouter, etc. receive your messages
- They process them and send responses
- Check the provider's privacy policy
- Don't share sensitive information

### Best Practices
- ✅ Don't share passwords or secrets
- ✅ Don't share personal information
- ✅ Use for general questions and learning
- ✅ Review provider's privacy policy
- ✅ Clear chat regularly if concerned

---

## 💡 Tips & Tricks

### Get Better Responses
1. **Be specific** - Clear questions get better answers
2. **Provide context** - AI remembers previous messages
3. **Ask follow-ups** - Build on previous responses
4. **Use examples** - Help AI understand what you want

### Manage Conversation Length
- Long conversations may slow down responses
- Clear chat periodically for fresh start
- Start new conversation for different topics

### Keyboard Shortcuts
- **Enter** - Send message
- **Shift+Enter** - New line (if supported)
- **Escape** - Close modals

### Multiple Conversations
- Currently supports one conversation
- Clear chat to start new topic
- Future: Multiple conversation threads

---

## 🎓 Use Cases

### Learning & Education
- Ask questions about any topic
- Get explanations with examples
- Practice languages
- Study help

### Programming
- Code reviews
- Debugging help
- Algorithm explanations
- Code generation

### Writing & Content
- Brainstorming ideas
- Editing and proofreading
- Content generation
- Translation

### Problem Solving
- Break down complex problems
- Get different perspectives
- Step-by-step solutions
- Decision making help

### Creative Projects
- Story ideas
- Character development
- World building
- Creative writing

---

## 📊 Technical Details

### Architecture
```
AI Mode UI (HTML/CSS)
    ↓
JavaScript (renderer.js)
    ↓
sendToAI() function
    ↓
AI Provider API (Groq/OpenRouter/etc.)
    ↓
Response → Display in chat
```

### Key Functions
- `showAIMode()` - Display AI Mode view
- `sendAIMessage()` - Send message to AI
- `renderAIChat()` - Render chat history
- `saveAIChat()` - Save to localStorage
- `loadAIChat()` - Load from localStorage
- `clearAIChat()` - Clear conversation

### Dependencies
- Firebase (for user authentication)
- AI Provider API (Groq/OpenRouter/etc.)
- Browser localStorage
- PeerJS (not used in AI Mode)

---

## 🔄 Future Enhancements

Potential future features:
- Multiple conversation threads
- Export chat history
- Search in conversations
- File/image support
- Voice messages
- Code syntax highlighting
- Markdown rendering
- Conversation sharing
- Custom AI personalities
- System prompts

---

## 📝 Summary

AI Mode provides a **dedicated, private, and persistent** interface for AI conversations. It's perfect for:

✅ Long, contextual conversations  
✅ Private questions and learning  
✅ Iterative problem solving  
✅ Better AI responses with context  

**Get Started**:
1. Click **🤖 AI Mode** button
2. Configure your AI provider
3. Start chatting!

---

## 🔗 Related Documentation

- [AI_PROVIDERS_GUIDE.md](AI_PROVIDERS_GUIDE.md) - Complete guide to AI providers
- [WEB_AI_FIX.md](WEB_AI_FIX.md) - Web AI integration details
- [CORS_PROXY_ISSUES.md](CORS_PROXY_ISSUES.md) - Why CORS proxies don't work

---

**Status**: ✅ **COMPLETE** - AI Mode is fully functional!

**Last Updated**: 2026-10-23
