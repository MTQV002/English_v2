# 🎨 ANKI NOTE TYPE - MODERN BLUE THEME

## 📋 MÔ TẢ

Note Type mới với màu **xanh dương hiện đại** thay cho màu vàng sang trọng. Theme này tạo cảm hứng học tập lâu dài với:
- 🔵 **Blue gradient** (chủ đạo)
- 🟢 **Green accents** (correct feedback)
- 🔴 **Red accents** (error feedback)
- ⚪ **White/Light backgrounds** (dễ đọc)

---

## 🎯 HƯỚNG DẪN TẠO NOTE TYPE

### Bước 1: Mở Anki

1. Mở Anki Desktop
2. Click **"Tools"** → **"Manage Note Types"**
3. Click **"Add"**
4. Chọn **"Add: Basic (and reversed card)"**
5. Đặt tên: **"English Dictionary Pro - Modern Blue"**
6. Click **"OK"**

### Bước 2: Thêm Fields

1. Click **"Fields..."**
2. Thêm các fields sau (Click "Add" cho mỗi field):

```
✅ Term
✅ Type
✅ IPA
✅ Audio
✅ Definition
✅ Vietnamese
✅ Examples
✅ Synonyms
✅ Antonyms
✅ Collocations
✅ WordFamily
✅ UsageNotes
✅ CommonMistakes
✅ PersonalNote
```

3. Click **"Save"**

### Bước 3: Chỉnh sửa Cards

1. Click **"Cards..."**
2. Xóa Card 2 (vì chỉ cần 1 card type)
3. Đổi tên Card 1 thành: **"Recognition → Production"**

---

## 🎨 FRONT TEMPLATE

Copy toàn bộ code sau vào **Front Template:**

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Montserrat:wght@500;600;700;800&family=Poppins:wght@500;600;700;800&display=swap" rel="stylesheet">

<div class="anki-glass-card anki-animate-in">
  <div id="hidden-term" style="display:none;">{{Term}}</div>
  <h3 class="anki-title">
    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#3b82f6"/>
      <path d="M12 7v5l4 2" stroke="#e0f2fe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Guess the word
  </h3>
  <div class="anki-info-block anki-block-hover anki-fade-in">
    <div class="anki-info-row">
      <span class="anki-block-icon anki-gradient-green anki-icon-bounce">🌱</span>
      <span class="anki-info-label">Type:</span>
      <span class="anki-type">{{Type}}</span>
    </div>
    <div class="anki-info-row anki-pronun-row">
      <span class="anki-block-icon anki-gradient-blue anki-icon-bounce">🔊</span>
      <span class="anki-info-label">Pronunciation:</span>
      <span class="anki-ipa anki-ipa-highlight">{{IPA}}</span>
      {{#Audio}}
      <div class="anki-audio anki-audio-glow">
        <strong style="color: #3b82f6;">Listen:</strong> {{Audio}}
      </div>
      {{/Audio}}
    </div>
    <div class="anki-info-row">
      <span class="anki-block-icon anki-gradient-cyan anki-icon-bounce">📖</span>
      <span class="anki-info-label">Definition:</span>
      <span class="anki-definition">{{Definition}}</span>
    </div>
    <div class="anki-info-row">
      <span class="anki-block-icon anki-gradient-indigo anki-icon-bounce">📝</span>
      <span class="anki-info-label">First letter:</span>
      <span id="first-letter" class="anki-first-letter"></span>
    </div>
  </div>
  <div class="anki-input-row">
    <input type="text" id="word-guess" placeholder="Type your answer here..." onkeyup="checkAnswer(this.value)" autocomplete="off" autocorrect="off" spellcheck="false">
  </div>
  <div class="anki-btn-row">
    <button onclick="revealAnswer()" class="anki-btn anki-btn-animate anki-btn-glow">
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#60a5fa"/>
        <path d="M12 8v4l3 2" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Show Answer
    </button>
  </div>
  <div id="feedback" class="anki-feedback"></div>
  <div id="answer-reveal" class="anki-answer-reveal"></div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  try {
    var termElement = document.getElementById('hidden-term');
    var firstLetterElement = document.getElementById('first-letter');
    if (termElement && firstLetterElement) {
      var term = termElement.textContent.trim();
      if (term && term.length > 0) {
        firstLetterElement.textContent = term[0].toUpperCase();
      }
    }
    var input = document.getElementById('word-guess');
    if (input) input.focus();
  } catch(e) {}
});
function checkAnswer(guess) {
  try {
    var termElement = document.getElementById('hidden-term');
    var feedbackElement = document.getElementById('feedback');
    var answerReveal = document.getElementById('answer-reveal');
    if (!termElement || !feedbackElement) return;
    var term = termElement.textContent.trim().toLowerCase();
    guess = guess.toLowerCase().trim();
    answerReveal.style.display = 'none';
    if (guess === term) {
      feedbackElement.innerHTML = "✅ Correct!";
      feedbackElement.style.color = "#10b981";
      feedbackElement.classList.add('anki-feedback-correct');
    } else if (term.startsWith(guess) && guess.length > 0) {
      feedbackElement.innerHTML = "⌛ Keep going...";
      feedbackElement.style.color = "#3b82f6";
      feedbackElement.classList.remove('anki-feedback-correct');
    } else if (guess.length > 0) {
      feedbackElement.innerHTML = "❌ Try again";
      feedbackElement.style.color = "#ef4444";
      feedbackElement.classList.remove('anki-feedback-correct');
    } else {
      feedbackElement.innerHTML = "";
      feedbackElement.classList.remove('anki-feedback-correct');
    }
  } catch(e) {}
}
function revealAnswer() {
  try {
    var termElement = document.getElementById('hidden-term');
    var guessInput = document.getElementById('word-guess');
    var feedbackElement = document.getElementById('feedback');
    var answerReveal = document.getElementById('answer-reveal');
    if (termElement && guessInput && feedbackElement && answerReveal) {
      var term = termElement.textContent.trim();
      guessInput.value = term;
      feedbackElement.innerHTML = "";
      answerReveal.innerHTML = "💡 Answer: <span class='anki-reveal-term'>" + term + "</span>";
      answerReveal.style.display = 'block';
      answerReveal.classList.add('anki-reveal-animate');
      setTimeout(function() {
        answerReveal.classList.remove('anki-reveal-animate');
      }, 1200);
    }
  } catch(e) {}
}
</script>
```

---

## 🎨 BACK TEMPLATE

Copy toàn bộ code sau vào **Back Template:**

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Montserrat:wght@500;600;700;800&family=Poppins:wght@500;600;700;800&display=swap" rel="stylesheet">

<div class="anki-glass-card anki-animate-in">
  <h2 class="anki-term anki-term-glow">{{Term}}</h2>
  <div class="anki-ipa-back anki-ipa-highlight">{{IPA}}</div>
  {{#Audio}}
  <div class="anki-audio-back anki-audio-glow">
    <span class="anki-block-icon anki-gradient-blue anki-icon-bounce">🔊</span>
    <strong style="color: #3b82f6;">Audio:</strong> {{Audio}}
  </div>
  {{/Audio}}
  <span class="anki-type-back">{{Type}}</span>
  <hr class="anki-hr">

  <div class="anki-block anki-vn anki-block-hover anki-fade-in">
    <span class="anki-block-icon anki-gradient-cyan anki-icon-bounce">🇻🇳</span>
    <div>
      <div class="anki-block-title">Vietnamese</div>
      <div class="anki-block-content">{{Vietnamese}}</div>
    </div>
  </div>

  <div class="anki-block anki-def anki-block-hover anki-fade-in">
    <span class="anki-block-icon anki-gradient-green anki-icon-bounce">📖</span>
    <div>
      <div class="anki-block-title">Definition</div>
      <div class="anki-block-content" style="font-style:italic;">{{Definition}}</div>
    </div>
  </div>

  {{#Examples}}
  <div class="anki-block anki-ex anki-block-hover anki-fade-in">
    <span class="anki-block-icon anki-gradient-blue anki-icon-bounce">💡</span>
    <div>
      <div class="anki-block-title">Examples</div>
      <div class="anki-block-content examples-list">{{Examples}}</div>
    </div>
  </div>
  {{/Examples}}

  <div class="anki-flex-row">
    {{#Synonyms}}
    <div class="anki-block anki-syn anki-block-hover anki-fade-in">
      <span class="anki-block-icon anki-gradient-green anki-icon-bounce">🌱</span>
      <div>
        <div class="anki-block-title">Synonyms</div>
        <div class="anki-block-content synonyms-list">{{Synonyms}}</div>
      </div>
    </div>
    {{/Synonyms}}
    {{#Antonyms}}
    <div class="anki-block anki-ant anki-block-hover anki-fade-in">
      <span class="anki-block-icon anki-gradient-red anki-icon-bounce">🚫</span>
      <div>
        <div class="anki-block-title">Antonyms</div>
        <div class="anki-block-content antonyms-list">{{Antonyms}}</div>
      </div>
    </div>
    {{/Antonyms}}
  </div>

  {{#Collocations}}
  <div class="anki-block anki-coll anki-block-hover anki-fade-in">
    <span class="anki-block-icon anki-gradient-indigo anki-icon-bounce">🧩</span>
    <div>
      <div class="anki-block-title">Collocations</div>
      <div class="anki-block-content collocations-list">{{Collocations}}</div>
    </div>
  </div>
  {{/Collocations}}

  {{#WordFamily}}
  <div class="anki-block anki-wf anki-block-hover anki-fade-in">
    <span class="anki-block-icon anki-gradient-purple anki-icon-bounce">👨‍👩‍👧‍👦</span>
    <div>
      <div class="anki-block-title">Word Family</div>
      <div class="anki-block-content wordfamily-list">{{WordFamily}}</div>
    </div>
  </div>
  {{/WordFamily}}

  {{#UsageNotes}}
  <div class="anki-block anki-usage anki-block-hover anki-fade-in">
    <span class="anki-block-icon anki-gradient-cyan anki-icon-bounce">✨</span>
    <div>
      <div class="anki-block-title">Usage Notes</div>
      <div class="anki-block-content">{{UsageNotes}}</div>
    </div>
  </div>
  {{/UsageNotes}}

  {{#CommonMistakes}}
  <div class="anki-block anki-mistakes anki-block-hover anki-fade-in">
    <span class="anki-block-icon anki-gradient-red anki-icon-bounce">⚠️</span>
    <div>
      <div class="anki-block-title">Common Mistakes</div>
      <div class="anki-block-content">{{CommonMistakes}}</div>
    </div>
  </div>
  {{/CommonMistakes}}

  {{#PersonalNote}}
  <div class="anki-block anki-personal anki-block-hover anki-fade-in">
    <span class="anki-block-icon anki-gradient-blue anki-icon-bounce">📝</span>
    <div>
      <div class="anki-block-title">Personal Note</div>
      <div class="anki-block-content">{{PersonalNote}}</div>
    </div>
  </div>
  {{/PersonalNote}}
</div>
```

---

## 🎨 STYLING

Copy toàn bộ code sau vào **Styling:**

```css
/* ===================================================================
   ANKI NOTE TYPE - MODERN BLUE THEME
   Inspired by: Tailwind CSS + Modern Design
   Color Palette: Blue, Cyan, Green, Indigo, Purple
   =================================================================== */

body, .card {
  background: none !important;
  margin: 0;
  padding: 0;
  min-height: 100vh;
  font-family: 'Poppins', 'Montserrat', 'Inter', Arial, sans-serif;
  font-weight: 500;
  color: #1e293b;
}

.anki-glass-card {
  text-align: center;
  padding: 36px 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 255, 0.95) 100%);
  border-radius: 28px;
  margin: 32px auto;
  max-width: 700px;
  color: #1e293b;
  box-shadow: 
    0 8px 32px 0 rgba(59, 130, 246, 0.15),
    0 1.5px 8px 0 rgba(14, 165, 233, 0.1);
  border: 2.5px solid rgba(59, 130, 246, 0.3);
  position: relative;
  overflow: hidden;
  animation: anki-card-in 0.7s cubic-bezier(.68,-0.55,.27,1.55);
  backdrop-filter: blur(10px);
  transition: box-shadow 0.25s, border 0.25s;
}

.anki-glass-card:hover {
  box-shadow: 
    0 20px 60px 0 rgba(59, 130, 246, 0.25),
    0 4px 24px 0 rgba(14, 165, 233, 0.15);
  border: 2.5px solid rgba(6, 182, 212, 0.5);
}

@keyframes anki-card-in {
  0% { opacity: 0; transform: translateY(40px) scale(0.98);}
  100% { opacity: 1; transform: translateY(0) scale(1);}
}

.anki-animate-in { animation: anki-card-in 0.7s cubic-bezier(.68,-0.55,.27,1.55);}
.anki-fade-in { animation: anki-fade-in 1.2s;}
@keyframes anki-fade-in {
  from { opacity: 0; transform: translateY(20px);}
  to { opacity: 1; transform: translateY(0);}
}

.anki-title, .anki-term {
  font-family: 'Montserrat', 'Poppins', 'Inter', Arial, sans-serif;
  font-weight: 800;
  font-size: 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 28px;
  letter-spacing: 1.5px;
  text-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  animation: anki-fade-in 1.1s;
}

.anki-info-block {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 24px 20px 16px 20px;
  margin-bottom: 32px;
  text-align: left;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  border: 2.5px solid rgba(59, 130, 246, 0.2);
  animation: anki-fade-in 1.2s;
  transition: box-shadow 0.18s, transform 0.18s, border 0.18s;
}

.anki-block-hover:hover {
  box-shadow: 
    0 6px 24px 0 rgba(59, 130, 246, 0.2),
    0 0 0 2px rgba(6, 182, 212, 0.3);
  transform: scale(1.025);
  border: 2.5px solid rgba(6, 182, 212, 0.5);
  z-index: 2;
}

.anki-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.anki-info-row:last-child { margin-bottom: 0; }

.anki-block-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  min-height: 38px;
  border-radius: 10px;
  font-size: 22px;
  font-weight: 700;
  box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.15);
  transition: box-shadow 0.18s, transform 0.18s;
  text-align: center;
  user-select: none;
  border: 2px solid rgba(59, 130, 246, 0.2);
}

.anki-icon-bounce {
  animation: anki-icon-bounce 2s infinite;
}

@keyframes anki-icon-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* GRADIENT COLORS - Modern Blue Theme */
.anki-gradient-blue { 
  background: linear-gradient(135deg, #3b82f6 60%, #60a5fa 100%) !important; 
  color: #fff; 
}
.anki-gradient-cyan { 
  background: linear-gradient(135deg, #06b6d4 60%, #22d3ee 100%) !important; 
  color: #fff; 
}
.anki-gradient-green { 
  background: linear-gradient(135deg, #10b981 60%, #34d399 100%) !important; 
  color: #fff; 
}
.anki-gradient-indigo { 
  background: linear-gradient(135deg, #6366f1 60%, #818cf8 100%) !important; 
  color: #fff; 
}
.anki-gradient-purple { 
  background: linear-gradient(135deg, #8b5cf6 60%, #a78bfa 100%) !important; 
  color: #fff; 
}
.anki-gradient-teal { 
  background: linear-gradient(135deg, #14b8a6 60%, #2dd4bf 100%) !important; 
  color: #fff; 
}
.anki-gradient-red { 
  background: linear-gradient(135deg, #ef4444 60%, #f87171 100%) !important; 
  color: #fff; 
}

.anki-info-label, .anki-block-title {
  font-family: 'Montserrat', 'Poppins', 'Inter', Arial, sans-serif;
  font-weight: 700;
  font-size: 19px;
  color: #1e293b;
}

.anki-type, .anki-type-back, .anki-ipa, .anki-ipa-back, .anki-ipa-highlight {
  font-family: 'Poppins', 'Montserrat', 'Inter', Arial, sans-serif;
  font-weight: 700;
  font-size: 19px;
}

.anki-type, .anki-type-back {
  background: linear-gradient(90deg, #3b82f6, #06b6d4);
  padding: 7px 18px;
  border-radius: 22px;
  color: #fff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  display: inline-block;
  margin-bottom: 0;
  letter-spacing: 0.5px;
  transition: box-shadow 0.18s;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.anki-ipa, .anki-ipa-back {
  color: #fff;
  background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%);
  border-radius: 12px;
  padding: 4px 16px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  display: inline-block;
  border: 2px solid rgba(255, 255, 255, 0.2);
  transition: box-shadow 0.18s, background 0.18s;
}

.anki-ipa-highlight {
  background: linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%);
  color: #fff;
  box-shadow: 0 2px 12px rgba(6, 182, 212, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.anki-pronun-row {
  align-items: center;
  gap: 14px;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.08) 60%, rgba(6, 182, 212, 0.08) 100%);
  border-radius: 14px;
  padding: 8px 14px;
  margin-bottom: 20px;
  box-shadow: 0 1px 8px rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.15);
}

.anki-audio, .anki-audio-back {
  margin-top: 8px;
  padding: 9px 14px;
  background: rgba(240, 249, 255, 0.9);
  border-radius: 9px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  justify-content: flex-start;
  box-shadow: 0 1px 4px rgba(59, 130, 246, 0.1);
  color: #1e293b;
  border: 2px solid rgba(59, 130, 246, 0.2);
}

.anki-audio-glow {
  box-shadow: 
    0 0 16px 2px rgba(59, 130, 246, 0.2),
    0 2px 8px rgba(14, 165, 233, 0.15);
  animation: anki-audio-glow 2.2s infinite alternate;
}

@keyframes anki-audio-glow {
  0% { 
    box-shadow: 
      0 0 16px 2px rgba(59, 130, 246, 0.2),
      0 2px 8px rgba(14, 165, 233, 0.15);
  }
  100% { 
    box-shadow: 
      0 0 32px 6px rgba(6, 182, 212, 0.3),
      0 2px 8px rgba(14, 165, 233, 0.2);
  }
}

.anki-definition {
  font-family: 'Poppins', 'Montserrat', 'Inter', Arial, sans-serif;
  font-weight: 600;
  font-size: 18px;
  font-style: italic;
  color: #1e293b;
  line-height: 1.5;
}

.anki-first-letter {
  font-weight: bold;
  color: #3b82f6;
  font-size: 24px;
  text-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
  letter-spacing: 2px;
  animation: anki-fade-in 1.2s;
}

.anki-input-row {
  margin-bottom: 28px;
  display: flex;
  justify-content: center;
}

.anki-input-row input[type="text"] {
  width: 80%;
  padding: 17px 22px;
  border: 2.5px solid rgba(59, 130, 246, 0.3);
  border-radius: 24px;
  font-family: 'Poppins', 'Montserrat', 'Inter', Arial, sans-serif;
  font-weight: 600;
  font-size: 18px;
  text-align: center;
  background: rgba(255, 255, 255, 0.95);
  color: #1e293b;
  transition: border 0.2s, box-shadow 0.2s;
  outline: none;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.anki-input-row input[type="text"]:focus {
  border: 2.5px solid rgba(6, 182, 212, 0.5);
  box-shadow: 
    0 0 0 3px rgba(6, 182, 212, 0.15),
    0 4px 12px rgba(59, 130, 246, 0.2);
  background: #fff;
}

.anki-btn-row {
  margin-bottom: 22px;
  display: flex;
  justify-content: center;
}

.anki-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  color: #fff;
  border: none;
  padding: 13px 36px;
  border-radius: 24px;
  cursor: pointer;
  font-family: 'Poppins', 'Montserrat', 'Inter', Arial, sans-serif;
  font-weight: 700;
  font-size: 18px;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
  transition: background 0.2s, transform 0.1s, box-shadow 0.18s;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  position: relative;
  overflow: hidden;
  outline: none;
}

.anki-btn-glow {
  box-shadow: 
    0 0 16px 2px rgba(59, 130, 246, 0.3),
    0 4px 15px rgba(59, 130, 246, 0.2);
  animation: anki-btn-glow 2.2s infinite alternate;
}

@keyframes anki-btn-glow {
  0% { 
    box-shadow: 
      0 0 16px 2px rgba(59, 130, 246, 0.3),
      0 4px 15px rgba(59, 130, 246, 0.2);
  }
  100% { 
    box-shadow: 
      0 0 32px 6px rgba(6, 182, 212, 0.4),
      0 4px 15px rgba(59, 130, 246, 0.3);
  }
}

.anki-btn-animate:hover {
  background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
  transform: scale(1.06);
  box-shadow: 0 8px 32px 0 rgba(6, 182, 212, 0.4);
}

.anki-btn-animate:active::after {
  content: "";
  position: absolute;
  left: 50%; top: 50%;
  width: 120%; height: 120%;
  background: rgba(6, 182, 212, 0.5);
  border-radius: 50%;
  transform: translate(-50%,-50%) scale(0.7);
  animation: anki-btn-ripple 0.4s linear;
  pointer-events: none;
}

@keyframes anki-btn-ripple {
  0% { opacity: 1; transform: translate(-50%,-50%) scale(0.7);}
  100% { opacity: 0; transform: translate(-50%,-50%) scale(1.5);}
}

.anki-feedback {
  height: 32px;
  font-family: 'Poppins', 'Montserrat', 'Inter', Arial, sans-serif;
  font-weight: 600;
  font-size: 18px;
  margin-top: 14px;
  text-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  transition: color 0.2s;
  min-height: 1.5em;
}

.anki-feedback-correct {
  animation: anki-correct-pop 0.5s;
}

@keyframes anki-correct-pop {
  0% { transform: scale(1);}
  60% { transform: scale(1.18);}
  100% { transform: scale(1);}
}

.anki-answer-reveal {
  display: none;
  margin-top: 20px;
  font-size: 27px;
  font-weight: bold;
  color: #3b82f6;
  text-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
  letter-spacing: 1.5px;
  transition: color 0.2s;
}

.anki-reveal-term {
  color: #fff;
  background: linear-gradient(90deg, #3b82f6 30%, #06b6d4 100%);
  padding: 2px 12px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  animation: anki-reveal-term-pop 0.7s;
}

@keyframes anki-reveal-term-pop {
  0% { transform: scale(0.7);}
  60% { transform: scale(1.15);}
  100% { transform: scale(1);}
}

.anki-reveal-animate {
  animation: anki-reveal-term-pop 0.7s;
}

.anki-term-glow {
  text-shadow: 
    0 0 16px rgba(59, 130, 246, 0.2),
    0 3px 8px rgba(6, 182, 212, 0.15);
  animation: anki-term-glow 2.5s infinite alternate;
}

@keyframes anki-term-glow {
  0% { 
    text-shadow: 
      0 0 16px rgba(59, 130, 246, 0.2),
      0 3px 8px rgba(6, 182, 212, 0.15);
  }
  100% { 
    text-shadow: 
      0 0 32px rgba(6, 182, 212, 0.3),
      0 3px 8px rgba(59, 130, 246, 0.2);
  }
}

.anki-hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
  margin: 22px 0;
}

.anki-block {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  margin-bottom: 18px;
  padding: 18px 22px;
  text-align: left;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  border: 2.5px solid rgba(59, 130, 246, 0.15);
  position: relative;
  animation: anki-fade-in 1.2s;
  transition: box-shadow 0.18s, transform 0.18s, border 0.18s;
}

.anki-block-title {
  font-family: 'Montserrat', 'Poppins', 'Inter', Arial, sans-serif;
  font-weight: 700;
  font-size: 19px;
  color: #1e293b;
}

.anki-block-content {
  font-family: 'Poppins', 'Montserrat', 'Inter', Arial, sans-serif;
  font-weight: 600;
  font-size: 18px;
  margin-top: 2px;
  line-height: 1.7;
  color: #1e293b;
}

.anki-flex-row {
  display: flex;
  gap: 18px;
  margin-bottom: 18px;
  align-items: stretch;
}

.anki-syn, .anki-ant {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
}

.synonyms-list, .antonyms-list, .collocations-list, .wordfamily-list, .examples-list {
  white-space: pre-line;
  margin-top: 6px;
  font-size: 16px;
  line-height: 1.7;
}

.examples-list { font-style: italic; }
.anki-block-content b { color: #1e293b; }

::-webkit-scrollbar {
  width: 8px;
  background: rgba(240, 249, 255, 0.5);
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #3b82f6 60%, #06b6d4 100%);
  border-radius: 8px;
}
```

---

## ✅ HOÀN THÀNH!

### Kiểm tra Note Type

1. Tạo test card với data sample
2. Review cả Front và Back
3. Test input typing
4. Test "Show Answer" button
5. Check responsive trên mobile

### So sánh với bản cũ

| Feature | Old (Yellow) | New (Blue) |
|---------|-------------|------------|
| Màu chủ đạo | 🟡 Vàng kem sang trọng | 🔵 Xanh dương hiện đại |
| Cảm giác | Ấm áp, vintage | Sạch sẽ, năng động |
| Gradient | Vàng → Kem | Blue → Cyan |
| Icons | 🌱📖💡 | 🌱📖💡 (giữ nguyên) |
| Animations | ✅ | ✅ (giữ nguyên) |
| Layout | ✅ | ✅ (giữ nguyên) |
| Cảm hứng học | Thư giãn | Tập trung, động lực |

---

## 🎨 CUSTOM THÊM (OPTIONAL)

### Thay đổi màu chính

Trong phần Styling, tìm và thay:

```css
/* Từ Blue → Green */
#3b82f6 → #10b981  /* Blue → Green */
#06b6d4 → #34d399  /* Cyan → Light Green */

/* Từ Blue → Purple */
#3b82f6 → #8b5cf6  /* Blue → Purple */
#06b6d4 → #a78bfa  /* Cyan → Light Purple */

/* Từ Blue → Red */
#3b82f6 → #ef4444  /* Blue → Red */
#06b6d4 → #f87171  /* Cyan → Light Red */
```

---

✅ **Note Type mới đã sẵn sàng!** Giờ plugin sẽ export cards với theme xanh dương hiện đại, tạo cảm hứng học tập lâu dài! 🎉
