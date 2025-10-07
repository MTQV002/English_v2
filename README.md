# English Dictionary Pro v2.0.0

**An AI-powered English dictionary plugin for Obsidian with smart Anki export, chatbot tutor, and Cambridge audio.**

[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-7c3aed)](https://obsidian.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Features

### Core Features
- **🤖 AI-Powered Definitions**: Uses Groq's `openai/gpt-oss-120b` model for comprehensive word analysis
- **🔊 Cambridge Audio**: High-quality pronunciation with US/UK/AUS accents + Google TTS fallback
- **📝 Smart Workflow**: Lookup → Save to Note (auto-open) → Chat with AI → Edit → Export to Anki
- **🎯 Intelligent Deck Routing**: AI suggests TOEIC vs GENERAL category with 20 sub-decks
- **⚠️ Duplicate Detection**: Check for existing cards with overwrite option
- **💬 English Tutor Chatbot**: Context-aware AI assistant for learning
- **📚 WordFamily Field**: Related words and derivatives (replaces idioms)
- **📌 PersonalNote Field**: Add your own context and memory tricks
- **🔤 Simple Lemmatization**: Auto-remove -ing, -ed, -s, -es suffixes

### Word Analysis Includes
- Part of Speech
- IPA Pronunciation
- Definition (English)
- Vietnamese Translation
- Example Sentences
- Synonyms & Antonyms
- Collocations
- Word Family (derivatives)
- Phrasal Verbs
- Usage Notes & Nuances
- Personal Notes (user-editable)

### Deck Structure
**TOEIC Category** (8 decks):
- Business_Vocabulary
- Office_Communication
- Finance_Banking
- Travel_Transportation
- Marketing_Sales
- Human_Resources
- Technology
- General_TOEIC

**GENERAL Category** (12 decks):
- Daily_Conversation
- Academic_Writing
- Idioms_Phrases
- Verbs_Actions
- Adjectives_Descriptions
- Advanced_Vocabulary
- Slang_Informal
- Medical_Health
- Food_Cooking
- Sports_Hobbies
- Technology_Internet
- Entertainment

---

## 📦 Installation

### Prerequisites
1. **Obsidian** (v0.15.0+)
2. **Anki** with **AnkiConnect** addon
3. **Groq API Key** (free from https://console.groq.com/keys)
4. **Vercel Account** (free tier works)

### Step 1: Deploy Backend to Vercel

```bash
# Clone or navigate to English_v2 folder
cd /path/to/English_v2

# Install Vercel CLI (if not installed)
npm install -g vercel

# Deploy to Vercel
vercel deploy --prod
```

Copy your deployment URL (e.g., `https://your-app.vercel.app`)

### Step 2: Install Plugin in Obsidian

**Method 1: Manual Installation** (Recommended)
1. Copy the `English_v2` folder to your vault's `.obsidian/plugins/` directory
2. Rename folder to `english-dictionary-pro`
3. Restart Obsidian
4. Go to Settings → Community Plugins → Enable "English Dictionary Pro"

**Method 2: From Release** (Coming Soon)
1. Download latest release from GitHub
2. Extract to `.obsidian/plugins/english-dictionary-pro/`
3. Restart Obsidian

### Step 3: Configure Plugin

1. Open Obsidian Settings → English Dictionary Pro
2. Fill in required settings:

| Setting | Value | Example |
|---------|-------|---------|
| Groq API Key | Your API key | `gsk_...` |
| Groq Model | Model name | `openai/gpt-oss-120b` |
| Vercel Backend URL | Deployment URL | `https://your-app.vercel.app` |
| AnkiConnect URL | Local server | `http://127.0.0.1:8765` |
| Default Anki Deck | Fallback deck | `Default` |
| Note Type | Anki note type | `Basic` |
| Notes Folder Path | Save location | `English Dictionary` |
| Enable Lemmatization | Toggle | ✅ |

### Step 4: Setup AnkiConnect

1. Open Anki → Tools → Add-ons → Get Add-ons
2. Enter code: `2055492159`
3. Restart Anki
4. Verify AnkiConnect is running (default port 8765)

---

## 🚀 Usage

### Basic Workflow

1. **Open Dictionary**
   - Click ribbon icon (book icon)
   - OR use command: `Ctrl/Cmd + P` → "Open Dictionary"

2. **Lookup a Word**
   - Type word in search box
   - Click "Lookup" or press Enter
   - Lemmatization auto-applies (e.g., "running" → "run")

3. **Save to Note**
   - Click "💾 Save to Note" button
   - Note auto-opens in new tab
   - Edit as needed (add personal context)

4. **Chat with AI Tutor** (Optional)
   - Click "💬 Chat with Tutor"
   - Ask questions about word usage
   - Get grammar tips and examples

5. **Export to Anki**
   - Click "📤 Export to Anki"
   - AI suggests best deck
   - Confirm or choose different deck
   - Card created from edited note content

### Lookup Selected Text

1. Select word in any note
2. `Ctrl/Cmd + P` → "Lookup Selected Word"
3. Dictionary opens with word pre-filled

### Overwriting Duplicate Cards

If card already exists:
1. Modal shows existing card preview
2. Choose "Overwrite" or "Cancel"
3. Overwrite updates all fields

---

## 🎨 UI Overview

### Main View
- **Search Bar**: Input with blue gradient theme
- **Dictionary Entry**: Clean card layout with sections
- **Audio Buttons**: Play Cambridge pronunciation (US/UK/AUS)
- **Workflow Steps**: Visual progress (3 steps)
- **Action Buttons**: Color-coded states (blue/purple/green)

### Modals
- **Deck Selection Modal**: AI suggestion + dropdown + recent decks
- **Duplicate Modal**: Warning + overwrite option

### Chatbot
- **Message Bubbles**: User (right/blue) vs AI (left/purple)
- **Context-Aware**: Knows current word
- **Scrollable History**: Up to 400px height

---

## 🛠️ Development

### Project Structure

```
English_v2/
├── api/
│   └── english-service.py       # Vercel backend (Flask)
├── main.js                       # Plugin core logic (~1100 lines)
├── styles.css                    # UI styles (~850 lines)
├── manifest.json                 # Plugin metadata
├── vercel.json                   # Vercel config
├── requirements.txt              # Python dependencies
├── .gitignore                    # Git ignore patterns
├── README.md                     # This file
└── DEPLOYMENT.md                 # Detailed deployment guide
```

### Tech Stack
- **Frontend**: Obsidian Plugin API (JavaScript)
- **Backend**: Flask 3.0.0 on Vercel (Python 3.11)
- **AI**: Groq API (`openai/gpt-oss-120b`)
- **Audio**: Cambridge Dictionary + Google TTS
- **Anki**: AnkiConnect API

### Key Functions

**Lemmatization**
```javascript
simpleLemmatize("running") // → "run"
simpleLemmatize("stopped") // → "stop"
simpleLemmatize("boxes")   // → "box"
```

**AI Services**
```javascript
aiService.generateDefinition(word)       // Full analysis
aiService.suggestAnkiDeck(word, def)    // Deck routing
aiService.chat(message, context, history) // Chatbot
```

**Export Workflow**
```javascript
parseNoteToFields(noteContent) // Read edited note
checkDuplicate(deck, word)      // Find existing
addNote() / updateNote()        // Create/overwrite
```

---

## 🔧 Troubleshooting

### Common Issues

**1. "Groq API Error"**
- Check API key in settings
- Verify model name: `openai/gpt-oss-120b`
- Check console for details

**2. "Backend Not Responding"**
- Verify Vercel URL has no trailing slash
- Check deployment status on Vercel dashboard
- Test health endpoint: `https://your-app.vercel.app/api/health`

**3. "AnkiConnect Not Available"**
- Ensure Anki is running
- Check AnkiConnect addon is installed (code: 2055492159)
- Verify URL: `http://127.0.0.1:8765`
- Try: `curl http://127.0.0.1:8765` (should return version)

**4. "Audio Not Playing"**
- Check browser console for CORS errors
- Verify Vercel backend is running
- Test proxy endpoint: `/api/audio-proxy?url=...`

**5. "Note Not Saving"**
- Check folder path in settings
- Ensure folder exists or create manually
- Verify vault permissions

**6. "Duplicate Detection Not Working"**
- Ensure Anki is running
- Check deck name matches exactly
- Field name must be "Word" (case-sensitive)

---

## 📝 Anki Note Type Setup

### Recommended Note Type: "English Dictionary Pro"

**Fields:**
1. Word
2. Definition
3. Vietnamese
4. Examples
5. Synonyms
6. Antonyms
7. Collocations
8. WordFamily
9. PhrasalVerbs
10. UsageNotes
11. PersonalNote

**Front Template:**
```html
<div class="word">{{Word}}</div>
<div class="definition">{{Definition}}</div>
```

**Back Template:**
```html
{{FrontSide}}
<hr>
<div class="vietnamese">{{Vietnamese}}</div>
<div class="examples">{{Examples}}</div>
<div class="notes">{{PersonalNote}}</div>
```

---

## 🎯 Workflow Best Practices

1. **Always Edit Notes Before Export**
   - Add personal context to "Personal Note" section
   - Simplify examples if too complex
   - Highlight key collocations

2. **Use Chatbot for Clarification**
   - Ask about confusing nuances
   - Request more examples
   - Check grammar usage

3. **Leverage Deck Structure**
   - Trust AI suggestion (it analyzes context)
   - Override for specific study goals
   - Review recent decks for patterns

4. **Lemmatization Tips**
   - Disable if looking up irregular verbs (went, was, etc.)
   - Works best for regular verbs/nouns
   - Check lemmatized form before lookup

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Open pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Credits

- **Groq**: Fast AI inference
- **Cambridge Dictionary**: High-quality audio
- **AnkiConnect**: Anki integration
- **Obsidian Community**: Inspiration and support

---

## 📧 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: your-email@example.com

---

## 🗺️ Roadmap

### v2.1.0 (Planned)
- [ ] Support for multiple languages (Spanish, French, etc.)
- [ ] Image search integration
- [ ] Spaced repetition scheduling
- [ ] Export to CSV/JSON

### v2.2.0 (Planned)
- [ ] Offline mode with cached definitions
- [ ] Custom AI prompts
- [ ] Bulk word import
- [ ] Statistics dashboard

---

**Enjoy learning English with AI! 🚀📚**
