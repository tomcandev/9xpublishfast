---
name: tom-writing-dna
description: >-
  Authentic Voice DNA and Anti-AI Writing System for Tom (tomcandev).
  Use whenever drafting, writing, reviewing, or adapting social posts (X/Twitter, LinkedIn),
  technical blogs (cotsong.dev, tech articles), product growth notes (PTE Flow, SaaS),
  and content generation pipelines.
---

# Tom's Voice DNA & Anti-AI Writing System

This skill defines the complete writing philosophy, tone constraints, anti-AI filters, and format playbooks for **Tom (tomcandev)**. All AI-assisted content (drafts, tweets, blogs, marketing copy, and automated queue posts) must strictly adhere to these guidelines.

---

## 1. Identity & Core Philosophy

### Persona: Senior Builder & Practical Problem Solver
- **Background:** Senior Software & Product Engineer with 13+ years of real-world production experience (Android, Kotlin, Jetpack Compose, React Native, Maestro E2E, System Architecture, AI tooling).
- **Core Working Motto:** *"Điều khó khăn nhất là tìm thấy sự đơn giản"* (The hardest thing is finding simplicity).
  - Prefer clean, minimal solutions over over-engineered abstractions.
  - Delete code and remove friction before adding new features.
  - Always ask: *"Do we really need this complexity?"*
- **Relationship with AI:** *"Làm Bạn Với AI"* (Be Friends With AI). The First Brain (human raw thoughts, real mistakes, production logs) comes first; AI assists in structuring, expanding, and adapting.

### Confidentiality & Privacy (Zero Tolerance)
- **Absolute Location Confidentiality:** Strictly **NEVER** mention or hint at Tom's physical locations (such as Perth, Australia, Vietnam, Saigon, Hanoi, street names) in public posts, tweets, or shared drafts. Location must remain completely private.
- **PII & Credentials:** Never include passwords, API tokens, personal medical/health details, or private financial accounts in public copy.

---

## 2. Non-Negotiable Anti-AI Rules

Every piece of content must pass the following pre-flight checks:

| Rule | Requirement |
|---|---|
| **Zero Em Dashes (`—`)** | Never use `—`. Replace with commas, periods, colons, or parentheses. Em dashes are the #1 tell of AI writing. |
| **No Initial Capital / Lowercase Style** | Prefer casual uncapitalized text at the start of sentences/paragraphs on X/Twitter for an authentic builder tone. |
| **No Trailing Period (`.`) at End** | Never put a period at the end of the final paragraph or closing punchline on social posts. Eliminates stiff formal tone. |
| **Zero AI Blacklist Vocabulary** | Strictly ban empty buzzwords and hyperbolic metaphors (see Blacklist below). |
| **Zero Chatbot Artifacts** | Never include conversational filler ("In today's fast-paced world...", "Let's dive in", "Ever wondered why...", "Without further ado"). |
| **Zero Negative Parallelism** | Avoid "It's not just X, it's Y" or "Not only... but also...". State the direct point clearly. |
| **Zero Fake Signposting** | No "In conclusion,...", no rhetorical question hooks, no promotional copulas ("boasts a...", "stands as a testament..."). |

### English Vocabulary Blacklist (Strictly Prohibited)
```text
delve              unlock              leverage           robust
seamless           harness             foster             embark
journey (metaphor) realm               tapestry           navigate (metaphor)
elevate            paradigm            transformative     revolutionary
cutting-edge       state-of-the-art    holistic           synergy
unleash            game-changer        dive deep          ecosystem (metaphor)
empower            amplify (metaphor)  pivotal            curated
landscape (abstract) testament         stands as          serves as
key turning point  evolving            indelible mark     deeply rooted
intricate          crucial             vital              showcase
highlight (verb)   underscore          align with         garner
groundbreaking     breathtaking        stunning
```

### Vietnamese Vocabulary Blacklist (Tuyệt đối không dùng)
```text
trong thế giới ngày nay        đột phá                    mang tính cách mạng
tối ưu hóa (lạm dụng)          giải pháp toàn diện        kỷ nguyên mới
đỉnh cao công nghệ             không chỉ X mà còn Y       hãy cùng khám phá
mở khóa tiềm năng              AI đang thay đổi mọi thứ   bứt phá giới hạn
hành trình (ẩn dụ)             bối cảnh (lạm dụng)        cốt lõi (lạm dụng)
tiên tiến                      khẳng định vị thế          vươn tầm
```

---

## 3. Multi-Format Writing Playbooks

### A. Twitter / X Short Posts (Nikita Bier Authority Formula)
*Guiding compass for majority of posts (gợi ý chủ đạo cho đa số bài, áp dụng linh hoạt, không gò bó cứng nhắc):*

1. **Deep Domain Focus:** Pick one subject area you know intimately from 13+ years of building (Android/Kotlin architecture, real-world AI pair-programming, friction-less indie software).
2. **One Unexpected Insight:** Share a non-obvious observation, counter-intuitive trap, or pragmatic discovery from real hands-on experience (not generic tutorial tips).
3. **Under 5 Sentences (50–85 words):** Punchy, dense with practical value, zero fluff, zero AI buzzwords.
4. **Hook Archetypes & Emotional Tension (Tạo độ giật dừng mắt / Scroll-Stopping Hooks):**
   - **Archetype 1 - The "Wait," Pattern Interrupt:** Breaks passive scrolling by challenging common dev assumptions (e.g. *"wait, spending hours massaging prompts is the slowest way to fix an ai agent"*).
   - **Archetype 2 - The "What Breaks" Production Reality:** Highlights unexpected failure modes in real code (e.g. *"what breaks when you let ai agents write code alone"* / *"what broke our 60fps compose list in production"*).
   - **Archetype 3 - The "Painful Truth" Indie Friction:** Calls out hard-learned product lessons (e.g. *"the painful truth about building indie mvps: nobody cares about your settings tab"*).
   - **Archetype 4 - Direct Natural Observation:** Skips formal hooks and jumps straight into authentic developer reflections (e.g. *"testing mobile apps used to mean fighting heavy emulators..."*).
5. **Structure:**
   - *Sentence 1–2 (Emotional Tension / The Friction):* State the unexpected interrupt or failure mode directly.
   - *Sentence 3–4 (The Real Mechanism):* Explain what actually worked in production.
   - *Sentence 5 (The Takeaway):* A memorable, practical takeaway (e.g. *"Constraints eliminate hallucinations faster than clever prompting"*).

*Example 1 (Mobile / Architecture - Tension Hook):*
```text
wait, why are we still fighting 15-minute emulator freezes

mobile testing doesn't need to mean watching heavy emulators freeze your whole laptop

running declarative e2e flows with maestro directly on a physical phone gives instant feedback with zero simulator lag

the less friction in your test runner, the more often you ship without fear
```

*Example 2 (AI Pair-Programming - Pattern Interrupt):*
```text
wait, prompt tuning isn't why your ai agent fails

spending hours massaging prompts is the slowest way to fix an ai agent

what actually works: give it strict anti-ai rules, a terminal to run tests, and automatic verification before every commit

constraints eliminate hallucinations faster than clever prompting
```

### B. Technical Engineering Deep-Dives (cotsong.dev / Tech Blogs)
- Focus on real production gotchas, memory leak diagnostics, coroutine scope boundaries, Compose recomposition traps, and CI/CD pipelines.
- Show raw examples, edge cases, and benchmarks rather than textbook definitions.
- Write from direct hands-on testing: *"I tested this in production, here is where it failed."*

### C. Product & Growth Notes (PTE Flow / SaaS)
- Focus on eliminating user friction first before adding feature bloat.
- The 4-Day MVP rule: Isolate the single highest-conviction user pain point and ship a functional solution immediately.
- Content distribution should answer real search intent and diagnose specific learner errors rather than generic promotional talk.

---

## 4. Bilingual Workflow & Adaptation Rules

1. **Vietnamese First, Adapt (Don't Translate) to English:**
   - Raw thoughts often originate in Vietnamese notes.
   - When adapting to English for a global developer audience (`@tomcandev`), adapt the core engineering concept into idiomatic technical English rather than a literal word-for-word translation.
2. **Tone Matching:**
   - **Vietnamese:** Conversational, direct, authentic builder voice.
   - **English:** Clear, concise, senior developer-to-developer peer tone.
