/**
 * English Dictionary Pro v2.0.0
 * 
 * Features:
 * - Simple lemmatization (remove -ing, -ed, -s, -es suffixes)
 * - Cambridge Dictionary lookup with Groq AI (openai/gpt-oss-120b)
 * - New workflow: Lookup → Save to Note (auto-open) → Chat with AI → Edit → Export to Anki
 * - WordFamily field (replaces Idioms)
 * - PersonalNote field for user's own context
 * - Smart Anki deck suggestion (TOEIC vs GENERAL + sub-decks)
 * - Duplicate check with overwrite option
 * - Export from edited note content (not raw AI result)
 * - Cambridge audio + Google TTS fallback via Vercel backend
 * - English Tutor Chatbot with context-aware suggestions
 */

const { Plugin, Modal, Notice, PluginSettingTab, Setting, MarkdownView } = require('obsidian');

// ==================== SETTINGS ====================

const DEFAULT_SETTINGS = {
    groqApiKey: '',
    groqModel: 'openai/gpt-oss-120b', // Updated model
    vercelBackendUrl: 'http://localhost:6789', // LOCAL MODE - Change to Vercel URL after deployment
    ankiConnectUrl: 'http://127.0.0.1:8765',
    defaultDeckName: 'Default',
    noteType: 'Basic',
    folderPath: 'English Dictionary',
    recentDecks: [], // Store recent deck selections
    enableLemmatization: true, // Toggle simple lemmatization
};

// ==================== SETTINGS TAB ====================

class EnglishDictionarySettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'English Dictionary Pro v2 Settings' });

        // Groq API Key
        new Setting(containerEl)
            .setName('Groq API Key')
            .setDesc('Get your free API key from https://console.groq.com/keys')
            .addText(text => text
                .setPlaceholder('Enter your Groq API key')
                .setValue(this.plugin.settings.groqApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.groqApiKey = value;
                    await this.plugin.saveSettings();
                }));

        // Groq Model
        new Setting(containerEl)
            .setName('Groq Model')
            .setDesc('AI model for word definitions and analysis. Use: openai/gpt-oss-120b')
            .addText(text => text
                .setPlaceholder('openai/gpt-oss-120b')
                .setValue(this.plugin.settings.groqModel)
                .onChange(async (value) => {
                    this.plugin.settings.groqModel = value;
                    await this.plugin.saveSettings();
                }));

        // Vercel Backend URL
        new Setting(containerEl)
            .setName('Backend URL')
            .setDesc('🔧 LOCAL: http://localhost:6789 | 🚀 PRODUCTION: https://your-app.vercel.app')
            .addText(text => text
                .setPlaceholder('http://localhost:6789')
                .setValue(this.plugin.settings.vercelBackendUrl)
                .onChange(async (value) => {
                    this.plugin.settings.vercelBackendUrl = value.replace(/\/$/, ''); // Remove trailing slash
                    await this.plugin.saveSettings();
                }));

        // AnkiConnect URL
        new Setting(containerEl)
            .setName('AnkiConnect URL')
            .setDesc('AnkiConnect server URL (default: http://127.0.0.1:8765)')
            .addText(text => text
                .setPlaceholder('http://127.0.0.1:8765')
                .setValue(this.plugin.settings.ankiConnectUrl)
                .onChange(async (value) => {
                    this.plugin.settings.ankiConnectUrl = value;
                    await this.plugin.saveSettings();
                }));

        // Default Deck Name
        new Setting(containerEl)
            .setName('Default Anki Deck')
            .setDesc('Fallback deck name if AI suggestion fails')
            .addText(text => text
                .setPlaceholder('Default')
                .setValue(this.plugin.settings.defaultDeckName)
                .onChange(async (value) => {
                    this.plugin.settings.defaultDeckName = value;
                    await this.plugin.saveSettings();
                }));

        // Note Type
        new Setting(containerEl)
            .setName('Anki Note Type')
            .setDesc('Anki note type to use (must exist in Anki)')
            .addText(text => text
                .setPlaceholder('Basic')
                .setValue(this.plugin.settings.noteType)
                .onChange(async (value) => {
                    this.plugin.settings.noteType = value;
                    await this.plugin.saveSettings();
                }));

        // Folder Path
        new Setting(containerEl)
            .setName('Notes Folder Path')
            .setDesc('Folder to save dictionary notes')
            .addText(text => text
                .setPlaceholder('English Dictionary')
                .setValue(this.plugin.settings.folderPath)
                .onChange(async (value) => {
                    this.plugin.settings.folderPath = value;
                    await this.plugin.saveSettings();
                }));

        // Enable Lemmatization
        new Setting(containerEl)
            .setName('Enable Simple Lemmatization')
            .setDesc('Automatically remove -ing, -ed, -s, -es suffixes before lookup')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableLemmatization)
                .onChange(async (value) => {
                    this.plugin.settings.enableLemmatization = value;
                    await this.plugin.saveSettings();
                }));
    }
}

// ==================== SIMPLE LEMMATIZATION ====================

// 🚀 Cache for lemmatization results (avoid re-processing same words)
const lemmaCache = new Map();

/**
 * Advanced English Lemmatization
 * Based on real English morphology rules
 * Handles irregular forms, exceptions, and edge cases
 * 
 * @param {string} word - Input word
 * @returns {string} - Lemmatized word (or original if not applicable)
 */
function simpleLemmatize(word) {
    const lower = word.toLowerCase().trim();
    
    // Check cache first
    if (lemmaCache.has(lower)) {
        return lemmaCache.get(lower);
    }
    
    // ==============================================
    // STEP 1: WORDS THAT SHOULD NEVER BE LEMMATIZED
    // ==============================================
    const neverLemmatize = new Set([
        // Common words ending in -ing (nouns/adjectives, not verbs)
        'being', 'thing', 'something', 'anything', 'nothing', 'everything',
        'king', 'ring', 'wing', 'string', 'spring', 'morning', 'evening',
        'wedding', 'building', 'meeting', 'feeling', 'ceiling', 'clothing',
        'during', 'bring', 'sing', 'sting', 'swing', 'cling', 'fling',
        
        // Common words ending in -ed (adjectives/nouns, not past tense)
        'red', 'bed', 'fed', 'led', 'shed', 'wed', 'bled', 'fled', 'sled',
        'hundred', 'sacred', 'wicked', 'naked', 'wretched', 'blessed', 'rugged',
        'aged', 'learned', 'beloved', 'crooked', 'ragged', 'wicked',
        
        // Common words ending in -s/-es (not plurals/verbs)
        'this', 'yes', 'his', 'bus', 'gas', 'plus', 'minus', 'bonus',
        'pass', 'class', 'glass', 'mass', 'boss', 'loss', 'cross', 'moss', 'gross',
        'address', 'process', 'access', 'success', 'express', 'impress', 'press',
        'business', 'witness', 'fitness', 'illness', 'darkness', 'happiness',
        'series', 'species', 'analysis', 'basis', 'crisis', 'thesis',
        'always', 'perhaps', 'unless', 'across', 'canvas', 'focus', 'status',
        'genius', 'radius', 'virus', 'campus', 'census', 'chorus'
    ]);
    
    if (neverLemmatize.has(lower)) {
        return lower;
    }
    
    // Don't lemmatize very short words (< 4 characters)
    if (lower.length < 4) {
        return lower;
    }
    
    // ==============================================
    // STEP 2: HANDLE -ING SUFFIX (verb → base form)
    // ==============================================
    if (lower.endsWith('ing') && lower.length > 5) {
        let base = lower.slice(0, -3);
        
        // Rule 1: Doubled consonant → remove one (running → run, swimming → swim)
        if (base.length >= 3) {
            const lastChar = base[base.length - 1];
            const secondLast = base[base.length - 2];
            
            if (lastChar === secondLast && 
                'bcdfghjklmnpqrstvwxyz'.includes(lastChar) &&
                !['ll', 'ss', 'ff', 'zz'].includes(base.slice(-2))) {
                base = base.slice(0, -1);
            }
        }
        
        // Rule 2: If base ends in vowel + consonant (except 'y'), might need 'e' back
        // (make → making, love → loving)
        // But we can't be 100% sure without dictionary, so return base
        
        lemmaCache.set(lower, base);  // Cache result
        return base;
    }
    
    // ==============================================
    // STEP 3: HANDLE -ED SUFFIX (past tense → base)
    // ==============================================
    if (lower.endsWith('ed') && lower.length > 4) {
        // Rule 1: -ied → -y (studied → study, tried → try)
        if (lower.endsWith('ied') && lower.length > 5) {
            const result = lower.slice(0, -3) + 'y';
            lemmaCache.set(lower, result);  // Cache result
            return result;
        }
        
        // Rule 2: Words ending in consonant + 'e' + 'd' → just remove 'd'
        // (liked → like, loved → love, hoped → hope, named → name)
        if (lower.length >= 5) {
            const beforeEd = lower.slice(0, -2);
            const lastCharOfBase = beforeEd[beforeEd.length - 1];
            
            // If base ends in 'e', just remove 'd'
            if (lastCharOfBase === 'e') {
                lemmaCache.set(lower, beforeEd);  // Cache result
                return beforeEd;
            }
        }
        
        // Rule 3: Doubled consonant before 'ed' → remove one (stopped → stop)
        const base = lower.slice(0, -2);
        if (base.length >= 2) {
            const lastChar = base[base.length - 1];
            const secondLast = base[base.length - 2];
            
            if (lastChar === secondLast && 
                'bcdfghjklmnpqrstvwxyz'.includes(lastChar) &&
                !['ee', 'oo'].includes(base.slice(-2))) {
                const result = base.slice(0, -1);
                lemmaCache.set(lower, result);  // Cache result
                return result;
            }
        }
        
        // Rule 4: Otherwise, just remove 'ed'
        lemmaCache.set(lower, base);  // Cache result
        return base;
    }
    
    // ==============================================
    // STEP 4: HANDLE -S/-ES SUFFIX (plural/3rd person)
    // ==============================================
    
    // Rule 1: -ies → -y (stories → story, flies → fly, studies → study)
    if (lower.endsWith('ies') && lower.length > 4) {
        const result = lower.slice(0, -3) + 'y';
        lemmaCache.set(lower, result);  // Cache result
        return result;
    }
    
    // Rule 2: -ses, -xes, -zes, -ches, -shes → remove 'es'
    if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('zes') ||
        lower.endsWith('ches') || lower.endsWith('shes')) {
        const result = lower.slice(0, -2);
        lemmaCache.set(lower, result);  // Cache result
        return result;
    }
    
    // Rule 3: -oes → -o (goes → go, does → do, potatoes → potato)
    if (lower.endsWith('oes') && lower.length > 4) {
        const result = lower.slice(0, -2);
        lemmaCache.set(lower, result);  // Cache result
        return result;
    }
    
    // Rule 4: Regular -s removal (but be careful!)
    if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us')) {
        const base = lower.slice(0, -1);
        
        // Don't create invalid words
        if (base.length < 3) {
            lemmaCache.set(lower, lower);  // Cache result
            return lower;
        }
        
        // If base ends in vowel + consonant + 'e', it's likely valid
        // (makes → make, likes → like, hopes → hope)
        const lastChar = base[base.length - 1];
        if (lastChar === 'e') {
            lemmaCache.set(lower, base);  // Cache result
            return base;
        }
        
        // Otherwise, check if it looks like a valid base
        // Most valid bases end in: consonant, or vowel+consonant
        const secondLast = base[base.length - 2];
        
        // If ends in double consonant, keep it (e.g., calls → call)
        if (lastChar === secondLast && 'bcdfghjklmnpqrstvwxyz'.includes(lastChar)) {
            lemmaCache.set(lower, base);  // Cache result
            return base;
        }
        
        // If ends in single consonant after vowel, likely valid
        if ('aeiou'.includes(secondLast) && 'bcdfghjklmnpqrstvwxyz'.includes(lastChar)) {
            lemmaCache.set(lower, base);  // Cache result
            return base;
        }
        
        // If ends in consonant cluster, likely valid (helps → help, wants → want)
        if ('bcdfghjklmnpqrstvwxyz'.includes(secondLast) && 
            'bcdfghjklmnpqrstvwxyz'.includes(lastChar)) {
            lemmaCache.set(lower, base);  // Cache result
            return base;
        }
        
        // Default: return base
        lemmaCache.set(lower, base);  // Cache result
        return base;
    }
    
    // No changes needed - cache and return original
    lemmaCache.set(lower, lower);  // Cache result
    return lower;
}

// ==================== AI SERVICE (GROQ) ====================

class AIService {
    constructor(apiKey, model = 'openai/gpt-oss-120b') {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    }

    /**
     * Generate comprehensive word definition with all fields
     * @param {string} word - Word to analyze
     * @returns {Promise<Object>} - Word data
     */
    async generateDefinition(word) {
        const prompt = `Analyze the English word "${word}" and provide a comprehensive analysis in JSON format. Include:

1. word: The word itself
2. wordType: Part of speech (noun, verb, adjective, etc.)
3. pronunciation: IPA pronunciation
4. definition: Clear, concise definition in English
5. vietnamese: Vietnamese translation
6. examples: Array of 3-4 example sentences
7. synonyms: Array of synonyms
8. antonyms: Array of antonyms
9. collocations: Array of objects with collocation AND usage example - IMPORTANT: Each collocation MUST have usage example to avoid wrong usage
10. wordFamily: Array of DIFFERENT word forms derived from the same root - CRITICAL: These must be DIFFERENT WORDS (noun/verb/adjective/adverb forms), NOT the original word. Include Vietnamese translation for each. Example: if word is "happy" → wordFamily should be ["happiness" (noun), "happily" (adverb), "unhappy" (adjective)]. If word is "possibility" → wordFamily should be ["possible" (adjective), "possibly" (adverb), "impossible" (adjective), "impossibility" (noun)].
11. nuance: Usage notes and subtle meanings
12. commonMistakes: Array of simple descriptions of common errors non-native speakers make (e.g., "Often confused with 'borrow'", "Don't forget 'to' after this verb", "Many learners mispronounce the 'th' sound")

Format: Return ONLY valid JSON, no markdown code blocks.

Example format:
{
  "word": "example",
  "wordType": "noun",
  "pronunciation": "/ɪɡˈzɑːmpl/",
  "definition": "A thing characteristic of its kind or illustrating a general rule.",
  "vietnamese": "Ví dụ, mẫu",
  "examples": ["This is an example sentence.", "Can you give me an example?"],
  "synonyms": ["sample", "instance", "illustration"],
  "antonyms": [],
  "collocations": [
    {"phrase": "for example", "usage": "For example, you can use this word in many contexts."},
    {"phrase": "typical example", "usage": "This is a typical example of good writing."},
    {"phrase": "give an example", "usage": "Can you give an example to illustrate your point?"}
  ],
  "wordFamily": [
    {"word": "exemplify", "type": "verb", "vietnamese": "minh họa, làm gương"},
    {"word": "exemplary", "type": "adjective", "vietnamese": "mẫu mực, gương mẫu"},
    {"word": "exemplification", "type": "noun", "vietnamese": "sự minh họa"}
  ],
  "nuance": "Used to clarify or demonstrate something.",
  "commonMistakes": [
    "Often confused with 'sample' (more formal context)",
    "Non-native speakers may forget the article 'an' before 'example'"
  ]
}`;

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 3000  // Reduced from 5000 for faster response
            })
        });

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Parse JSON response
        try {
            // Remove markdown code blocks if present
            const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse AI response:', content);
            throw new Error('Invalid JSON response from AI');
        }
    }

    /**
     * Suggest appropriate Anki deck based on word difficulty and context
     * @param {string} word - Word to analyze
     * @param {string} definition - Word definition
     * @param {Array<string>} userDecks - User's actual Anki decks
     * @returns {Promise<Object>} - {category: 'TOEIC'|'GENERAL', subDeck: string, reason: string}
     */
    async suggestAnkiDeck(word, definition, userDecks = []) {
        // Build deck list from user's actual decks
        const toeicDecks = userDecks.filter(d => d.startsWith('TOEIC::')).map(d => d.split('::')[1] || d);
        const generalDecks = userDecks.filter(d => d.startsWith('GENERAL::')).map(d => d.split('::')[1] || d);
        const otherDecks = userDecks.filter(d => !d.startsWith('TOEIC::') && !d.startsWith('GENERAL::'));
        
        let deckListText = '';
        
        if (toeicDecks.length > 0) {
            deckListText += '\nTOEIC Decks (business/test-prep):\n';
            toeicDecks.forEach(d => deckListText += `- TOEIC::${d}\n`);
        }
        
        if (generalDecks.length > 0) {
            deckListText += '\nGENERAL Decks (daily use):\n';
            generalDecks.forEach(d => deckListText += `- GENERAL::${d}\n`);
        }
        
        if (otherDecks.length > 0) {
            deckListText += '\nOther Decks:\n';
            otherDecks.forEach(d => deckListText += `- ${d}\n`);
        }
        
        // If no suitable decks found, suggest creating one
        if (!deckListText.trim()) {
            deckListText = `\nNo suitable decks found. Suggest creating one of:
- TOEIC::Business_Vocabulary
- TOEIC::Daily_Life
- GENERAL::Daily_Conversation
- GENERAL::Academic_Writing`;
        }
        
        const prompt = `Analyze this English word and suggest the BEST deck from user's existing Anki decks:

Word: "${word}"
Definition: "${definition}"

User's Available Decks:${deckListText}

RULES:
1. Choose from user's EXISTING decks above
2. If NO suitable deck exists, suggest creating a NEW deck with format: TOEIC::Category or GENERAL::Category
3. Match word to most relevant deck based on context

Return ONLY this JSON format (no markdown, no explanation):
{
  "category": "TOEIC or GENERAL",
  "subDeck": "exact deck name from list OR new deck suggestion",
  "reason": "brief explanation (1 sentence)",
  "isNewDeck": true/false
}`;

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 200
            })
        });

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
            const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse deck suggestion:', content);
            // Fallback to first available deck or suggest new
            if (userDecks.length > 0) {
                const firstDeck = userDecks[0];
                return {
                    category: firstDeck.startsWith('TOEIC::') ? 'TOEIC' : 'GENERAL',
                    subDeck: firstDeck,
                    reason: 'Using first available deck (parsing error)',
                    isNewDeck: false
                };
            } else {
                return {
                    category: 'GENERAL',
                    subDeck: 'GENERAL::Daily_Conversation',
                    reason: 'Suggest creating new deck (no decks found)',
                    isNewDeck: true
                };
            }
        }
    }

    /**
     * Chatbot conversation for English learning
     * @param {string} message - User message
     * @param {string} context - Current word context
     * @param {Array} history - Chat history [{role: 'user'|'assistant', content: '...'}]
     * @returns {Promise<string>} - AI response
     */
    async chat(message, context = '', history = []) {
        const systemPrompt = `You are a concise English tutor. Current word: ${context}

Rules:
- Answer directly and briefly (2-3 sentences max)
- Focus ONLY on what user asked
- Use simple language, no formatting
- Give 1-2 examples if needed
- Be friendly but short`;

        // Build messages array - convert history format
        const messages = [
            { role: 'system', content: systemPrompt }
        ];
        
        // Add history (already in correct format)
        history.forEach(msg => {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            });
        });
        
        // Add current message
        messages.push({ role: 'user', content: message });

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    temperature: 0.8,
                    max_tokens: 10000
                })
            });

            if (!response.ok) {
                throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Chat error:', error);
            throw error;
        }
    }
}

// ==================== AUDIO SERVICE (VERCEL BACKEND) ====================

class AudioService {
    constructor(backendUrl) {
        this.backendUrl = backendUrl;
    }

    /**
     * Fetch Cambridge audio URL (UK accent only)
     * @param {string} word - Word to fetch audio for
     * @returns {Promise<Object>} - {audio_url, accent, source} or null
     */
    async getCambridgeAudio(word) {
        try {
            const response = await fetch(`${this.backendUrl}/api/cambridge-audio?word=${encodeURIComponent(word)}`);
            
            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success && data.audio_url) {
                return {
                    url: data.audio_url,
                    accent: data.accent,
                    source: data.source
                };
            }
            return null;
        } catch (error) {
            console.error('Failed to fetch Cambridge audio:', error);
            return null;
        }
    }

    /**
     * Get audio proxy URL (for CORS bypass)
     * @param {string} audioUrl - Original audio URL
     * @returns {string} - Proxied URL
     */
    getProxyUrl(audioUrl) {
        return `${this.backendUrl}/api/audio-proxy?url=${encodeURIComponent(audioUrl)}`;
    }

    /**
     * Download audio file to vault and return embed syntax
     * @param {string} audioUrl - Audio URL to download
     * @param {string} word - Word name for filename
     * @param {Object} vault - Obsidian vault object
     * @param {Object} ankiService - AnkiService instance for storing media
     * @returns {Promise<string>} - [sound:filename.mp3] format for Anki
     */
    async downloadAudio(audioUrl, word, vault, ankiService) {
        try {
            const proxyUrl = this.getProxyUrl(audioUrl);
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to download audio: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            // Create English Audio folder if not exists
            const audioFolderPath = 'English Audio';
            const folder = vault.getAbstractFileByPath(audioFolderPath);
            if (!folder) {
                await vault.createFolder(audioFolderPath);
            }
            
            // Save audio file
            const fileName = `${word.replace(/[^a-z0-9]/gi, '_')}.mp3`;
            const filePath = `${audioFolderPath}/${fileName}`;
            
            // Check if file exists, delete if so
            const existingFile = vault.getAbstractFileByPath(filePath);
            if (existingFile) {
                await vault.delete(existingFile);
            }
            
            await vault.createBinary(filePath, arrayBuffer);
            console.log(`✅ Audio saved to vault: ${filePath}`);
            
            // Store to Anki collection.media
            if (ankiService) {
                try {
                    await ankiService.storeMediaFile(fileName, arrayBuffer);
                    console.log(`✅ Audio stored to Anki: ${fileName}`);
                } catch (error) {
                    console.error('❌ Failed to store audio to Anki:', error);
                }
            }
            
            // Return Anki [sound:] format
            return `[sound:${fileName}]`;
        } catch (error) {
            console.error('Audio download error:', error);
            return ''; // Return empty if failed
        }
    }
}

// ==================== ANKI SERVICE ====================

class AnkiService {
    constructor(ankiConnectUrl) {
        this.url = ankiConnectUrl;
    }

    /**
     * Invoke AnkiConnect API
     * @param {string} action - API action
     * @param {Object} params - Parameters
     * @returns {Promise<any>} - API response
     */
    async invoke(action, params = {}) {
        const response = await fetch(this.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, version: 6, params })
        });

        if (!response.ok) {
            throw new Error(`AnkiConnect error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`AnkiConnect: ${data.error}`);
        }

        return data.result;
    }

    /**
     * Check if duplicate card exists
     * @param {string} deckName - Deck name
     * @param {string} word - Word to check
     * @returns {Promise<Array>} - Array of existing note IDs
     */
    async checkDuplicate(deckName, word) {
        try {
            const noteIds = await this.invoke('findNotes', {
                query: `"deck:${deckName}" "Word:${word}"`
            });
            return noteIds;
        } catch (error) {
            console.error('Duplicate check failed:', error);
            return [];
        }
    }

    /**
     * Get note info by ID
     * @param {number} noteId - Note ID
     * @returns {Promise<Object>} - Note info
     */
    async getNote(noteId) {
        const notes = await this.invoke('notesInfo', { notes: [noteId] });
        return notes[0];
    }

    /**
     * Add note to Anki
     * @param {Object} params - Note parameters
     * @returns {Promise<number>} - Note ID
     */
    async addNote(params) {
        return await this.invoke('addNote', { note: params });
    }

    /**
     * Update existing note
     * @param {number} noteId - Note ID
     * @param {Object} fields - Updated fields
     * @returns {Promise<void>}
     */
    async updateNote(noteId, fields) {
        await this.invoke('updateNoteFields', {
            note: { id: noteId, fields }
        });
    }

    /**
     * Get all deck names
     * @returns {Promise<Array>} - Deck names
     */
    async getDeckNames() {
        return await this.invoke('deckNames');
    }

    /**
     * Create deck if not exists
     * @param {string} deckName - Deck name
     * @returns {Promise<void>}
     */
    async createDeck(deckName) {
        await this.invoke('createDeck', { deck: deckName });
    }

    /**
     * Get all note type (model) names
     * @returns {Promise<Array>} - Note type names
     */
    async getModelNames() {
        return await this.invoke('modelNames');
    }

    /**
     * Get field names for a note type
     * @param {string} modelName - Note type name
     * @returns {Promise<Array>} - Field names
     */
    async getModelFieldNames(modelName) {
        return await this.invoke('modelFieldNames', { modelName });
    }

    /**
     * Store media file (audio) to Anki collection
     * @param {string} filename - Filename (e.g., 'word.mp3')
     * @param {ArrayBuffer} data - File data as ArrayBuffer
     * @returns {Promise<string>} - Stored filename
     */
    async storeMediaFile(filename, data) {
        // Convert ArrayBuffer to base64
        const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
        
        return await this.invoke('storeMediaFile', {
            filename: filename,
            data: base64
        });
    }
}

// ==================== DECK SELECTION MODAL ====================

class DeckSelectionModal extends Modal {
    constructor(app, aiSuggestion, allDecks, recentDecks, fields, noteTypes, ankiService, onConfirm) {
        super(app);
        this.aiSuggestion = aiSuggestion; // {category, subDeck, reason}
        this.allDecks = allDecks || []; // ALL decks from Anki
        this.recentDecks = recentDecks || [];
        this.fields = fields; // For preview
        this.noteTypes = noteTypes || []; // All note types from Anki
        this.ankiService = ankiService; // For fetching field names
        this.onConfirm = onConfirm;
        this.selectedDeck = aiSuggestion.subDeck;
        this.selectedNoteType = noteTypes[0] || 'Basic'; // Default to first note type
        this.noteTypeFields = [];
        this.fieldMapping = {};
    }

    onOpen() { 
        const { contentEl } = this;
        contentEl.addClass('deck-selection-modal');
        
        // Title
        contentEl.createEl('h2', { text: '🎯 Export to Anki' });
        
        // AI Suggestion Box
        const suggestionBox = contentEl.createDiv({ cls: 'ai-suggestion-box' });
        suggestionBox.createEl('h3', { text: '🤖 AI Recommendation' });
        suggestionBox.createEl('p', { text: this.aiSuggestion.reason });
        const suggestedDeckEl = suggestionBox.createDiv({ cls: 'suggested-deck' });
        
        // Format deck name for display
        const displayDeck = this.aiSuggestion.subDeck.includes('::') 
            ? this.aiSuggestion.subDeck.split('::')[1].replace(/_/g, ' ')
            : this.aiSuggestion.subDeck;
        suggestedDeckEl.setText(`📦 ${displayDeck}`);
        
        // Categorize decks
        const categorizedDecks = {};
        this.allDecks.forEach(deck => {
            if (deck.includes('::')) {
                const parent = deck.split('::')[0];
                if (!categorizedDecks[parent]) categorizedDecks[parent] = [];
                categorizedDecks[parent].push(deck);
            } else {
                if (!categorizedDecks['Other']) categorizedDecks['Other'] = [];
                categorizedDecks['Other'].push(deck);
            }
        });
        
        // Deck Selection Area
        const deckArea = contentEl.createDiv({ cls: 'deck-selection-area' });
        deckArea.createEl('h4', { text: '📚 Or Choose Another Deck:' });
        
        // Category Buttons
        const categoryBtns = deckArea.createDiv({ cls: 'category-buttons' });
        Object.keys(categorizedDecks).sort().forEach(category => {
            const btn = categoryBtns.createEl('button', { 
                text: category, 
                cls: 'category-btn' 
            });
            btn.addEventListener('click', () => {
                this.showDecksInCategory(category, categorizedDecks[category], deckArea);
            });
        });
        
        // Deck list container
        this.deckListEl = deckArea.createDiv({ cls: 'deck-list-container' });
        
        // Note Type Selection
        const noteTypeArea = contentEl.createDiv({ cls: 'note-type-area' });
        noteTypeArea.createEl('h4', { text: '📝 Note Type:' });
        
        const noteTypeBtns = noteTypeArea.createDiv({ cls: 'note-type-buttons' });
        this.noteTypes.forEach(nt => {
            const btn = noteTypeBtns.createEl('button', {
                text: nt,
                cls: 'note-type-btn' + (nt === this.selectedNoteType ? ' active' : '')
            });
            btn.addEventListener('click', async () => {
                this.selectedNoteType = nt;
                noteTypeBtns.querySelectorAll('.note-type-btn').forEach(b => b.removeClass('active'));
                btn.addClass('active');
                await this.updateFieldMapping();
            });
        });
        
        // Selected Info
        this.selectedInfo = contentEl.createDiv({ cls: 'selected-info' });
        
        // Field Mapping Display
        this.fieldMappingEl = contentEl.createDiv({ cls: 'field-mapping-section' });
        
        // Card Preview
        this.cardPreviewEl = contentEl.createDiv({ cls: 'card-preview-section' });
        
        // Update all displays
        this.updateSelectedInfo();
        
        // Buttons
        const buttonsDiv = contentEl.createDiv({ cls: 'deck-modal-buttons' });
        
        const confirmBtn = buttonsDiv.createEl('button', { text: '✓ EXPORT TO ANKI', cls: 'btn-confirm' });
        confirmBtn.addEventListener('click', () => {
            this.onConfirm(this.selectedDeck, this.selectedNoteType, this.fieldMapping);
            this.close();
        });
        
        const cancelBtn = buttonsDiv.createEl('button', { text: '✕ CANCEL', cls: 'btn-cancel' });
        cancelBtn.addEventListener('click', () => {
            this.close();
        });
        
        // Initialize field mapping
        this.updateFieldMapping();
    }
    
    showDecksInCategory(category, decks, container) {
        this.deckListEl.empty();
        this.deckListEl.createEl('h5', { text: `${category} Decks:` });
        
        const grid = this.deckListEl.createDiv({ cls: 'deck-grid' });
        decks.forEach(deck => {
            const deckName = deck.includes('::') ? deck.split('::')[1].replace(/_/g, ' ') : deck;
            const btn = grid.createEl('button', {
                text: deckName,
                cls: 'deck-btn' + (deck === this.selectedDeck ? ' active' : '')
            });
            btn.addEventListener('click', () => {
                this.selectedDeck = deck;
                grid.querySelectorAll('.deck-btn').forEach(b => b.removeClass('active'));
                btn.addClass('active');
                this.updateSelectedInfo();
            });
        });
    }
    
    updateSelectedInfo() {
        if (!this.selectedInfo) return;
        this.selectedInfo.empty();
        
        const deckName = this.selectedDeck.includes('::') 
            ? this.selectedDeck.split('::')[1].replace(/_/g, ' ')
            : this.selectedDeck;
        
        this.selectedInfo.innerHTML = `
            <div style="background: rgba(79, 140, 255, 0.1); padding: 12px; border-radius: 8px; margin: 12px 0;">
                <strong style="color: #4f8cff;">📦 Deck:</strong> ${deckName}<br>
                <strong style="color: #4f8cff;">📝 Note Type:</strong> ${this.selectedNoteType}
            </div>
        `;
        
        // Update field mapping and preview
        this.updateFieldMappingDisplay();
        this.updateCardPreview();
    }
    
    updateFieldMappingDisplay() {
        if (!this.fieldMappingEl) return;
        this.fieldMappingEl.empty();
        
        const title = this.fieldMappingEl.createEl('h4', { text: '🔗 Field Mapping' });
        title.style.cssText = 'margin: 16px 0 12px 0; font-size: 14px; color: #94a3b8;';
        
        const mappingGrid = this.fieldMappingEl.createDiv({ cls: 'mapping-grid' });
        
        Object.entries(this.fieldMapping).forEach(([targetField, value]) => {
            const item = mappingGrid.createDiv({ cls: 'mapping-item' });
            
            const fieldName = item.createDiv({ cls: 'mapping-field-name' });
            fieldName.setText(targetField);
            
            const arrow = item.createDiv({ cls: 'mapping-arrow' });
            arrow.setText('→');
            
            const fieldValue = item.createDiv({ cls: 'mapping-field-value' });
            // Truncate long values
            const displayValue = value && value.length > 50 
                ? value.substring(0, 50) + '...' 
                : (value || '(empty)');
            fieldValue.setText(displayValue);
        });
    }
    
    updateCardPreview() {
        if (!this.cardPreviewEl) return;
        this.cardPreviewEl.empty();
        
        const title = this.cardPreviewEl.createEl('h4', { text: '👁️ Card Preview' });
        title.style.cssText = 'margin: 16px 0 12px 0; font-size: 14px; color: #94a3b8;';
        
        const previewBox = this.cardPreviewEl.createDiv({ cls: 'preview-box' });
        
        // Show word being exported
        const wordEl = previewBox.createDiv({ cls: 'preview-word' });
        wordEl.setText(this.fields.word || '(No word)');
        
        // Show main fields
        const fieldsContainer = previewBox.createDiv({ cls: 'preview-fields' });
        
        if (this.fields.definition) {
            const defEl = fieldsContainer.createDiv({ cls: 'preview-field' });
            defEl.innerHTML = `<strong>Definition:</strong> ${this.fields.definition}`;
        }
        
        if (this.fields.vietnamese) {
            const vnEl = fieldsContainer.createDiv({ cls: 'preview-field' });
            vnEl.innerHTML = `<strong>Vietnamese:</strong> ${this.fields.vietnamese}`;
        }
        
        if (this.fields.example) {
            const exEl = fieldsContainer.createDiv({ cls: 'preview-field' });
            exEl.innerHTML = `<strong>Example:</strong> ${this.fields.example}`;
        }
    }
    
    async updateFieldMapping() {
        try {
            this.noteTypeFields = await this.ankiService.getModelFieldNames(this.selectedNoteType);
            
            // Auto-map fields intelligently with priority for exact matches
            this.fieldMapping = {};
            const sourceFields = Object.keys(this.fields);
            
            this.noteTypeFields.forEach(targetField => {
                const lowerTarget = targetField.toLowerCase();
                let bestMatch = null;
                let matchScore = 0;
                
                // Find best match from source fields with scoring system
                for (const sourceField of sourceFields) {
                    const lowerSource = sourceField.toLowerCase();
                    
                    // Exact match (highest priority)
                    if (lowerTarget === lowerSource) {
                        bestMatch = sourceField;
                        matchScore = 100;
                        break;
                    }
                    
                    // Special aliases
                    if ((lowerTarget === 'front' && lowerSource === 'word') ||
                        (lowerTarget === 'back' && lowerSource === 'definition')) {
                        if (matchScore < 90) {
                            bestMatch = sourceField;
                            matchScore = 90;
                        }
                    }
                    
                    // Partial match - but only if both are multi-word or if source contains target as whole word
                    // Avoid matching "WordFamily" to "Word" by checking word boundaries
                    if (matchScore < 50) {
                        // Target contains source (e.g., "Definition" contains "Def")
                        if (lowerTarget.includes(lowerSource) && lowerSource.length > 3) {
                            // Make sure it's not a substring match like "word" in "wordfamily"
                            const regex = new RegExp(`\\b${lowerSource}\\b`, 'i');
                            if (regex.test(lowerTarget)) {
                                bestMatch = sourceField;
                                matchScore = 50;
                            }
                        }
                        // Source contains target (e.g., "Vietnamese" contains "Viet")
                        else if (lowerSource.includes(lowerTarget) && lowerTarget.length > 3) {
                            const regex = new RegExp(`\\b${lowerTarget}\\b`, 'i');
                            if (regex.test(lowerSource)) {
                                bestMatch = sourceField;
                                matchScore = 50;
                            }
                        }
                    }
                }
                
                // Assign best match if found
                if (bestMatch) {
                    this.fieldMapping[targetField] = this.fields[bestMatch];
                }
            });
            
            console.log('🔍 [updateFieldMapping] Field mapping created:', JSON.stringify(Object.keys(this.fieldMapping)));
            if (this.fieldMapping.WordFamily) {
                console.log('🔍 [updateFieldMapping] WordFamily mapped to:', this.fieldMapping.WordFamily?.substring(0, 200));
            } else {
                console.log('⚠️ [updateFieldMapping] WordFamily NOT mapped! Available source fields:', Object.keys(this.fields));
            }
            
            // Update field mapping display
            this.fieldMappingEl.empty();
            this.fieldMappingEl.createEl('h4', { text: '🔗 Field Mapping', attr: { style: 'color: var(--text-normal); margin-top: 16px;' } });
            const mappingList = this.fieldMappingEl.createDiv({ cls: 'mapping-list', attr: { style: 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 8px;' } });
            
            this.noteTypeFields.forEach(field => {
                const mappingItem = mappingList.createDiv({ 
                    cls: 'mapping-item',
                    attr: { style: 'padding: 6px 10px; background: var(--background-secondary); border-radius: 4px; font-size: 12px; color: var(--text-muted);' }
                });
                const mapped = this.fieldMapping[field] ? '✅' : '❌';
                const status = this.fieldMapping[field] ? '<span style="color: var(--text-success);">Mapped</span>' : '<span style="color: var(--text-error);">Not mapped</span>';
                mappingItem.innerHTML = `${mapped} <strong style="color: var(--text-normal);">${field}</strong>: ${status}`;
            });
            
        } catch (error) {
            console.error('Field mapping error:', error);
        }
    }
    
    updatePreview() {
        this.previewEl.empty();
        this.previewEl.createEl('h3', { text: '👁️ Card Preview' });
        this.previewEl.createEl('p', { text: `Deck: ${this.selectedDeck}`, cls: 'preview-deck-name' });
        this.previewEl.createEl('p', { text: `Note Type: ${this.selectedNoteType}`, cls: 'preview-note-type' });
        
        const previewCard = this.previewEl.createDiv({ cls: 'preview-card' });
        previewCard.createEl('h4', { text: this.fields.Word || 'N/A' });
        previewCard.createEl('p', { text: this.fields.Definition || 'N/A', cls: 'preview-definition' });
        previewCard.createEl('p', { text: `Vietnamese: ${this.fields.Vietnamese || 'N/A'}`, cls: 'preview-vietnamese' });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// ==================== DUPLICATE HANDLING MODAL ====================

class DuplicateModal extends Modal {
    constructor(app, word, existingNote, onOverwrite, onCancel) {
        super(app);
        this.word = word;
        this.existingNote = existingNote;
        this.onOverwrite = onOverwrite;
        this.onCancel = onCancel;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('duplicate-modal');
        
        // Title
        const title = contentEl.createEl('h2');
        title.createSpan({ text: '⚠️ Duplicate Card Found' });
        
        // Warning
        const warningBox = contentEl.createDiv({ cls: 'duplicate-warning' });
        warningBox.createEl('p', { text: `A card for "${this.word}" already exists in this deck.` });
        warningBox.createEl('p', { text: 'Do you want to overwrite it or cancel?' });
        
        const existingCard = warningBox.createDiv({ cls: 'existing-card' });
        existingCard.setText(`Current definition: ${this.existingNote.fields.Definition?.value || 'N/A'}`);
        
        // Buttons
        const buttonsDiv = contentEl.createDiv({ cls: 'duplicate-modal-buttons' });
        
        const overwriteBtn = buttonsDiv.createEl('button', { text: '✓ OVERWRITE', cls: 'btn-overwrite' });
        overwriteBtn.addEventListener('click', () => {
            this.onOverwrite();
            this.close();
        });
        
        const cancelBtn = buttonsDiv.createEl('button', { text: '✕ CANCEL', cls: 'btn-cancel-duplicate' });
        cancelBtn.addEventListener('click', () => {
            this.onCancel();
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// ==================== ENGLISH TUTOR CHATBOT ====================

class EnglishTutorChatbot {
    constructor(containerEl, aiService, wordContext, onClose, isInline = false) {
        this.containerEl = containerEl;
        this.aiService = aiService;
        this.wordContext = wordContext;
        this.onClose = onClose;
        this.isInline = isInline; // NEW: inline vs floating mode
        this.history = [];
        this.isLoading = false;
        this.render();
    }

    render() {
        this.containerEl.empty();
        
        if (this.isInline) {
            // INLINE MODE: embedded below action buttons
            this.containerEl.addClass('chatbot-inline');
        } else {
            // FLOATING MODE: fixed position (legacy)
            this.containerEl.addClass('chatbot-fixed');
            this.containerEl.style.position = 'fixed';
            this.containerEl.style.bottom = '20px';
            this.containerEl.style.right = '20px';
            this.containerEl.style.width = '500px';
            this.containerEl.style.zIndex = '1000';
        }
        
        // Header with close button (NO drag in inline mode)
        const header = this.containerEl.createDiv({ cls: 'chatbot-header' });
        header.createEl('h3', { text: '💬 English Tutor' });
        header.createSpan({ text: `Learning: "${this.wordContext}"`, cls: 'chatbot-context' });
        
        const closeBtn = header.createEl('button', { text: '✕', cls: 'chatbot-close-btn' });
        closeBtn.addEventListener('click', () => {
            // Remove container completely
            this.containerEl.remove();
            if (this.onClose) this.onClose();
        });
        
        // Messages
        this.messagesEl = this.containerEl.createDiv({ cls: 'chatbot-messages' });
        this.messagesEl.style.flex = '1';
        this.messagesEl.style.overflowY = 'auto';
        this.messagesEl.style.padding = '16px';
        this.renderMessages();
        
        // Input (textarea for multi-line)
        const inputContainer = this.containerEl.createDiv({ cls: 'chatbot-input-container' });
        inputContainer.style.flexShrink = '0';
        inputContainer.style.borderTop = '1px solid var(--background-modifier-border)';
        inputContainer.style.padding = '12px';
        inputContainer.style.display = 'flex';
        inputContainer.style.gap = '8px';
        
        this.inputEl = inputContainer.createEl('textarea', {
            cls: 'chatbot-input',
            attr: { 
                placeholder: 'Ask me anything... (Shift+Enter for new line, Enter to send)',
                rows: '2'
            }
        });
        
        const sendBtn = inputContainer.createEl('button', {
            text: 'Send',
            cls: 'chatbot-send-btn'
        });
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        this.inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    formatAIResponse(text) {
        // Keep text plain and selectable, only basic formatting
        return text
            .replace(/\n/g, '<br>')
            .trim();
    }

    renderMessages() {
        this.messagesEl.empty();
        
        if (this.history.length === 0) {
            const welcomeMsg = this.messagesEl.createDiv({ cls: 'chat-message assistant' });
            const avatar = welcomeMsg.createDiv({ cls: 'chat-avatar', text: '💬' });
            const bubble = welcomeMsg.createDiv({ cls: 'message-bubble' });
            bubble.style.userSelect = 'text';
            bubble.style.cursor = 'text';
            bubble.innerHTML = `Hi! I'm your English tutor. Ask me anything about "${this.wordContext}"!`;
        } else {
            this.history.forEach(msg => {
                const msgEl = this.messagesEl.createDiv({ cls: `chat-message ${msg.role}` });
                
                if (msg.role === 'assistant') {
                    const avatar = msgEl.createDiv({ cls: 'chat-avatar', text: '💬' });
                }
                
                const bubble = msgEl.createDiv({ cls: 'message-bubble' });
                bubble.style.userSelect = 'text';
                bubble.style.cursor = 'text';
                
                if (msg.role === 'assistant') {
                    bubble.innerHTML = this.formatAIResponse(msg.content);
                } else {
                    bubble.setText(msg.content);
                }
            });
        }
        
        // Show loading indicator if waiting for response
        if (this.isLoading) {
            const loadingMsg = this.messagesEl.createDiv({ cls: 'chat-message assistant' });
            const avatar = loadingMsg.createDiv({ cls: 'chat-avatar', text: '💬' });
            const bubble = loadingMsg.createDiv({ cls: 'message-bubble loading' });
            bubble.setText('💭 Thinking...');
        }
        
        // Scroll to bottom
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }

    async sendMessage() {
        const message = this.inputEl.value.trim();
        if (!message || this.isLoading) return;
        
        // Add user message
        this.history.push({ role: 'user', content: message });
        this.inputEl.value = '';
        this.isLoading = true;
        this.renderMessages();
        
        // Get AI response
        try {
            const response = await this.aiService.chat(message, this.wordContext, this.history);
            this.history.push({ role: 'assistant', content: response });
        } catch (error) {
            console.error('Chatbot error:', error);
            this.history.push({ 
                role: 'assistant', 
                content: `❌ **Error:** ${error.message || 'Sorry, I encountered an error. Please try again.'}` 
            });
        } finally {
            this.isLoading = false;
            this.renderMessages();
        }
    }
}

// ==================== DICTIONARY VIEW ====================

class DictionaryView {
    constructor(containerEl, plugin) {
        this.containerEl = containerEl;
        this.plugin = plugin;
        this.aiService = new AIService(plugin.settings.groqApiKey, plugin.settings.groqModel);
        this.audioService = new AudioService(plugin.settings.vercelBackendUrl);
        this.ankiService = new AnkiService(plugin.settings.ankiConnectUrl);
        
        this.currentWord = null;
        this.currentData = null;
        this.currentNotePath = null;
        this.workflowState = {
            saved: false,
            chatted: false,
            exported: false
        };
        
        this.render();
    }

    render() {
        this.containerEl.empty();
        this.containerEl.addClass('llm-dictionary-view');
        
        const content = this.containerEl.createDiv({ cls: 'dictionary-view-content' });
        
        // Search Container
        const searchContainer = content.createDiv({ cls: 'search-container' });
        
        this.inputEl = searchContainer.createEl('input', {
            type: 'text',
            cls: 'lookup-term-input',
            attr: { placeholder: 'Enter a word to look up...' }
        });
        
        const lookupBtn = searchContainer.createEl('button', { cls: 'lookup-btn' });
        lookupBtn.createSpan({ text: '🔍', cls: 'btn-icon' });
        lookupBtn.createSpan({ text: 'Lookup', cls: 'btn-text' });
        
        lookupBtn.addEventListener('click', () => this.lookupWord());
        this.inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.lookupWord();
        });
        
        // Result Container
        this.resultEl = content.createDiv({ cls: 'dictionary-result' });
        this.showWelcomeMessage();
    }

    showWelcomeMessage() {
        this.resultEl.empty();
        const welcome = this.resultEl.createDiv({ cls: 'lookup-info' });
        welcome.createEl('h3', { text: '👋 Welcome to English Dictionary Pro v2!' });
        welcome.createEl('p', { text: 'Enter a word above to get started.' });
        welcome.createEl('p', { text: 'Features: AI-powered definitions, smart Anki export, chatbot tutor, and more!' });
        welcome.createEl('p', { text: '💡 Tip: Select any text (even in PDF) and press Alt+D for quick translation!' });
    }
    
    showTranslation(originalText, translation) {
        this.resultEl.empty();
        
        // Translation mode - minimal display (Vietnamese first, then Original)
        const translationCard = this.resultEl.createDiv({ cls: 'translation-card' });
        
        // Vietnamese translation section (FIRST - most important)
        const vietnameseSection = translationCard.createDiv({ cls: 'translation-section' });
        vietnameseSection.createEl('h3', { text: '🇻🇳 Vietnamese' });
        const vietnameseBox = vietnameseSection.createDiv({ cls: 'translation-box vietnamese-box' });
        vietnameseBox.setText(translation);
        
        // Original text section (SECOND - for context)
        const originalSection = translationCard.createDiv({ cls: 'translation-section' });
        originalSection.createEl('h3', { text: '� Context' });
        const originalBox = originalSection.createDiv({ cls: 'translation-box original-box' });
        originalBox.setText(originalText);
    }

    showLoading() {
        this.resultEl.empty();
        const loading = this.resultEl.createDiv({ cls: 'lookup-loading' });
        loading.createEl('div', { text: '⏳', cls: 'loading-icon', attr: { style: 'font-size: 48px;' } });
        loading.createEl('p', { text: 'Looking up word...', cls: 'loading-text' });
        
        const steps = loading.createDiv({ cls: 'loading-steps' });
        steps.createDiv({ text: 'Fetching', cls: 'step active' });
        steps.createDiv({ text: 'Analyzing', cls: 'step' });
        steps.createDiv({ text: 'Formatting', cls: 'step' });
    }

    showError(message) {
        this.resultEl.empty();
        const error = this.resultEl.createDiv({ cls: 'lookup-error' });
        error.createEl('div', { text: '❌', cls: 'error-icon' });
        const errorMsg = error.createDiv({ cls: 'error-message' });
        errorMsg.createEl('h3', { text: 'Lookup Failed' });
        errorMsg.createEl('p', { text: message });
        
        const retryBtn = error.createEl('button', { text: 'Try Again', cls: 'retry-btn' });
        retryBtn.addEventListener('click', () => this.lookupWord());
    }

    async lookupWord() {
        let word = this.inputEl.value.trim();
        if (!word) {
            new Notice('Please enter a word');
            return;
        }
        
        // Lemmatization
        if (this.plugin.settings.enableLemmatization) {
            const lemma = simpleLemmatize(word);
            if (lemma !== word.toLowerCase()) {
                new Notice(`Lemmatized: "${word}" → "${lemma}"`);
                word = lemma;
                this.inputEl.value = lemma;
            }
        }
        
        this.currentWord = word;
        this.showLoading();
        
        try {
            // 🚀 PARALLEL EXECUTION: AI + Audio cùng lúc (không chờ nhau)
            const [data, audioData] = await Promise.all([
                this.aiService.generateDefinition(word),
                this.audioService.getCambridgeAudio(word)
            ]);
            
            this.currentData = data;
            
            // Handle audio result
            if (!audioData) {
                // Fallback to Google TTS
                console.log('⚠️ Cambridge audio not found, using Google TTS fallback');
                const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=en&client=tw-ob`;
                this.currentData.audio = {
                    url: googleTtsUrl,
                    accent: 'Google TTS',
                    source: 'Google'
                };
            } else {
                this.currentData.audio = audioData; // Single object, not array
            }
            
            // Reset workflow
            this.workflowState = { saved: false, chatted: false, exported: false };
            
            // Render result
            this.renderResult();
            
        } catch (error) {
            console.error('Lookup error:', error);
            
            // Provide specific error messages
            let errorMsg = 'An error occurred during lookup';
            const errStr = error.message || error.toString();
            
            if (errStr.includes('fetch') || errStr.includes('network') || errStr.includes('Failed to fetch')) {
                errorMsg = '🌐 Network error. Check your internet connection.';
            } else if (errStr.includes('API') || errStr.includes('401') || errStr.includes('403')) {
                errorMsg = '🤖 AI service error. Check your Groq API key in settings.';
            } else if (errStr.includes('timeout')) {
                errorMsg = '⏱️ Request timeout. Try again or check backend service.';
            } else if (error.message) {
                errorMsg = error.message;
            }
            
            this.showError(errorMsg);
        }
    }

    renderResult() {
        console.log('🔍 renderResult() called');
        this.resultEl.empty();
        
        // Note: workflowState already reset in lookupWord()
        // Reset container references for fresh rendering
        this.workflowContainerEl = null;
        this.workflowStepsEl = null;
        this.actionButtonsEl = null;
        
        const data = this.currentData;
        console.log('📊 Current data:', data);
        
        // Dictionary Entry
        const entry = this.resultEl.createDiv({ cls: 'dictionary-entry' });
        
        // Word Header
        const header = entry.createDiv({ cls: 'word-header' });
        header.createEl('h1', { text: data.word, cls: 'word-term' });
        if (data.wordType) {
            header.createSpan({ text: data.wordType, cls: 'word-type' });
        }
        
        // Pronunciation
        if (data.pronunciation || data.audio) {
            const pronDiv = entry.createDiv({ cls: 'pronunciation' });
            
            if (data.pronunciation) {
                pronDiv.createSpan({ text: data.pronunciation, cls: 'ipa' });
            }
            
            // Single audio button (UK accent)
            if (data.audio && data.audio.url) {
                const audioBtn = pronDiv.createEl('button', {
                    text: `🔊 ${data.audio.accent}`,
                    cls: 'audio-btn'
                });
                
                audioBtn.addEventListener('click', () => {
                    // Both Google TTS and Cambridge need proxy for CORS bypass
                    const proxyUrl = this.audioService.getProxyUrl(data.audio.url);
                    const audioEl = new Audio(proxyUrl);
                    audioEl.play().catch(err => {
                        console.error('Audio playback failed:', err);
                        new Notice('⚠️ Audio playback failed. Check backend connection.');
                    });
                });
            }
        }
        
        // Definition
        if (data.definition) {
            const defSection = entry.createDiv({ cls: 'definition-section' });
            defSection.createEl('h4', { text: 'Definition' });
            defSection.createEl('p', { text: data.definition });
        }
        
        // Vietnamese Translation
        if (data.vietnamese) {
            const vnSection = entry.createDiv({ cls: 'vietnamese-section' });
            vnSection.createEl('h4', { text: 'Vietnamese' });
            vnSection.createEl('p', { text: data.vietnamese });
        }
        
        // Examples
        if (data.examples && data.examples.length > 0) {
            const exSection = entry.createDiv({ cls: 'examples' });
            exSection.createEl('h4', { text: 'Examples' });
            const exList = exSection.createDiv({ cls: 'example-list' });
            data.examples.forEach(ex => {
                exList.createDiv({ text: ex, cls: 'example-item' });
            });
        }
        
        // Synonyms
        if (data.synonyms && data.synonyms.length > 0) {
            const synSection = entry.createDiv({ cls: 'synonyms' });
            synSection.createEl('h4', { text: 'Synonyms' });
            synSection.createEl('p', { text: data.synonyms.join(', ') });
        }
        
        // Antonyms
        if (data.antonyms && data.antonyms.length > 0) {
            const antSection = entry.createDiv({ cls: 'antonyms' });
            antSection.createEl('h4', { text: 'Antonyms' });
            antSection.createEl('p', { text: data.antonyms.join(', ') });
        }
        
        // Collocations (with usage examples)
        if (data.collocations && data.collocations.length > 0) {
            const collSection = entry.createDiv({ cls: 'collocations' });
            collSection.createEl('h4', { text: 'Collocations' });
            const collList = collSection.createDiv({ cls: 'collocation-list' });
            
            data.collocations.forEach(coll => {
                const collItem = collList.createDiv({ cls: 'collocation-item' });
                
                if (typeof coll === 'object' && coll.phrase) {
                    collItem.createEl('strong', { text: coll.phrase });
                    if (coll.usage) {
                        collItem.createEl('p', { text: coll.usage, cls: 'collocation-usage' });
                    }
                } else {
                    // Fallback for string format
                    collItem.createEl('p', { text: coll });
                }
            });
        }
        
        // Word Family (with Vietnamese meanings)
        if (data.wordFamily && data.wordFamily.length > 0) {
            const wfSection = entry.createDiv({ cls: 'word-family' });
            wfSection.createEl('h4', { text: 'Word Family' });
            const wfList = wfSection.createDiv({ cls: 'word-family-list' });
            
            data.wordFamily.forEach(item => {
                const wfItem = wfList.createDiv({ cls: 'word-family-item' });
                
                if (typeof item === 'object' && item.word) {
                    const wordSpan = wfItem.createEl('strong', { text: item.word });
                    if (item.type) {
                        wfItem.appendText(` (${item.type})`);
                    }
                    if (item.vietnamese) {
                        wfItem.createEl('span', { text: ` - ${item.vietnamese}`, cls: 'word-family-vietnamese' });
                    }
                } else {
                    // Fallback for string format
                    wfItem.createEl('p', { text: `• ${item}` });
                }
            });
        }
        
        // Phrasal Verbs
        if (data.phrasalVerbs && data.phrasalVerbs.length > 0) {
            const pvSection = entry.createDiv({ cls: 'phrasal-verbs' });
            pvSection.createEl('h4', { text: 'Phrasal Verbs' });
            pvSection.createEl('p', { text: data.phrasalVerbs.join(', ') });
        }
        
        // Nuance
        if (data.nuance) {
            const nuanceSection = entry.createDiv({ cls: 'nuance' });
            nuanceSection.createEl('h4', { text: 'Usage Notes' });
            nuanceSection.createEl('p', { text: data.nuance });
        }
        
        // Common Mistakes
        if (data.commonMistakes && data.commonMistakes.length > 0) {
            const mistakesSection = entry.createDiv({ cls: 'common-mistakes' });
            mistakesSection.createEl('h4', { text: '⚠️ Common Mistakes' });
            const mistakesList = mistakesSection.createDiv({ cls: 'mistakes-list' });
            data.commonMistakes.forEach(mistake => {
                mistakesList.createDiv({ text: `• ${mistake}`, cls: 'mistake-item' });
            });
        }
        
        // Workflow Steps & Action Buttons (create once, update state)
        if (!this.workflowContainerEl) {
            this.workflowContainerEl = this.resultEl.createDiv({ cls: 'workflow-container' });
            this.workflowStepsEl = this.workflowContainerEl.createDiv({ cls: 'workflow-steps' });
            this.actionButtonsEl = this.workflowContainerEl.createDiv({ cls: 'action-buttons' });
        }
        this.updateWorkflowUI();
    }

    updateWorkflowUI() {
        // Update workflow steps
        this.workflowStepsEl.empty();
        
        const step1 = this.workflowStepsEl.createDiv({ cls: `workflow-step ${this.workflowState.saved ? 'completed' : 'active'}` });
        step1.createDiv({ text: '1', cls: 'step-circle' });
        step1.createDiv({ text: 'Save to Note', cls: 'step-label' });
        
        const step2 = this.workflowStepsEl.createDiv({ cls: `workflow-step ${this.workflowState.chatted ? 'completed' : this.workflowState.saved ? 'active' : ''}` });
        step2.createDiv({ text: '2', cls: 'step-circle' });
        step2.createDiv({ text: 'Chat with AI', cls: 'step-label' });
        
        const step3 = this.workflowStepsEl.createDiv({ cls: `workflow-step ${this.workflowState.exported ? 'completed' : (this.workflowState.saved && this.workflowState.chatted) ? 'active' : ''}` });
        step3.createDiv({ text: '3', cls: 'step-circle' });
        step3.createDiv({ text: 'Export to Anki', cls: 'step-label' });
        
        // Update action buttons
        this.actionButtonsEl.empty();
        
        const saveBtn = this.actionButtonsEl.createEl('button', { text: '💾 Save to Note', cls: 'action-btn action-btn-save' });
        saveBtn.disabled = this.workflowState.saved;
        saveBtn.addEventListener('click', () => this.saveToNote());
        
        const chatBtn = this.actionButtonsEl.createEl('button', { text: '💬 Chat with Tutor', cls: 'action-btn action-btn-chat' });
        chatBtn.disabled = !this.workflowState.saved;
        chatBtn.addEventListener('click', () => this.openChatbot());
        
        const exportBtn = this.actionButtonsEl.createEl('button', { text: '📤 Export to Anki', cls: 'action-btn action-btn-export' });
        exportBtn.disabled = !this.workflowState.saved;
        exportBtn.addEventListener('click', () => this.exportToAnki());
    }

    async saveToNote() {
        try {
            const folderPath = this.plugin.settings.folderPath;
            const fileName = `${this.currentWord}.md`;
            const filePath = `${folderPath}/${fileName}`;
            
            // Create folder if not exists
            const folder = this.plugin.app.vault.getAbstractFileByPath(folderPath);
            if (!folder) {
                await this.plugin.app.vault.createFolder(folderPath);
            }
            
            // Download audio if available
            if (this.currentData.audio && this.currentData.audio.url) {
                const audioEmbed = await this.audioService.downloadAudio(
                    this.currentData.audio.url,
                    this.currentWord,
                    this.plugin.app.vault,
                    this.ankiService
                );
                this.currentData.audioEmbed = audioEmbed;
            }
            
            // Generate note content
            const content = this.generateNoteContent(this.currentData);
            
            // Check if file exists
            const existingFile = this.plugin.app.vault.getAbstractFileByPath(filePath);
            if (existingFile) {
                // Overwrite
                await this.plugin.app.vault.modify(existingFile, content);
            } else {
                // Create new
                await this.plugin.app.vault.create(filePath, content);
            }
            
            this.currentNotePath = filePath;
            this.workflowState.saved = true;
            
            // Update UI
            this.updateWorkflowUI();
            
            new Notice(`✅ Saved to ${filePath}`);
            
            // Auto-open note with smart panel priority:
            // 1. If a markdown panel already exists → reuse it
            // 2. If no panel exists → split LEFT of Dictionary view
            const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
            if (file) {
                const workspace = this.plugin.app.workspace;
                const dictLeaves = workspace.getLeavesOfType('llm-dictionary-view');
                
                // Find existing markdown leaves that have files open
                const existingMarkdownLeaves = [];
                workspace.iterateAllLeaves(leaf => {
                    if (leaf.view.getViewType() === 'markdown' && leaf.view.file) {
                        existingMarkdownLeaves.push(leaf);
                    }
                });
                
                let targetLeaf = null;
                
                if (existingMarkdownLeaves.length > 0) {
                    // Reuse existing markdown panel
                    targetLeaf = existingMarkdownLeaves[0];
                    await targetLeaf.openFile(file);
                } else {
                    // No existing panel - create split LEFT of Dictionary
                    if (dictLeaves.length > 0) {
                        const dictLeaf = dictLeaves[0];
                        // Get parent split container
                        const parentSplit = dictLeaf.parent;
                        
                        if (parentSplit && parentSplit.split) {
                            // Create new leaf in parent split, insert before Dictionary
                            const direction = parentSplit.direction;
                            
                            // Create a new split with Dictionary
                            targetLeaf = workspace.createLeafBySplit(dictLeaf, direction === 'vertical' ? 'vertical' : 'horizontal', true);
                            
                            // Open file in new leaf
                            await targetLeaf.openFile(file);
                        } else {
                            // Fallback: use getMostRecentLeaf and split from there
                            const activeLeaf = workspace.getMostRecentLeaf();
                            if (activeLeaf) {
                                targetLeaf = workspace.createLeafBySplit(activeLeaf, 'vertical', true);
                                await targetLeaf.openFile(file);
                            } else {
                                const leaf = workspace.getLeaf(true);
                                await leaf.openFile(file);
                            }
                        }
                    } else {
                        // No Dictionary leaf - just create new leaf
                        const leaf = workspace.getLeaf(true);
                        await leaf.openFile(file);
                    }
                }
                
                // Focus back to Dictionary view
                if (dictLeaves.length > 0) {
                    workspace.setActiveLeaf(dictLeaves[0], { focus: true });
                }
            }
            
        } catch (error) {
            console.error('Save error:', error);
            new Notice('❌ Failed to save note');
        }
    }

    generateNoteContent(data) {
        let content = `# ${data.word}\n\n`;
        
        // Metadata
        content += `**Type:** ${data.wordType || 'N/A'}\n`;
        content += `**Pronunciation:** ${data.pronunciation || 'N/A'}\n`;
        
        // Audio (already in [sound:filename.mp3] format from downloadAudio)
        if (data.audioEmbed) {
            content += `**Audio:** ${data.audioEmbed}\n`;
        } else if (data.audio && data.audio.url) {
            content += `**Audio:** [${data.audio.accent}](${data.audio.url})\n`;
        }
        content += `\n`;
        
        // Definition
        content += `## Definition\n${data.definition || 'N/A'}\n\n`;
        
        // Vietnamese
        content += `## Vietnamese\n${data.vietnamese || 'N/A'}\n\n`;
        
        // Examples
        if (data.examples && data.examples.length > 0) {
            content += `## Examples\n`;
            data.examples.forEach((ex, i) => {
                content += `${i + 1}. ${ex}\n`;
            });
            content += `\n`;
        }
        
        // Synonyms
        if (data.synonyms && data.synonyms.length > 0) {
            content += `## Synonyms\n${data.synonyms.join(', ')}\n\n`;
        }
        
        // Antonyms
        if (data.antonyms && data.antonyms.length > 0) {
            content += `## Antonyms\n${data.antonyms.join(', ')}\n\n`;
        }
        
        // Collocations (with usage examples)
        if (data.collocations && data.collocations.length > 0) {
            content += `## Collocations\n`;
            data.collocations.forEach(coll => {
                if (typeof coll === 'object' && coll.phrase) {
                    content += `- ${coll.phrase}: ${coll.usage || 'No usage example'}\n`;
                } else {
                    content += `- ${coll}\n`;
                }
            });
            content += `\n`;
        }
        
        // Word Family (with Vietnamese meanings)
        if (data.wordFamily && data.wordFamily.length > 0) {
            content += `## Word Family\n`;
            data.wordFamily.forEach(item => {
                if (typeof item === 'object' && item.word) {
                    content += `- ${item.word} (${item.type || 'n/a'}): ${item.vietnamese || 'N/A'}\n`;
                } else {
                    content += `- ${item}\n`;
                }
            });
            content += `\n`;
        }
        
        // Nuance
        if (data.nuance) {
            content += `## Usage Notes\n${data.nuance}\n\n`;
        }
        
        // Common Mistakes
        if (data.commonMistakes && data.commonMistakes.length > 0) {
            content += `## Common Mistakes\n`;
            data.commonMistakes.forEach(mistake => {
                content += `- ${mistake}\n`;
            });
            content += `\n`;
        }
        
        // Personal Note (empty for user to fill)
        content += `## Personal Note\n\n_(Add your own notes, context, or memory tricks here)_\n\n`;
        
        return content;
    }

    openChatbot() {
        // Toggle chatbot visibility
        if (this.chatbotEl && this.chatbot) {
            // Close chatbot
            this.chatbotEl.remove();
            this.chatbotEl = null;
            this.chatbot = null;
            return;
        }
        
        // Create inline chatbot below workflow container
        this.chatbotEl = this.resultEl.createDiv({ cls: 'chatbot-inline-container' });
        
        // Create new chatbot instance (inline mode)
        this.chatbot = new EnglishTutorChatbot(
            this.chatbotEl,
            this.aiService,
            this.currentWord,
            () => {
                // Close callback
                if (this.chatbotEl) {
                    this.chatbotEl.remove();
                }
                this.chatbotEl = null;
                this.chatbot = null;
            },
            true // inline mode flag
        );
        
        this.workflowState.chatted = true;
        this.updateWorkflowUI();
        
        // Scroll to chatbot
        setTimeout(() => {
            this.chatbotEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    async exportToAnki() {
        try {
            // Read note content from file (user may have edited it)
            const file = this.plugin.app.vault.getAbstractFileByPath(this.currentNotePath);
            if (!file) {
                new Notice('❌ Note file not found. Please save first.');
                return;
            }
            
            const noteContent = await this.plugin.app.vault.read(file);
            const fields = this.parseNoteToFields(noteContent);
            console.log('🔍 [exportToAnki] All parsed fields:', Object.keys(fields));
            console.log('🔍 [exportToAnki] WordFamily field value:', fields.WordFamily?.substring(0, 200));
            
            // Fetch ALL deck names and note types from Anki FIRST
            const allDecks = await this.ankiService.getDeckNames();
            const noteTypes = await this.ankiService.getModelNames();
            
            // Get AI deck suggestion BASED ON USER'S ACTUAL DECKS
            new Notice('🤖 Analyzing your decks...');
            const deckSuggestion = await this.aiService.suggestAnkiDeck(
                this.currentWord,
                fields.Definition,
                allDecks // Pass user's actual decks
            );
            
            // Show deck selection modal with ALL decks + note types + AI suggestion + preview
            new DeckSelectionModal(
                this.plugin.app,
                deckSuggestion,
                allDecks,
                this.plugin.settings.recentDecks,
                fields, // Pass fields for preview
                noteTypes, // Pass note types
                this.ankiService, // Pass service for field fetching
                async (selectedDeck, selectedNoteType, fieldMapping) => {
                    await this.exportWithDeck(selectedDeck, selectedNoteType, fieldMapping);
                }
            ).open();
            
        } catch (error) {
            console.error('Export error:', error);
            new Notice('❌ Export failed: ' + error.message);
        }
    }

    async exportWithDeck(deckName, noteType, fieldMapping) {
        try {
            // Check duplicate
            const duplicates = await this.ankiService.checkDuplicate(deckName, fieldMapping.Word || fieldMapping.Front);
            
            if (duplicates.length > 0) {
                const existingNote = await this.ankiService.getNote(duplicates[0]);
                
                // Show duplicate modal
                new DuplicateModal(
                    this.plugin.app,
                    fieldMapping.Word || fieldMapping.Front,
                    existingNote,
                    async () => {
                        // Overwrite
                        await this.ankiService.updateNote(duplicates[0], fieldMapping);
                        this.onExportSuccess(deckName);
                    },
                    () => {
                        // Cancel
                        new Notice('Export cancelled');
                    }
                ).open();
                
            } else {
                // Create deck if not exists
                await this.ankiService.createDeck(deckName);
                
                // Add new note with selected note type and field mapping
                console.log('🔍 [exportWithDeck] Sending to Anki - fields:', Object.keys(fieldMapping));
                console.log('🔍 [exportWithDeck] WordFamily value being sent:', fieldMapping.WordFamily?.substring(0, 200));
                await this.ankiService.addNote({
                    deckName: deckName,
                    modelName: noteType,
                    fields: fieldMapping,
                    tags: ['english-dictionary-pro', 'vocabulary']
                });
                
                this.onExportSuccess(deckName);
            }
            
        } catch (error) {
            console.error('Export error:', error);
            new Notice('❌ Export failed: ' + error.message);
        }
    }

    onExportSuccess(deckName) {
        this.workflowState.exported = true;
        this.updateWorkflowUI();
        
        // Save to recent decks
        if (!this.plugin.settings.recentDecks.includes(deckName)) {
            this.plugin.settings.recentDecks.unshift(deckName);
            this.plugin.settings.recentDecks = this.plugin.settings.recentDecks.slice(0, 10);
            this.plugin.saveSettings();
        }
        
        new Notice(`✅ Exported to ${deckName}!`);
    }

    /**
     * Parse note markdown content to Anki fields
     * Reads from edited note, not raw AI data
     */
    parseNoteToFields(content) {
        const fields = {};
        
        // Extract word from title
        const titleMatch = content.match(/^# (.+)$/m);
        fields.Word = titleMatch ? titleMatch[1].trim() : this.currentWord;
        fields.Term = fields.Word; // Alias for compatibility
        
        // Extract metadata fields (Type, Pronunciation, Audio) - these use **Key:** format
        const typeMatch = content.match(/\*\*Type:\*\*\s*(.+)/i);
        if (typeMatch) fields.Type = typeMatch[1].trim();
        
        const ipaMatch = content.match(/\*\*Pronunciation:\*\*\s*(.+)/i);
        if (ipaMatch) fields.IPA = ipaMatch[1].trim();
        
        const audioMatch = content.match(/\*\*Audio:\*\*\s*(.+)/i);
        if (audioMatch) {
            // Keep [sound:filename.mp3] format for Anki
            fields.Audio = audioMatch[1].trim();
        }
        
        // Extract sections
        const sections = content.split(/^## /m).slice(1); // Split by ## headers
        
        sections.forEach(section => {
            const lines = section.trim().split('\n');
            const header = lines[0].trim();
            const body = lines.slice(1).join('\n').trim();
            
            switch (header) {
                case 'Definition':
                    fields.Definition = body;
                    break;
                case 'Vietnamese':
                    fields.Vietnamese = body;
                    break;
                case 'Examples':
                    fields.Examples = body;
                    break;
                case 'Synonyms':
                    fields.Synonyms = body;
                    break;
                case 'Antonyms':
                    fields.Antonyms = body;
                    break;
                case 'Collocations':
                    fields.Collocations = body;
                    break;
                case 'Word Family':
                    fields.WordFamily = body;
                    console.log('🔍 [parseNoteToFields] WordFamily extracted:', body.substring(0, 200));
                    break;
                case 'Usage Notes':
                    fields.UsageNotes = body;
                    break;
                case 'Common Mistakes':
                    fields.CommonMistakes = body;
                    break;
                case 'Personal Note':
                    fields.PersonalNote = body.replace(/\(Add your own notes.*?\)/gi, '').trim();
                    break;
            }
        });
        
        return fields;
    }
    
    /**
     * Show quick translation in Dictionary view (reuses same UI)
     * Called by Alt+D command
     */
    showTranslation(originalText, vietnameseTranslation) {
        console.log('🌐 showTranslation() called');
        this.resultEl.empty();
        
        // Reset workflow state
        this.workflowState = { saved: false, chatted: false, exported: false };
        this.workflowContainerEl = null;
        this.workflowStepsEl = null;
        this.actionButtonsEl = null;
        this.chatbotEl = null;
        
        // Create translation card
        const translationCard = this.resultEl.createDiv({ cls: 'dictionary-entry translation-card' });
        
        // Header
        const header = translationCard.createDiv({ cls: 'translation-header' });
        header.createEl('h1', { text: '🌐 Quick Translation', cls: 'translation-title' });
        header.createEl('span', { text: '📑', cls: 'translation-hotkey' });
        
        // Original text section
        const originalSection = translationCard.createDiv({ cls: 'translation-section' });
        originalSection.createEl('h2', { text: '📝 Original Text' });
        const originalBox = originalSection.createDiv({ cls: 'translation-box original-box' });
        originalBox.createEl('p', { text: originalText });
        
        // Vietnamese section
        const vietnameseSection = translationCard.createDiv({ cls: 'translation-section' });
        vietnameseSection.createEl('h2', { text: '🇻🇳 Vietnamese Translation' });
        const vietnameseBox = vietnameseSection.createDiv({ cls: 'translation-box vietnamese-box' });
        vietnameseBox.createEl('p', { text: vietnameseTranslation });
        
        // Action buttons
        const actions = translationCard.createDiv({ cls: 'translation-actions' });
        
        // Copy button
        const copyBtn = actions.createEl('button', { 
            text: '📋 Copy Translation',
            cls: 'translation-btn copy-btn'
        });
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(vietnameseTranslation);
            new Notice('✅ Translation copied to clipboard!');
        });
        
        // Copy both button
        const copyBothBtn = actions.createEl('button', { 
            text: '📑 Copy Both',
            cls: 'translation-btn copy-both-btn'
        });
        copyBothBtn.addEventListener('click', () => {
            const bothText = `Original: ${originalText}\n\nVietnamese: ${vietnameseTranslation}`;
            navigator.clipboard.writeText(bothText);
            new Notice('✅ Both texts copied!');
        });
        
        // New lookup button
        const newLookupBtn = actions.createEl('button', { 
            text: '📖 Lookup Word',
            cls: 'translation-btn lookup-btn'
        });
        newLookupBtn.addEventListener('click', () => {
            this.inputEl.value = '';
            this.inputEl.focus();
        });
        
        // Scroll to top
        this.resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ==================== MAIN PLUGIN ====================

module.exports = class EnglishDictionaryProPlugin extends Plugin {
    async onload() {
        console.log('Loading English Dictionary Pro v2.0.0');
        
        // Load settings
        await this.loadSettings();
        
        // Add settings tab
        this.addSettingTab(new EnglishDictionarySettingTab(this.app, this));
        
        // Add ribbon icon
        this.addRibbonIcon('book-open', 'English Dictionary Pro', () => {
            this.activateView();
        });
        
        // Register view
        this.registerView(
            'english-dictionary-pro-view',
            (leaf) => new EnglishDictionaryProView(leaf, this)
        );
        
        // Add command to open dictionary
        this.addCommand({
            id: 'open-dictionary',
            name: 'Open Dictionary',
            callback: () => {
                this.activateView();
            }
        });
        
        // Add command to lookup selected text (works with ANY file type: PDF, docx, txt, markdown, etc.)
        this.addCommand({
            id: 'lookup-selection',
            name: 'Lookup Selected Word',
            callback: () => {
                // Get selection from ANY source (PDF, markdown, etc.)
                const selection = window.getSelection()?.toString();
                if (selection && selection.trim()) {
                    this.activateView();
                    // Wait a bit for view to load
                    setTimeout(() => {
                        const view = this.app.workspace.getLeavesOfType('english-dictionary-pro-view')[0]?.view;
                        if (view && view.dictionaryView) {
                            view.dictionaryView.inputEl.value = selection.trim();
                            view.dictionaryView.lookupWord();
                        }
                    }, 100);
                } else {
                    new Notice('❌ Please select text first');
                }
            }
        });
        
        // Add Quick Translation command (Alt+D) - Works globally (PDF, markdown, all files)
        this.addCommand({
            id: 'quick-translate',
            name: 'Quick Translate to Vietnamese',
            hotkeys: [{ modifiers: ['Alt'], key: 'd' }],
            callback: async () => {
                // Get selected text from anywhere (PDF, markdown, etc.)
                let selection = window.getSelection()?.toString().trim();
                
                // Fallback: try to get from active editor
                if (!selection) {
                    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (activeView?.editor) {
                        selection = activeView.editor.getSelection();
                    }
                }
                
                if (!selection) {
                    new Notice('❌ Please select text to translate');
                    return;
                }
                
                // Activate dictionary view
                await this.activateView();
                
                // Show loading notice
                const loadingNotice = new Notice('🔄 Translating...', 0);
                
                try {
                    // Validate API key
                    if (!this.settings.groqApiKey || this.settings.groqApiKey.trim() === '') {
                        throw new Error('API key not configured. Please add your Groq API key in settings.');
                    }
                    
                    const prompt = `Translate this English text to Vietnamese. Provide ONLY the Vietnamese translation, no explanation, no original text, just the translation:

"${selection}"`;
                    
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 20000); // 20 second timeout
                    
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.settings.groqApiKey}`
                        },
                        body: JSON.stringify({
                            model: this.settings.groqModel,
                            messages: [{ role: 'user', content: prompt }],
                            temperature: 0.3,
                            max_tokens: 1000
                        }),
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeout);
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            throw new Error('Invalid API key. Please check settings.');
                        } else if (response.status === 429) {
                            throw new Error('Rate limit exceeded. Please wait.');
                        }
                        throw new Error(`API error: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    const translation = data.choices[0].message.content.trim();
                    
                    loadingNotice.hide();
                    
                    // Display in Dictionary view
                    setTimeout(() => {
                        const view = this.app.workspace.getLeavesOfType('english-dictionary-pro-view')[0]?.view;
                        if (view && view.dictionaryView) {
                            view.dictionaryView.showTranslation(selection, translation);
                        }
                    }, 100);
                    
                } catch (error) {
                    loadingNotice.hide();
                    console.error('Translation error:', error);
                    new Notice('❌ Translation failed: ' + error.message);
                }
            }
        });
    }

    async activateView() {
        const { workspace } = this.app;
        
        let leaf = null;
        const leaves = workspace.getLeavesOfType('english-dictionary-pro-view');
        
        if (leaves.length > 0) {
            // Use existing leaf
            leaf = leaves[0];
            // Make sure it's visible and active
            workspace.revealLeaf(leaf);
            workspace.setActiveLeaf(leaf, { focus: true });
        } else {
            // Create new leaf - prefer right sidebar but don't force it
            const rightLeaves = workspace.getRightLeaf(false);
            if (rightLeaves) {
                leaf = rightLeaves;
            } else {
                // Fallback to creating in main area
                leaf = workspace.getLeaf('split', 'vertical');
            }
            
            await leaf.setViewState({
                type: 'english-dictionary-pro-view',
                active: true
            });
            
            workspace.revealLeaf(leaf);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        console.log('Unloading English Dictionary Pro v2.0.0');
    }
    
    /**
     * Check if AnkiConnect is available (non-blocking)
     */
    async checkAnkiConnect() {
        try {
            const version = await this.ankiService.invoke('version');
            console.log(`✅ AnkiConnect available (version ${version})`);
        } catch (error) {
            console.warn('⚠️ AnkiConnect not available:', error.message);
            new Notice('⚠️ Anki not detected. Make sure Anki is running with AnkiConnect addon.');
        }
    }
};

// ==================== VIEW CLASS ====================

const { ItemView } = require('obsidian');

class EnglishDictionaryProView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return 'english-dictionary-pro-view';
    }

    getDisplayText() {
        return 'English Dictionary Pro';
    }

    getIcon() {
        return 'book-open';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        
        this.dictionaryView = new DictionaryView(container, this.plugin);
    }

    async onClose() {
        // Cleanup
    }
}
