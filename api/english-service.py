from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import logging
import re
import os

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'English Dictionary Pro Backend',
        'version': '2.0.0'
    })

# ==================== CAMBRIDGE AUDIO ====================

def extract_audio_from_html(soup, host='https://dictionary.cambridge.org'):
    """
    Extract audio URLs from Cambridge HTML
    Looks for <source type="audio/mpeg"> inside .dpron-i .daud
    """
    audios_us = []
    audios_uk = []
    audios_other = []
    
    for daud in soup.select('.dpron-i .daud'):
        accent = ''
        classes = daud.get('class', [])
        if 'us' in classes:
            accent = 'US'
        elif 'uk' in classes:
            accent = 'UK'
        
        # Find <source type="audio/mpeg">
        for src_tag in daud.find_all('source', {'type': 'audio/mpeg'}):
            src = src_tag.get('src')
            if not src:
                continue
            if src.startswith('/'):
                src = host + src
            
            if accent == 'US':
                audios_us.append({'url': src, 'accent': accent})
            elif accent == 'UK':
                audios_uk.append({'url': src, 'accent': accent})
            else:
                audios_other.append({'url': src, 'accent': accent or 'AUDIO'})
    
    return audios_us + audios_uk + audios_other

def try_cambridge_direct_mp3(word):
    """
    Try multiple Cambridge direct MP3 URL patterns
    Returns dict: {'us': url, 'uk': url, ...}
    """
    w = re.sub(r'[^a-z]', '', word.lower())
    audio = {}
    
    if not w:
        return audio
    
    # Suffixes for different URL patterns
    suffixes_y = [f"y0{i:02d}" for i in range(12, 21)]
    suffixes_n = [f"n0{i:02d}" for i in range(12, 21)]
    
    def check_url(url):
        """Check if URL exists (HEAD request)"""
        try:
            r = requests.head(url, timeout=3)
            return r.status_code == 200
        except:
            return False
    
    # Pattern 0c: Short words (<=3 chars) special format
    # /media/english/us_pron/k/key/key__/key_mp3
    if len(w) <= 3:
        us_path = f"/media/english/us_pron/{w[0]}/{w[:3]}/{w[:3]}__/{w}_mp3"
        us_url = f"https://dictionary.cambridge.org{us_path}"
        if check_url(us_url):
            audio['us'] = us_url
        
        uk_path = f"/media/english/uk_pron/{w[0]}/{w[:3]}/{w[:3]}__/{w}_mp3"
        uk_url = f"https://dictionary.cambridge.org{uk_path}"
        if check_url(uk_url):
            audio['uk'] = uk_url
    
    # Pattern 0: Simple {word}.mp3
    # /media/english/us_pron/u/us/usw/uswo/uswor/{word}.mp3
    if not audio.get('us') and len(w) >= 3:
        us_path = f"/media/english/us_pron/u/us/us{w[0]}/us{w[:2]}/us{w[:3]}/{w}.mp3"
        us_url = f"https://dictionary.cambridge.org{us_path}"
        if check_url(us_url):
            audio['us'] = us_url
    
    if not audio.get('uk') and len(w) >= 3:
        uk_path = f"/media/english/uk_pron/u/uk/uk{w[0]}/uk{w[:2]}/uk{w[:3]}/{w}.mp3"
        uk_url = f"https://dictionary.cambridge.org{uk_path}"
        if check_url(uk_url):
            audio['uk'] = uk_url
    
    # Pattern 0b: {word}_{number}.mp3 (012-020)
    if not audio.get('us') and len(w) >= 3:
        for i in range(12, 21):
            us_path = f"/media/english/us_pron/u/us/us{w[0]}/us{w[:2]}/us{w[:3]}/{w}_{i:03d}.mp3"
            us_url = f"https://dictionary.cambridge.org{us_path}"
            if check_url(us_url):
                audio['us'] = us_url
                break
    
    if not audio.get('uk') and len(w) >= 3:
        for i in range(12, 21):
            uk_path = f"/media/english/uk_pron/u/uk/uk{w[0]}/uk{w[:2]}/uk{w[:3]}/{w}_{i:03d}.mp3"
            uk_url = f"https://dictionary.cambridge.org{uk_path}"
            if check_url(uk_url):
                audio['uk'] = uk_url
                break
    
    # Pattern 1: Short words {word}_mp3
    if len(w) <= 3:
        if not audio.get('us'):
            us_path = f"/media/english/us_pron/u/us/us{w[0]}/us{w[:2]}/us{w[:3]}/{w}_mp3"
            us_url = f"https://dictionary.cambridge.org{us_path}"
            if check_url(us_url):
                audio['us'] = us_url
        
        if not audio.get('uk'):
            uk_path = f"/media/english/uk_pron/u/uk/uk{w[0]}/uk{w[:2]}/uk{w[:3]}/{w}_mp3"
            uk_url = f"https://dictionary.cambridge.org{uk_path}"
            if check_url(uk_url):
                audio['uk'] = uk_url
    
    # Pattern 2: {word}__.mp3 (old format)
    if not audio.get('us') and len(w) >= 3:
        us_path = f"/media/english/us_pron/u/us/us{w[0]}/us{w[:2]}/us{w[:3]}/{w}__.mp3"
        us_url = f"https://dictionary.cambridge.org{us_path}"
        if check_url(us_url):
            audio['us'] = us_url
    
    if not audio.get('uk') and len(w) >= 3:
        uk_path = f"/media/english/uk_pron/u/uk/uk{w[0]}/uk{w[:2]}/uk{w[:3]}/{w}__.mp3"
        uk_url = f"https://dictionary.cambridge.org{uk_path}"
        if check_url(uk_url):
            audio['uk'] = uk_url
    
    # Pattern 3: {word[:5]}y0xx.mp3
    if not audio.get('us') and len(w) >= 5:
        for suf in suffixes_y:
            us_path = f"/media/english/us_pron/u/us/us{w[0]}/us{w[:2]}/us{w[:3]}/us{w[:5]}{suf}.mp3"
            us_url = f"https://dictionary.cambridge.org{us_path}"
            if check_url(us_url):
                audio['us'] = us_url
                break
    
    if not audio.get('uk') and len(w) >= 5:
        for suf in suffixes_y:
            uk_path = f"/media/english/uk_pron/u/uk/uk{w[0]}/uk{w[:2]}/uk{w[:3]}/uk{w[:5]}{suf}.mp3"
            uk_url = f"https://dictionary.cambridge.org{uk_path}"
            if check_url(uk_url):
                audio['uk'] = uk_url
                break
    
    # Pattern 4: {word[:5]}n0xx.mp3
    if not audio.get('us') and len(w) >= 5:
        for suf in suffixes_n:
            us_path = f"/media/english/us_pron/u/us/us{w[0]}/us{w[:2]}/us{w[:3]}/us{w[:5]}{suf}.mp3"
            us_url = f"https://dictionary.cambridge.org{us_path}"
            if check_url(us_url):
                audio['us'] = us_url
                break
    
    if not audio.get('uk') and len(w) >= 5:
        for suf in suffixes_n:
            uk_path = f"/media/english/uk_pron/u/uk/uk{w[0]}/uk{w[:2]}/uk{w[:3]}/uk{w[:5]}{suf}.mp3"
            uk_url = f"https://dictionary.cambridge.org{uk_path}"
            if check_url(uk_url):
                audio['uk'] = uk_url
                break
    
    return audio

@app.route('/api/cambridge-audio', methods=['GET'])
def cambridge_audio():
    """
    Fetch Cambridge audio URL for a word (UK accent ONLY) with multiple fallback strategies
    Returns: {word: str, audio_url: str, accent: str, source: str}
    """
    word = request.args.get('word')
    if not word:
        return jsonify({'error': 'Missing word parameter'}), 400
    
    logger.info(f"Fetching Cambridge audio (UK) for: {word}")
    
    try:
        # Step 1: Try to scrape from Cambridge dictionary page
        dict_url = f'https://dictionary.cambridge.org/dictionary/english/{word}'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://dictionary.cambridge.org/',
        }
        
        response = requests.get(dict_url, timeout=10, headers=headers)
        audios = []
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            audios = extract_audio_from_html(soup)
            logger.info(f"Found {len(audios)} audios from main page")
            
            # Step 2: If no audio found, try base form fallback
            if not audios:
                logger.info("No audio found, trying base form links...")
                base_link = None
                
                # Try different selectors for base form links
                selectors = [
                    'a.hw.dhw',
                    '.inf-group a',
                    '.irreg-infls a',
                    '.entry .headword a'
                ]
                
                for selector in selectors:
                    link = soup.select_one(selector)
                    if link and link.has_attr('href'):
                        base_link = link['href']
                        break
                
                if base_link:
                    if base_link.startswith('/'):
                        base_url = 'https://dictionary.cambridge.org' + base_link
                    else:
                        base_url = base_link
                    
                    try:
                        response2 = requests.get(base_url, timeout=10, headers=headers)
                        if response2.status_code == 200:
                            soup2 = BeautifulSoup(response2.text, 'html.parser')
                            audios = extract_audio_from_html(soup2)
                            logger.info(f"Found {len(audios)} audios from base form")
                    except Exception as e:
                        logger.warning(f"Base form request failed: {e}")
        
        # Step 3: If still no audio, try direct MP3 patterns
        if not audios:
            logger.info("No audio from HTML, trying direct MP3 patterns...")
            direct_audio = try_cambridge_direct_mp3(word)
            
            if direct_audio:
                # Convert dict to list format
                for accent, url in direct_audio.items():
                    audios.append({
                        'url': url,
                        'accent': accent.upper()
                    })
                
                logger.info(f"Found {len(audios)} audios from direct MP3 patterns")
        
        # Step 4: Extract UK audio ONLY (prioritize UK over US over Other)
        uk_audio = None
        us_audio = None
        other_audio = None
        
        for audio in audios:
            accent = audio.get('accent', '').upper()
            if accent == 'UK':
                uk_audio = audio['url']
                break
            elif accent == 'US' and not us_audio:
                us_audio = audio['url']
            elif not other_audio:
                other_audio = audio['url']
        
        # Priority: UK > US > Other
        final_audio_url = uk_audio or us_audio or other_audio
        final_accent = 'UK' if uk_audio else ('US' if us_audio else 'OTHER')
        source = 'cambridge_html' if audios else 'none'
        
        # Step 5: If STILL no audio, fallback to Google TTS
        if not final_audio_url:
            logger.info("No Cambridge audio found, using Google TTS fallback")
            google_tts_url = f'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q={word}'
            final_audio_url = google_tts_url
            final_accent = 'Google TTS'  # Match frontend format
            source = 'Google'  # Match frontend format
        
        logger.info(f"Returning {final_accent} audio URL for '{word}' from {source}")
        return jsonify({
            'success': True,
            'word': word,
            'audio_url': final_audio_url,
            'accent': final_accent,
            'source': source
        })
        
    except Exception as e:
        logger.error(f"Error fetching Cambridge audio: {str(e)}")
        # Fallback to Google TTS on error
        google_tts_url = f'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q={word}'
        return jsonify({
            'success': True,
            'word': word,
            'audio_url': google_tts_url,
            'accent': 'GOOGLE_TTS',
            'source': 'google_tts_fallback'
        })



# ==================== AUDIO PROXY (CORS BYPASS) ====================

@app.route('/api/audio-proxy', methods=['GET'])
def audio_proxy():
    """
    Proxy audio requests to bypass CORS
    Query params: url (required)
    """
    url = request.args.get('url')
    if not url:
        return jsonify({"error": "URL parameter required"}), 400
    
    # Security: Only allow Cambridge and Google TTS URLs
    allowed_domains = [
        'dictionary.cambridge.org',
        'translate.google.com'
    ]
    
    if not any(domain in url for domain in allowed_domains):
        return jsonify({"error": "URL not allowed"}), 403
    
    try:
        # Different headers for Google TTS vs Cambridge
        if 'translate.google.com' in url:
            # Google TTS - simple headers
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
            logger.info(f"Proxying Google TTS: {url[:100]}")
        else:
            # Cambridge - needs referer
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
                'Referer': 'https://dictionary.cambridge.org/',
            }
            logger.info(f"Proxying Cambridge audio: {url[:100]}")
        
        response = requests.get(url, headers=headers, timeout=10, stream=True)
        
        # Log response details
        logger.info(f"Response status: {response.status_code}, Content-Type: {response.headers.get('Content-Type')}")
        
        if response.status_code != 200:
            logger.error(f"Non-200 response: {response.status_code} - {response.text[:200]}")
            return jsonify({"error": f"Audio fetch failed: {response.status_code}"}), 503
        
        # Check if we got audio
        content_type = response.headers.get('Content-Type', '')
        if 'audio' not in content_type and 'mpeg' not in content_type:
            logger.error(f"Invalid content type: {content_type}")
            return jsonify({"error": "Invalid audio response"}), 503
        
        return Response(
            response.content,
            mimetype='audio/mpeg',
            headers={
                'Content-Disposition': 'attachment; filename="audio.mp3"',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400'
            }
        )
        
    except requests.exceptions.Timeout:
        logger.error("Audio proxy timeout")
        return jsonify({"error": "Request timeout"}), 408
    except requests.exceptions.RequestException as e:
        logger.error(f"Audio proxy request error: {str(e)}")
        return jsonify({"error": f"Request failed: {str(e)}"}), 503
    except Exception as e:
        logger.error(f"Audio proxy unexpected error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to fetch audio"}), 503

# ==================== ROOT ENDPOINT ====================

@app.route('/', methods=['GET'])
def index():
    """API documentation"""
    return jsonify({
        "service": "English Dictionary Pro API",
        "version": "2.0.0",
        "platform": "Vercel",
        "endpoints": {
            "health": "/api/health",
            "cambridge_audio": "/api/cambridge-audio?word=<word>",
            "audio_proxy": "/api/audio-proxy?url=<audio_url>"
        },
        "features": [
            "Cambridge Dictionary audio (US, UK) with 20+ URL patterns",
            "Base form fallback (handles inflected forms)",
            "Google TTS fallback",
            "CORS-enabled audio proxy",
            "Fast response with multiple strategies"
        ],
        "audio_patterns": [
            "HTML scraping (primary)",
            "Base form links (fallback 1)",
            "Direct MP3 URLs with 20+ patterns (fallback 2)",
            "Google TTS (fallback 3)"
        ]
    })

# ==================== VERCEL HANDLER ====================

# Vercel automatically detects Flask app
# No explicit handler needed - just export 'app'

# ==================== LOCAL DEVELOPMENT ====================

if __name__ == '__main__':
    # Local development server
    import os
    port = int(os.environ.get('PORT', 6789))
    print(f"🚀 Starting English Dictionary Pro Backend...")
    print(f"📍 Local URL: http://localhost:{port}")
    print(f"🔊 Cambridge audio: http://localhost:{port}/api/cambridge-audio?word=hello")
    print(f"🎧 Audio proxy: http://localhost:{port}/api/audio-proxy?url=...")
    print(f"⏹️  Press Ctrl+C to stop")
    try:
        app.run(host='0.0.0.0', port=port, debug=False)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")

