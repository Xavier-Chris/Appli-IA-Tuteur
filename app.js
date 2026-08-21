/* =========================================================
   Tuteur de français IA - logique de l'application
   - Reconnaissance vocale et synthèse : navigateur (gratuit)
   - Cerveau : Claude (Anthropic) ou OpenAI, clé fournie par toi
   ========================================================= */

// ---- État global ----
const state = {
  provider: localStorage.getItem("provider") || "groq",
  apiKey: localStorage.getItem("apiKey") || "",
  azureKey: localStorage.getItem("azureKey") || "",
  azureRegion: localStorage.getItem("azureRegion") || "",
  theme: localStorage.getItem("theme") || "light",
  lang: localStorage.getItem("lang") || "en",
  level: "intermediaire",
  mode: "libre",
  persona: "tuteur",
  context: "",
  messages: [],        // historique { role: 'user'|'assistant', content: '...' }
  started: false,
  busy: false,
};

// ---- Raccourcis DOM ----
const $ = (id) => document.getElementById(id);
const transcriptEl = $("transcript");
const correctionsEl = $("corrections");
const vocabEl = $("vocab");
const micBtn = $("micBtn");
const waveform = $("waveform");
const statusLine = $("statusLine");

// =========================================================
//  Traductions (interface bilingue FR / EN)
// =========================================================
const I18N = {
  fr: {
    brand: "Your French Tutor",
    theme_title: "Basculer clair / sombre",
    settings_title: "Réglages",
    panel_lesson: "Ta leçon",
    label_level: "Niveau",
    lvl_beginner: "Débutant", lvl_intermediate: "Intermédiaire", lvl_advanced: "Avancé",
    label_persona: "Personnage",
    persona_tutor: "Tuteur classique",
    label_mode: "Mode",
    mode_libre: "Conversation libre", mode_guidee: "Conversation guidée",
    mode_roleplay: "Jeu de rôle", mode_grammaire: "Grammaire",
    ctx_subject: "Sujet", ctx_scenario: "Scénario", ctx_grammar: "Point de grammaire",
    ctx_ph_default: "Ex : voyage, restaurant...",
    ctx_ph_subject: "Ex : voyage, travail, université...",
    ctx_ph_scenario: "Ex : au restaurant, à l'aéroport...",
    ctx_ph_grammar: "Ex : passé composé, subjonctif...",
    label_voice: "Voix du tuteur",
    label_rate: "Vitesse de la voix",
    rate_slow: "Lente", rate_normal: "Normale", rate_fast: "Rapide",
    btn_start: "Démarrer la conversation",
    btn_reset: "Nouvelle leçon",
    panel_corrections: "Corrections",
    panel_vocab: "Vocabulaire",
    corrections_empty: "Tes corrections apparaîtront ici après chaque réponse.",
    vocab_empty: "Clique sur un mot dans la réponse du tuteur pour l'ajouter ici.",
    corrections_clear: "Vider",
    review_btn: "Réviser",
    review_h: "Révision du vocabulaire",
    review_empty_novocab: "Ajoute d'abord des mots en cliquant dessus dans une réponse du tuteur.",
    review_empty_nothing_due: "Rien à réviser pour l'instant. Reviens plus tard !",
    review_show_answer: "Afficher la réponse",
    review_knew: "Je savais 👍",
    review_didnt_know: "À revoir 👎",
    review_done: "Révision terminée ! Tu as revu {n} mot(s).",
    review_progress: "Carte {current} / {total}",
    empty_1: "Choisis ton niveau et ton mode, puis clique sur <strong>Démarrer la conversation</strong>.",
    empty_2: "Ton tuteur te parlera en français et corrigera tes réponses.",
    mic_title: "Parler",
    text_ph: "...ou écris ta réponse ici",
    btn_send: "Envoyer",
    settings_h: "Réglages",
    label_provider: "Fournisseur d'IA",
    prov_groq: "Groq (gratuit, sans carte)",
    prov_gemini: "Google Gemini (gratuit selon pays)",
    prov_anthropic: "Claude (Anthropic)",
    prov_openai: "OpenAI (GPT)",
    label_apikey: "Clé API",
    apikey_ph: "Colle ta clé ici",
    privacy_note: "Ta clé est enregistrée uniquement dans ce navigateur (localStorage). Elle n'est jamais envoyée ailleurs qu'au fournisseur choisi.",
    azure_h: "Voix premium (optionnel)",
    azure_note: "Ajoute une clé Azure Speech pour des voix bien plus naturelles que celles du navigateur. Sans clé, l'appli garde la voix du navigateur.",
    label_azure_key: "Clé Azure Speech",
    azure_key_ph: "Colle ta clé Azure ici",
    label_azure_region: "Région Azure",
    azure_region_ph: "ex : francecentral",
    btn_save: "Enregistrer",
    status_ready: "Prêt",
    status_listening: "Je t'écoute...",
    mic_denied: "Micro refusé. Autorise le micro ou écris ta réponse.",
    mic_problem: "Souci micro. Tu peux écrire ta réponse.",
    need_key: "Ajoute ta clé API pour commencer.",
    preparing: "Le tuteur prépare la leçon...",
    thinking: "Le tuteur réfléchit...",
    your_turn: "À toi. Clique sur le micro ou écris.",
    error_prefix: "Erreur : ",
    start_first: "Clique d'abord sur Démarrer la conversation.",
    no_mic: "Ton navigateur ne gère pas le micro. Utilise Chrome/Edge ou écris tes réponses.",
    reset_ready: "Nouvelle leçon prête. Clique sur <strong>Démarrer la conversation</strong>.",
    err_bubble: "Problème technique. Détail : {msg}\n\nSi tu vois « 401 » : ta clé API est absente ou invalide (⚙️). Si tu vois « Failed to fetch » : le navigateur bloque l'appel, on lancera un serveur local.",
    c_said: "Tu as dit", c_better: "Mieux", c_why: "Pourquoi",
    replay_title: "Réécouter",
    vocab_clear: "Vider",
    voice_default: "Voix par défaut du navigateur",
    hint_engine: "Moteur", hint_key_ok: "clé OK ✅", hint_key_missing: "clé manquante ⚠️",
    hint_voice: "Voix", hint_mic_ok: "micro dispo 🎤", hint_mic_no: "micro indispo (utilise le texte)",
    hint_mic_brave: "micro indispo sur Brave ⚠️",
    brave_warning: "⚠️ <strong>Tu utilises Brave</strong> : la reconnaissance vocale ne fonctionne pas dans ce navigateur (limitation volontaire de Brave, pas un bug de l'app). Utilise Chrome ou Edge pour parler au micro, ou écris tes réponses en attendant.",
  },
  en: {
    brand: "Your French Tutor",
    theme_title: "Toggle light / dark",
    settings_title: "Settings",
    panel_lesson: "Your lesson",
    label_level: "Level",
    lvl_beginner: "Beginner", lvl_intermediate: "Intermediate", lvl_advanced: "Advanced",
    label_persona: "Character",
    persona_tutor: "Classic tutor",
    label_mode: "Mode",
    mode_libre: "Free conversation", mode_guidee: "Guided conversation",
    mode_roleplay: "Role play", mode_grammaire: "Grammar",
    ctx_subject: "Topic", ctx_scenario: "Scenario", ctx_grammar: "Grammar point",
    ctx_ph_default: "e.g. travel, restaurant...",
    ctx_ph_subject: "e.g. travel, work, university...",
    ctx_ph_scenario: "e.g. at the restaurant, at the airport...",
    ctx_ph_grammar: "e.g. passé composé, subjunctive...",
    label_voice: "Tutor's voice",
    label_rate: "Voice speed",
    rate_slow: "Slow", rate_normal: "Normal", rate_fast: "Fast",
    btn_start: "Start conversation",
    btn_reset: "New lesson",
    panel_corrections: "Corrections",
    panel_vocab: "Vocabulary",
    corrections_empty: "Your corrections will appear here after each answer.",
    vocab_empty: "Click a word in the tutor's reply to add it here.",
    corrections_clear: "Clear",
    review_btn: "Review",
    review_h: "Vocabulary review",
    review_empty_novocab: "Add words first by clicking them in a tutor reply.",
    review_empty_nothing_due: "Nothing to review right now. Come back later!",
    review_show_answer: "Show answer",
    review_knew: "I knew it 👍",
    review_didnt_know: "Needs more practice 👎",
    review_done: "Review complete! You reviewed {n} word(s).",
    review_progress: "Card {current} / {total}",
    empty_1: "Choose your level and mode, then click <strong>Start conversation</strong>.",
    empty_2: "Your tutor will speak French and correct your answers.",
    mic_title: "Speak",
    text_ph: "...or type your answer here",
    btn_send: "Send",
    settings_h: "Settings",
    label_provider: "AI provider",
    prov_groq: "Groq (free, no card)",
    prov_gemini: "Google Gemini (free, depends on country)",
    prov_anthropic: "Claude (Anthropic)",
    prov_openai: "OpenAI (GPT)",
    label_apikey: "API key",
    apikey_ph: "Paste your key here",
    privacy_note: "Your key is stored only in this browser (localStorage). It is never sent anywhere except to the provider you choose.",
    azure_h: "Premium voice (optional)",
    azure_note: "Add an Azure Speech key for voices much more natural than the browser's. Without a key, the app keeps using the browser voice.",
    label_azure_key: "Azure Speech key",
    azure_key_ph: "Paste your Azure key here",
    label_azure_region: "Azure region",
    azure_region_ph: "e.g. francecentral",
    btn_save: "Save",
    status_ready: "Ready",
    status_listening: "I'm listening...",
    mic_denied: "Microphone denied. Allow the mic or type your answer.",
    mic_problem: "Mic problem. You can type your answer.",
    need_key: "Add your API key to start.",
    preparing: "The tutor is preparing the lesson...",
    thinking: "The tutor is thinking...",
    your_turn: "Your turn. Click the mic or type.",
    error_prefix: "Error: ",
    start_first: "Click Start conversation first.",
    no_mic: "Your browser doesn't support the mic. Use Chrome/Edge or type your answers.",
    reset_ready: "New lesson ready. Click <strong>Start conversation</strong>.",
    err_bubble: "Technical problem. Details: {msg}\n\nIf you see \"401\": your API key is missing or invalid (⚙️). If you see \"Failed to fetch\": the browser is blocking the call, we'll set up a local server.",
    c_said: "You said", c_better: "Better", c_why: "Why",
    replay_title: "Play again",
    vocab_clear: "Clear",
    voice_default: "Browser default voice",
    hint_engine: "Engine", hint_key_ok: "key OK ✅", hint_key_missing: "key missing ⚠️",
    hint_voice: "Voice", hint_mic_ok: "mic ready 🎤", hint_mic_no: "mic unavailable (type instead)",
    hint_mic_brave: "mic unavailable on Brave ⚠️",
    brave_warning: "⚠️ <strong>You're using Brave</strong>: voice recognition doesn't work in this browser (a deliberate Brave limitation, not an app bug). Use Chrome or Edge to talk with the mic, or type your answers instead.",
  },
};

function t(key) {
  const dict = I18N[state.lang] || I18N.fr;
  return dict[key] != null ? dict[key] : (I18N.fr[key] != null ? I18N.fr[key] : key);
}

function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-ph"));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });
  $("langBtn").textContent = state.lang === "fr" ? "EN" : "FR";
  // Éléments qui dépendent de l'état, pas seulement d'un attribut fixe.
  updateContextField();
  refreshEngineHint();
  updateReviewButton();
  if (!state.started) setStatus(SR ? t("status_ready") : t("no_mic"));
}

$("langBtn").addEventListener("click", () => {
  state.lang = state.lang === "fr" ? "en" : "fr";
  localStorage.setItem("lang", state.lang);
  applyLang();
});

// =========================================================
//  Thème
// =========================================================
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  $("themeBtn").textContent = state.theme === "dark" ? "☀️" : "🌙";
}
$("themeBtn").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", state.theme);
  applyTheme();
});

// =========================================================
//  Réglages (clé API + fournisseur)
// =========================================================
$("settingsBtn").addEventListener("click", openSettings);
$("closeSettings").addEventListener("click", () => ($("settingsModal").hidden = true));
$("saveSettings").addEventListener("click", () => {
  state.provider = $("providerSelect").value;
  state.apiKey = $("apiKeyInput").value.trim();
  state.azureKey = $("azureKeyInput").value.trim();
  state.azureRegion = $("azureRegionInput").value.trim();
  localStorage.setItem("provider", state.provider);
  localStorage.setItem("apiKey", state.apiKey);
  localStorage.setItem("azureKey", state.azureKey);
  localStorage.setItem("azureRegion", state.azureRegion);
  $("settingsModal").hidden = true;
  refreshEngineHint();
  loadVoices();   // la source de voix (Azure ou navigateur) a pu changer
});
function openSettings() {
  $("providerSelect").value = state.provider;
  $("apiKeyInput").value = state.apiKey;
  $("azureKeyInput").value = state.azureKey;
  $("azureRegionInput").value = state.azureRegion;
  $("settingsModal").hidden = false;
}

// =========================================================
//  Choix de la leçon
// =========================================================
$("levelSelect").addEventListener("change", (e) => (state.level = e.target.value));
$("personaSelect").addEventListener("change", (e) => (state.persona = e.target.value));
$("modeSelect").addEventListener("change", (e) => {
  state.mode = e.target.value;
  updateContextField();
});

// Affiche/masque le champ contextuel selon le mode, dans la bonne langue.
function updateContextField() {
  const field = $("contextField");
  const label = $("contextLabel");
  const input = $("contextInput");
  if (state.mode === "guidee") {
    field.hidden = false; label.textContent = t("ctx_subject"); input.placeholder = t("ctx_ph_subject");
  } else if (state.mode === "roleplay") {
    field.hidden = false; label.textContent = t("ctx_scenario"); input.placeholder = t("ctx_ph_scenario");
  } else if (state.mode === "grammaire") {
    field.hidden = false; label.textContent = t("ctx_grammar"); input.placeholder = t("ctx_ph_grammar");
  } else {
    field.hidden = true;
  }
}
$("contextInput").addEventListener("input", (e) => (state.context = e.target.value));

// =========================================================
//  Synthèse vocale (le tuteur parle)
// =========================================================
let frenchVoices = [];
// Clé renommée (voiceNameV2) pour que les anciens réglages figés sur la
// voix "Paul" (non neuronale) ne bloquent plus le choix automatique
// de la meilleure voix disponible (voix "Natural" en priorité).
let selectedVoiceName = localStorage.getItem("voiceNameV2") || "";
let voiceRate = parseFloat(localStorage.getItem("voiceRate")) || 0.95;

// Petite sélection de voix neuronales Azure de bonne qualité en français
// de France. Azure expose beaucoup plus de voix, mais une liste courte et
// choisie évite un appel réseau supplémentaire juste pour les lister.
const AZURE_VOICES = [
  { id: "fr-FR-VivienneMultilingualNeural", label: "Vivienne ⭐ (femme, très naturelle)" },
  { id: "fr-FR-RemyMultilingualNeural", label: "Rémy ⭐ (homme, très naturel)" },
  { id: "fr-FR-DeniseNeural", label: "Denise (femme, naturelle)" },
  { id: "fr-FR-HenriNeural", label: "Henri (homme, naturel)" },
  { id: "fr-FR-EloiseNeural", label: "Éloïse (femme, douce)" },
];

function azureReady() {
  return !!(state.azureKey && state.azureRegion);
}

// Score de "naturel" : les voix neuronales (Edge) et Google passent devant.
function voiceScore(v) {
  const n = (v.name || "").toLowerCase();
  let s = 0;
  if (n.includes("natural")) s += 100;   // voix neuronales de Edge
  if (n.includes("google")) s += 60;     // voix réseau de Chrome
  if (n.includes("online")) s += 40;
  if (v.lang === "fr-FR") s += 10;
  else if (v.lang && v.lang.toLowerCase().startsWith("fr")) s += 5;
  return s;
}

function niceVoiceLabel(v) {
  const n = v.name.toLowerCase();
  let tag = "";
  if (n.includes("natural")) tag = "  ⭐ naturelle";
  else if (n.includes("google")) tag = "  · Google";
  return v.name + tag;
}

function loadVoices() {
  const sel = document.getElementById("voiceSelect");
  if (!sel) return;
  sel.innerHTML = "";

  // Voix Azure premium : prioritaires dès qu'une clé est configurée.
  if (azureReady()) {
    AZURE_VOICES.forEach((v) => {
      const o = document.createElement("option");
      o.value = v.id;
      o.textContent = v.label;
      sel.appendChild(o);
    });
    const found = AZURE_VOICES.find((v) => v.id === selectedVoiceName);
    selectedVoiceName = found ? found.id : AZURE_VOICES[0].id;
    sel.value = selectedVoiceName;
    return;
  }

  // Sinon, repli sur les voix du navigateur.
  if (!("speechSynthesis" in window)) return;
  const all = speechSynthesis.getVoices();
  frenchVoices = all
    .filter((v) => v.lang && v.lang.replace("_", "-").toLowerCase() === "fr-fr")
    .sort((a, b) => voiceScore(b) - voiceScore(a));

  if (!frenchVoices.length) {
    const o = document.createElement("option");
    o.textContent = t("voice_default");
    sel.appendChild(o);
    return;
  }
  frenchVoices.forEach((v) => {
    const o = document.createElement("option");
    o.value = v.name;
    o.textContent = niceVoiceLabel(v);
    sel.appendChild(o);
  });
  // On garde le choix mémorisé s'il existe encore, sinon la meilleure voix.
  const found = frenchVoices.find((v) => v.name === selectedVoiceName);
  selectedVoiceName = found ? found.name : frenchVoices[0].name;
  sel.value = selectedVoiceName;
}

function currentVoice() {
  return frenchVoices.find((v) => v.name === selectedVoiceName) || frenchVoices[0] || null;
}

if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
} else {
  loadVoices();
}

function escapeSSML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

// Voix Azure : synthèse via l'API REST Cognitive Services. Lève une erreur
// si la clé est invalide ou l'appel échoue, pour que l'appelant puisse
// basculer sur le navigateur.
let currentAzureAudio = null;

// Joue l'audio au fur et à mesure qu'il arrive (au lieu d'attendre le
// fichier entier) pour réduire le délai avant que la voix démarre.
// Nécessite MediaSource ; se résout dès que la lecture démarre (comme
// audio.play(), sans attendre la fin de la lecture).
function playAzureStream(res) {
  return new Promise((resolve, reject) => {
    const mediaSource = new MediaSource();
    const objectUrl = URL.createObjectURL(mediaSource);
    const audio = new Audio(objectUrl);
    currentAzureAudio = audio;
    audio.onplay = () => waveform.classList.add("speaking");
    const cleanup = () => { waveform.classList.remove("speaking"); URL.revokeObjectURL(objectUrl); };
    audio.onended = cleanup;
    audio.onerror = cleanup;

    let settled = false;
    const fail = (err) => { if (!settled) { settled = true; cleanup(); reject(err); } };
    const succeed = () => { settled = true; resolve(); };

    mediaSource.addEventListener("sourceopen", () => {
      let sourceBuffer;
      try {
        sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
      } catch (err) { fail(err); return; }

      const reader = res.body.getReader();
      let firstChunk = true;

      const handleChunk = ({ done, value }) => {
        if (done) {
          if (mediaSource.readyState === "open") {
            try { mediaSource.endOfStream(); } catch (_) {}
          }
          return;
        }
        sourceBuffer.addEventListener("updateend", function onUpdateEnd() {
          sourceBuffer.removeEventListener("updateend", onUpdateEnd);
          if (firstChunk) {
            firstChunk = false;
            audio.play().then(succeed).catch(fail);
          }
          reader.read().then(handleChunk).catch(fail);
        }, { once: true });
        try {
          sourceBuffer.appendBuffer(value);
        } catch (err) { fail(err); }
      };

      reader.read().then(handleChunk).catch(fail);
    }, { once: true });
  });
}

async function speakAzure(text) {
  const ratePct = Math.round((voiceRate - 1) * 100);
  const rateAttr = ratePct >= 0 ? `+${ratePct}%` : `${ratePct}%`;
  // Les voix "Multilingual" (Vivienne, Rémy) détectent automatiquement la
  // langue mot par mot. Un mot isolé qui existe aussi en anglais (ex :
  // "aspect") peut alors être prononcé avec un accent anglais, surtout sans
  // phrase autour pour donner un indice de langue. On force le français
  // avec la balise <lang> pour ces voix-là.
  const isMultilingual = selectedVoiceName.toLowerCase().includes("multilingual");
  const body = escapeSSML(text);
  const spoken = isMultilingual ? `<lang xml:lang="fr-FR">${body}</lang>` : body;
  const ssml = `<speak version="1.0" xml:lang="fr-FR"><voice name="${selectedVoiceName}"><prosody rate="${rateAttr}">${spoken}</prosody></voice></speak>`;

  const res = await fetch(`https://${state.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": state.azureKey,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
    },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure TTS ${res.status}`);

  if (currentAzureAudio) { currentAzureAudio.pause(); currentAzureAudio = null; }

  // Lecture en flux si le navigateur le permet (Chrome/Edge/Firefox) : la
  // voix démarre dès les premiers octets reçus au lieu d'attendre le
  // fichier complet.
  const canStream = "MediaSource" in window && MediaSource.isTypeSupported("audio/mpeg") && !!res.body;
  if (canStream) {
    await playAzureStream(res);
    return;
  }

  // Repli pour les navigateurs sans flux mp3 (ex. Safari) : téléchargement
  // complet avant lecture, comportement identique à avant.
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAzureAudio = audio;
  audio.onplay = () => waveform.classList.add("speaking");
  const cleanup = () => { waveform.classList.remove("speaking"); URL.revokeObjectURL(url); };
  audio.onended = cleanup;
  audio.onerror = cleanup;
  await audio.play();
}

function speakBrowser(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  // Chrome/Edge ignorent parfois un speak() lancé juste après un cancel() :
  // un tout petit délai laisse le moteur vocal se remettre à zéro.
  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    const v = currentVoice();
    if (v) u.voice = v;
    u.rate = voiceRate;
    u.onstart = () => waveform.classList.add("speaking");
    u.onend = () => waveform.classList.remove("speaking");
    speechSynthesis.speak(u);
  }, 60);
}

function speak(text) {
  if (currentAzureAudio) { currentAzureAudio.pause(); currentAzureAudio = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (azureReady()) {
    speakAzure(text).catch((err) => {
      console.warn("Azure TTS a échoué, repli sur la voix du navigateur :", err);
      speakBrowser(text);
    });
  } else {
    speakBrowser(text);
  }
}

// Menu de choix de la voix : on change et on donne un aperçu.
document.getElementById("voiceSelect").addEventListener("change", (e) => {
  selectedVoiceName = e.target.value;
  localStorage.setItem("voiceNameV2", selectedVoiceName);
  speak("Bonjour, je suis ton professeur de français. Écoute ma voix.");
});
document.getElementById("rateSelect").addEventListener("change", (e) => {
  voiceRate = parseFloat(e.target.value);
  localStorage.setItem("voiceRate", String(voiceRate));
  speak("Voici ma nouvelle vitesse.");
});

// =========================================================
//  Reconnaissance vocale (l'apprenant parle)
// =========================================================
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;

if (SR) {
  recognition = new SR();
  recognition.lang = "fr-FR";
  recognition.continuous = true;   // enregistre jusqu'au prochain clic
  recognition.interimResults = true;

  // Fusionne un nouveau segment final avec le texte déjà accumulé. Sur
  // certains moteurs vocaux (Android notamment), chaque "segment final"
  // n'est pas un nouveau bout de phrase : c'est une réémission de TOUT
  // l'énoncé depuis le début, de plus en plus long ("bonjour" -> "bonjour,
  // je" -> "bonjour, je sais" -> "bonjour, je sais pas"). Les additionner
  // donnait un texte dupliqué en boucle. On remplace quand le nouveau
  // segment prolonge (ou est prolongé par) l'existant, et on additionne
  // seulement s'il s'agit d'un morceau vraiment distinct (comparaison
  // insensible à la casse, car la reprise n'a pas toujours la même
  // majuscule initiale que le premier envoi).
  function mergeFinalSegment(current, incoming) {
    if (!current) return incoming;
    if (!incoming) return current;
    const curLower = current.toLowerCase();
    const incLower = incoming.toLowerCase();
    if (incLower.startsWith(curLower)) return incoming;
    if (curLower.startsWith(incLower)) return current;
    return current + incoming;
  }

  let finalText = "";
  recognition.onstart = () => {
    listening = true;
    finalText = "";
    micBtn.classList.add("listening");
    waveform.classList.add("active");
    setStatus(t("status_listening"));
  };
  recognition.onresult = (e) => {
    let interim = "";
    for (let i = 0; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText = mergeFinalSegment(finalText, e.results[i][0].transcript);
      else interim += e.results[i][0].transcript;
    }
    setStatus(interim || finalText || "...");
  };
  recognition.onerror = (e) => {
    console.error("Erreur reconnaissance vocale :", e.error);
    setStatus(e.error === "not-allowed" ? t("mic_denied") : `${t("mic_problem")} (${e.error})`);
  };
  recognition.onend = () => {
    listening = false;
    micBtn.classList.remove("listening");
    waveform.classList.remove("active");
    const text = finalText.trim();
    if (text) sendMessage(text);
    else setStatus(t("status_ready"));
  };
}

micBtn.addEventListener("click", () => {
  if (!recognition) return;
  if (listening) { recognition.stop(); return; }
  speechSynthesis.cancel();          // on ne parle pas par-dessus le tuteur
  try { recognition.start(); } catch (_) {}
});

// =========================================================
//  Entrée texte (secours si pas de micro)
// =========================================================
$("textForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("textInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  sendMessage(text);
});

// =========================================================
//  Démarrage / reset de la leçon
// =========================================================
$("startBtn").addEventListener("click", startLesson);
$("resetBtn").addEventListener("click", () => {
  state.messages = [];
  state.started = false;
  transcriptEl.innerHTML = `<div class="empty-state"><p>${t("reset_ready")}</p></div>`;
  micBtn.disabled = true;
  setStatus(t("status_ready"));
});

async function startLesson() {
  if (!state.apiKey) {
    openSettings();
    setStatus(t("need_key"));
    return;
  }
  state.messages = [];
  state.started = true;
  transcriptEl.innerHTML = "";
  micBtn.disabled = !recognition;
  setStatus(t("preparing"));
  // Premier tour : on demande au tuteur de saluer et de lancer le sujet.
  await sendMessage("[Début de la leçon. Salue l'apprenant et lance la conversation.]", true);
}

// =========================================================
//  Construction de la consigne (system prompt)
// =========================================================
// Personnages incarnés par l'IA. Chacun garde son rôle de professeur.
const personas = {
  tuteur: null,
  hugo:
    "Tu incarnes Victor Hugo, l'écrivain français qui a vécu de 1802 à 1885, auteur des Misérables et de Notre-Dame de Paris. " +
    "Tu peux raconter ta vie et parler de toi : ta naissance à Besançon, ton amour très jeune pour la poésie et le théâtre, " +
    "ton mariage avec Adèle Foucher et tes cinq enfants, la mort de ta fille Léopoldine noyée en 1843 qui t'a brisé le cœur, " +
    "ton engagement pour les pauvres et contre la peine de mort, ton opposition à l'empereur Napoléon III, " +
    "et tes presque vingt ans d'exil sur les îles de Jersey et de Guernesey. " +
    "Tu es passionné, généreux, révolté par l'injustice et plein d'espoir dans le progrès humain.",
  vangogh:
    "Tu incarnes Vincent van Gogh, le peintre né aux Pays-Bas en 1853 et mort en 1890. " +
    "Tu peux raconter ta vie et parler de toi : ton lien très fort avec ton frère Théo qui t'a toujours soutenu, " +
    "tes nombreux métiers avant la peinture, ta décision de devenir peintre vers 27 ans, " +
    "ta passion pour les couleurs et la lumière du sud de la France à Arles, tes tableaux comme les Tournesols et la Nuit étoilée, " +
    "la crise difficile où tu t'es coupé une partie de l'oreille, tes problèmes d'argent et tes moments de grande tristesse, " +
    "et le fait que tu n'as presque rien vendu de ton vivant. " +
    "Tu es sensible, sincère, passionné et chaleureux, et tu aimes profondément la nature.",
  stromae:
    "Tu incarnes Stromae, de son vrai nom Paul Van Haver, l'artiste belge né à Bruxelles en 1985, d'une mère belge et d'un père rwandais. " +
    "Tu peux raconter ta vie et parler de toi : l'absence de ton père, parti tôt puis tué pendant le génocide au Rwanda en 1994, " +
    "que tu évoques dans ta chanson Papaoutai, tes débuts à la batterie puis dans le rap, ton nom de scène qui est l'anagramme de Maestro, " +
    "ton grand succès avec Alors on danse puis l'album Racine carrée avec Formidable et Papaoutai, " +
    "ta façon de mélanger l'électro, la pop et des sons africains, " +
    "et ton combat contre la dépression et le burn-out, dont tu parles ouvertement dans ta chanson L'enfer. " +
    "Tu es créatif, réfléchi, humble et honnête sur tes émotions.",
  curie:
    "Tu incarnes Marie Curie, la physicienne et chimiste née Maria Skłodowska à Varsovie en 1867 et morte en 1934. " +
    "Tu peux raconter ta vie et parler de toi : ton enfance en Pologne sous domination russe où les femmes n'avaient pas le droit d'étudier à l'université, " +
    "ton arrivée à Paris pour étudier la physique et la chimie à la Sorbonne, ta rencontre avec Pierre Curie que tu as épousé et dont tu disais qu'il était « le meilleur mari dont on puisse rêver », " +
    "la découverte du polonium, nommé en hommage à ta Pologne natale, et du radium, tes deux prix Nobel dans deux sciences différentes (physique en 1903, chimie en 1911), " +
    "la mort tragique de Pierre renversé par une voiture à cheval en 1906, ton rôle pendant la Première Guerre mondiale où tu as créé des unités mobiles de radiographie surnommées les « petites Curies », " +
    "et ta fille Irène qui a elle aussi reçu un prix Nobel plus tard. " +
    "Tu vivais très simplement, presque sans robe ni confort, tout entière tournée vers ton travail, et tu disais que « dans la vie, rien n'est à craindre, tout est à comprendre ». " +
    "Tu es rigoureuse, déterminée, discrète et passionnée par la recherche scientifique, et tu as dû te battre toute ta vie pour être respectée en tant que femme scientifique.",
  napoleon:
    "Tu incarnes Napoléon Bonaparte, né à Ajaccio en Corse en 1769 et mort en exil en 1821. " +
    "Tu peux raconter ta vie et parler de toi : ton enfance corse et ta formation militaire en France, ton ascension rapide pendant la Révolution française, " +
    "tes campagnes militaires en Italie et en Égypte, ton coup d'État de 1799 qui t'a fait Premier consul, ton sacre comme empereur des Français en 1804, " +
    "le Code civil que tu as fait créer et qui influence encore le droit français aujourd'hui, tes grandes victoires comme Austerlitz et tes défaites comme la campagne de Russie, " +
    "ton mariage avec Joséphine à qui tu écrivais des lettres d'amour passionnées, puis ton second mariage avec Marie-Louise, ta défaite finale à Waterloo en 1815, et ton exil sur l'île de Sainte-Hélène où tu es mort. " +
    "Tu aimes les formules marquantes comme « Impossible n'est pas français » ou « Du sublime au ridicule, il n'y a qu'un pas », qui reflètent ta confiance en toi. " +
    "Tu es ambitieux, stratège, autoritaire et convaincu de ton destin exceptionnel, mais tu parles avec fierté de ce que tu as construit.",
  zidane:
    "Tu incarnes Zinédine Zidane, le footballeur né à Marseille en 1972, dans une famille d'origine algérienne, avec trois frères et une sœur. " +
    "Tu peux raconter ta vie et parler de toi : ton enfance dans le quartier populaire de la Castellane où tu jouais au foot dans la rue, une institutrice disait de toi que tu étais « très dissipé, mais on te pardonnait tout », " +
    "ton admiration d'enfant pour le joueur uruguayen Enzo Francescoli, tes débuts professionnels à Cannes puis à Bordeaux, ton transfert à la Juventus de Turin, puis ton transfert record au Real Madrid, " +
    "ton titre de champion du monde avec la France en 1998 où tu as marqué deux buts de la tête en finale, ton titre de champion d'Europe en 2000, " +
    "ton but exceptionnel en finale de Ligue des champions en 2002, ton célèbre coup de tête contre Materazzi en finale de la Coupe du monde 2006 qui a été ton dernier match de joueur, " +
    "et ta deuxième carrière comme entraîneur du Real Madrid, où tu as gagné trois Ligues des champions d'affilée. " +
    "Tu dis souvent que les performances individuelles comptent moins que l'équipe, et que ton père vous a appris qu'un immigré doit travailler deux fois plus que les autres et ne jamais abandonner. " +
    "Tu es humble, travailleur, discret et posé dans la vie malgré un tempérament qui pouvait s'enflammer sur le terrain, et tu parles avec respect de tes origines et de ta famille.",
  guetta:
    "Tu incarnes David Guetta, le DJ et producteur français né à Paris en 1967. " +
    "Tu peux raconter ta vie et parler de toi : ta passion d'adolescent pour les radios pirates et les DJ de club qui enchaînaient les morceaux en direct, ce qui t'a complètement fasciné, " +
    "tes débuts comme DJ dès l'âge de 17 ans dans les clubs parisiens, où tu jouais parfois huit heures par nuit, six nuits par semaine, " +
    "ta rencontre avec Cathy, avec qui tu t'es marié et qui t'a beaucoup aidé à construire ta carrière et tes soirées, " +
    "ton passage de la scène des clubs parisiens à une carrière mondiale dans les années 2000, " +
    "tes plus grands tubes comme When Love Takes Over, Sexy Bitch, Titanium ou Memories, tes collaborations avec des artistes du monde entier, " +
    "ton rôle de pionnier pour populariser la musique électronique et la house dans les charts internationaux, et le fait que tu as été élu plusieurs fois meilleur DJ du monde et vendu plus de dix millions d'albums. " +
    "Tu dis souvent que ton objectif n'est pas d'être le DJ le plus célèbre du monde, mais de faire une musique qui touche vraiment les gens, et que le vrai métier de DJ, c'est de savoir lire une salle et retenir l'attention du public. " +
    "Tu es énergique, chaleureux, passionné par la musique et le partage avec le public, et tu restes simple et travailleur malgré le succès.",
  bardot:
    "Tu incarnes Brigitte Bardot, l'actrice française née à Paris en 1934 et morte en 2025. " +
    "Tu peux raconter ta vie et parler de toi : tes débuts comme mannequin puis actrice très jeune, " +
    "le film Et Dieu... créa la femme en 1956, réalisé par Roger Vadim que tu as épousé, qui a fait de toi une icône mondiale et un symbole de liberté, " +
    "ta carrière de star du cinéma français dans les années 1950 et 1960, tes chansons, ta vie amoureuse très commentée par les médias de l'époque, " +
    "ta décision surprenante d'arrêter le cinéma en 1973, en pleine gloire, à l'âge de 39 ans, car la célébrité avait toujours été un fardeau pour toi, " +
    "et ta deuxième vie consacrée entièrement à la défense des animaux, avec la Fondation Brigitte Bardot que tu as créée en 1986 et ta maison à Saint-Tropez. " +
    "Tu disais volontiers : « J'ai donné ma jeunesse et ma beauté aux hommes, et maintenant je donne ma sagesse et mon expérience aux animaux », et que sans les animaux, tu te serais sentie perdue. " +
    "Tu es franche, insolente, parfois provocatrice, avec un petit côté « éternelle enfant », et passionnée par la cause animale plus que par ton ancienne gloire de cinéma.",
};

// Repères du CECRL (cadre européen commun de référence pour les langues) :
// vocabulaire, temps verbaux et structures de phrases attendus à chaque
// niveau, pour une vraie différence perceptible plutôt qu'une consigne vague.
const LEVEL_GUIDANCE = {
  debutant:
    "Niveau débutant (A1-A2). " +
    "Vocabulaire : uniquement des mots très courants et concrets du quotidien (famille, nourriture, temps, couleurs, nombres, lieux familiers). Aucun mot abstrait, figuré ou rare. " +
    "Temps verbaux : présent de l'indicatif, futur proche (aller + infinitif), passé composé avec des verbes courants, impératif simple. N'utilise JAMAIS le subjonctif, le conditionnel complexe ou la voix passive. " +
    "Phrases : courtes et simples (sujet-verbe-complément), pas ou très peu de subordination. Connecteurs simples uniquement : et, mais, parce que, alors, ou.",
  intermediaire:
    "Niveau intermédiaire (B1-B2). " +
    "Vocabulaire : plus large, avec des mots abstraits courants, des expressions usuelles, des nuances de sentiments et d'opinions. " +
    "Temps verbaux : passé composé et imparfait en contraste, plus-que-parfait, futur simple, conditionnel présent, et début du subjonctif présent dans des tournures courantes (« il faut que », « je voudrais que », « je ne pense pas que »). " +
    "Phrases : plus longues, avec des subordonnées relatives (qui, que, où) et causales (parce que, car, comme). Connecteurs logiques variés : cependant, donc, par contre, ensuite, en revanche, du coup.",
  avance:
    "Niveau avancé (C1-C2). " +
    "Vocabulaire : riche et nuancé, expressions idiomatiques, registre soutenu quand le contexte s'y prête, mots précis ou spécialisés selon le sujet abordé. " +
    "Temps verbaux : tous les temps et modes disponibles, subjonctif et conditionnel passé, concordance des temps. " +
    "Phrases : complexes, avec plusieurs subordonnées enchâssées. Connecteurs logiques sophistiqués : bien que, quoique, de sorte que, en dépit de, de même que. N'hésite pas aux nuances stylistiques et sous-entendus.",
};

function buildSystemPrompt() {
  const personaText = personas[state.persona];
  const intro = personaText
    ? `${personaText}
Tu restes toujours dans ce personnage et tu peux parler librement de ta vie, de ton passé, de tes émotions et de ta personnalité.
TRÈS IMPORTANT : exprime-toi dans un français moderne, jamais dans un style d'époque ou exagérément littéraire, car la personne apprend le français et doit te comprendre. La richesse de ton vocabulaire doit suivre le niveau de l'apprenant précisé plus bas, pas ton époque d'origine.
Tu es aussi un professeur de français bienveillant, mais tu ne corriges JAMAIS l'apprenant dans ta réponse orale : tu continues simplement la conversation. Les corrections vont seulement dans le champ prévu, jamais dans ta réponse.`
    : "Tu es un professeur de français langue étrangère, patient, encourageant, naturel et parfois drôle. Tu n'es jamais robotique.";

  const modeText = {
    libre: "Conversation libre sur le sujet que l'apprenant veut.",
    guidee: `Conversation guidée sur le thème : ${state.context || "au choix"}. Rends la difficulté progressive.`,
    roleplay: `Jeu de rôle. Scénario : ${state.context || "au choix"}. Joue pleinement ton personnage.`,
    grammaire: `Leçon de grammaire interactive sur : ${state.context || "au choix"}. Ne fais pas de longs exposés : pose des questions et guide l'apprenant vers la règle.`,
  }[state.mode];

  const explLang = state.lang === "en" ? "anglais" : "français";
  const levelGuidance = LEVEL_GUIDANCE[state.level] || LEVEL_GUIDANCE.intermediaire;

  return `${intro}
${levelGuidance}
Respecte STRICTEMENT ces repères de niveau à chaque réponse, aussi bien dans ton vocabulaire que dans la construction de tes phrases.
Mode de la séance : ${modeText}

Règles :
- Parle UNIQUEMENT en français dans le champ "reply" (sauf une traduction courte d'un mot difficile si vraiment utile).
- Écris toujours dans un français IMPECCABLE, naturel et idiomatique, digne d'un professeur natif expérimenté. Aucune faute, aucune tournure maladroite ou traduite.
- Garde tes réponses courtes et naturelles, comme à l'oral. Pose une question de suivi pour relancer.
- Ne pose JAMAIS de question avec l'inversion sujet-verbe (comme « Rêves-tu ? », « As-tu... ? », « Aimes-tu... ? »), même avec un apprenant avancé. Utilise uniquement l'intonation (« Tu rêves ? ») ou « est-ce que » (« Est-ce que tu rêves ? »).

Règle des corrections (TRÈS IMPORTANT) :
- Dans le champ "reply", ne corrige JAMAIS et ne signale JAMAIS les erreurs de l'apprenant. Réagis seulement au sens de ce qu'il dit et continue la conversation naturellement. TOUTES les corrections vont uniquement dans le champ "correction", jamais dans "reply".
- Ne corrige QUE les vraies fautes. Une faute, c'est une erreur de conjugaison, d'orthographe, d'accord, de genre, de vocabulaire, d'élision ou une structure vraiment incorrecte.
- Tu es un EXPERT de la grammaire et de l'orthographe françaises. Dès qu'il y a au moins une vraie faute, "correction" ne doit JAMAIS être null.
- Vérifie SYSTÉMATIQUEMENT chaque mot de la phrase un par un, ne te contente pas d'une lecture globale rapide : les fautes discrètes (une lettre, une élision manquante, un petit mot mal accordé) sont aussi importantes à corriger que les grosses fautes.
- Fais particulièrement attention à l'ÉLISION : "de", "le", "la", "que", "ne", "je", "me", "te", "se", "ce" doivent devenir "d'", "l'", "qu'", "n'", "j'", "m'", "t'", "s'", "c'" devant un mot commençant par une voyelle ou un h muet. Exemple de faute à corriger : « avant de être » doit devenir « avant d'être ». Autres exemples : « le enfant » → « l'enfant », « que il vient » → « qu'il vient », « je ai » → « j'ai ».
- Fais particulièrement attention à l'ACCORD SUJET-VERBE, même dans une phrase très simple et très courte : "tu" + verbe au présent se termine TOUJOURS en "-es" ou "-s" (jamais "-e" seul), sauf "tu peux", "tu veux", "tu vas". Exemple de faute à corriger : « tu prononce » doit devenir « tu prononces ». Vérifie aussi les accords avec "il/elle" (-e), "nous" (-ons), "vous" (-ez), "ils/elles" (-ent).
- Quand une phrase contient une ou plusieurs vraies fautes, corrige-les TOUTES d'un coup. Repère chaque erreur : conjugaison, temps verbal, accord en genre et en nombre, article, préposition, orthographe, choix du mot, syntaxe. Le champ "better" doit être la phrase ENTIÈREMENT corrigée, et "explanation" doit expliquer brièvement CHAQUE faute corrigée (une courte phrase par faute).
- Ne corrige JAMAIS le français familier correct de l'oral. Le registre familier n'est pas une faute.
- Exemple : « Tu es né en quelle année ? » est CORRECT (question orale sans inversion), donc "correction" vaut null.
- Contre-exemple : « Tu es nai en quelle année ? » contient une faute (« nai » au lieu de « né »), donc tu corriges.
- Autres exemples corrects à ne pas corriger : « Je sais pas », « Tu viens ? », « Y'a personne », « C'est quoi ? ». Ne les corrige pas.
- Une question qui n'utilise pas l'inversion n'est JAMAIS une faute. Les questions sans inversion (« Tu viens quand ? », « Vous habitez où ? », « Il fait quoi ? ») sont correctes : ne les corrige pas et ne propose jamais d'ajouter l'inversion.
- Le tutoiement (« tu ») et le vouvoiement (« vous ») sont tous les deux corrects : ne considère JAMAIS le choix entre « tu » et « vous » comme une faute. Quand tu corriges une phrase, garde le MÊME registre que l'apprenant (s'il utilise « tu », corrige avec « tu » ; s'il utilise « vous », corrige avec « vous »), sauf si le contexte impose le vouvoiement (par exemple un entretien d'embauche, l'administration, un médecin).
- Si la phrase est correcte, même en registre familier, mets OBLIGATOIREMENT "correction" à null.
- Rédige le champ "explanation" en ${explLang}.

Tu DOIS répondre EXCLUSIVEMENT avec un objet JSON valide, sans aucun texte autour, avec cette forme exacte :
{
  "userText": "la phrase de l'apprenant réécrite avec une ponctuation soignée : majuscule au début, virgules si besoin, et point ou point d'interrogation à la fin. Garde EXACTEMENT ses mots, ne corrige PAS la grammaire dans ce champ.",
  "reply": "ta réponse orale en français, courte",
  "correction": { "original": "ce que l'apprenant a dit", "better": "version corrigée en français", "explanation": "explication courte et simple en ${explLang}" } ou null
}
Ne mets rien d'autre que ce JSON.`;
}

// =========================================================
//  Recherche d'un mot cliqué dans le chat (vocabulaire à la demande)
// =========================================================
function buildVocabLookupPrompt() {
  return `Tu es un dictionnaire français-anglais expert, utilisé dans une application d'apprentissage du français.
On te donne un mot ou une courte expression française, cliqué par un apprenant dans une phrase, avec la phrase complète comme contexte.
Réponds EXCLUSIVEMENT avec un objet JSON valide, sans aucun texte autour, avec cette forme exacte :
{
  "word": "le mot ou l'expression exactement comme on te l'a donné, sans le modifier",
  "translation": "traduction en anglais, courte et naturelle, adaptée au contexte donné",
  "gender": "m" ou "f" si le mot est un nom commun (indique son genre), sinon null,
  "infinitive": "la forme infinitive" si le mot est un verbe conjugué et que sa forme diffère de l'infinitif, sinon null
}
Ne mets rien d'autre que ce JSON.`;
}

async function lookupWord(word, sentenceContext, spanEl) {
  const cleanWord = (word || "").trim();
  if (!cleanWord || !state.apiKey) return;
  speak(cleanWord);   // prononce le mot cliqué, en plus de sa traduction
  spanEl.classList.add("looking-up");
  try {
    const raw = await callProvider(buildVocabLookupPrompt(), [
      { role: "user", content: `Phrase : "${sentenceContext}"\nMot ou expression cliqué : "${cleanWord}"` },
    ]);
    const data = parseJSON(raw, { word: cleanWord, translation: "", gender: null, infinitive: null });
    addVocabItem(data.word || cleanWord, data.translation, data.gender, data.infinitive);
    renderVocabPanel();
    spanEl.classList.add("word-added");
  } catch (err) {
    console.error(err);
    const msg = err && err.message ? err.message : String(err);
    setStatus(t("error_prefix") + msg);
  } finally {
    spanEl.classList.remove("looking-up");
  }
}

// Découpe un texte en segments, en rendant chaque mot cliquable
// (la ponctuation et les espaces restent du texte simple).
function makeWordsClickable(text, container) {
  const re = /[A-Za-zÀ-ÖØ-öø-ÿ''-]+/g;
  let lastIndex = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const word = match[0];
    const span = document.createElement("span");
    span.className = "clickable-word";
    span.textContent = word;
    span.addEventListener("click", () => lookupWord(word, text, span));
    container.appendChild(span);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

// =========================================================
//  Envoi d'un message au tuteur
// =========================================================
async function sendMessage(text, isSystemTrigger = false) {
  if (state.busy) return;
  if (!state.started) { setStatus(t("start_first")); return; }
  if (!state.apiKey) { openSettings(); return; }

  const userBubble = isSystemTrigger ? null : addBubble("user", tidyTranscript(text));
  state.messages.push({ role: "user", content: text });

  state.busy = true;
  setStatus(t("thinking"));
  micBtn.disabled = true;

  try {
    const raw = await callProvider(buildSystemPrompt(), state.messages);
    const data = parseTutorJSON(raw);

    if (userBubble && data.userText) userBubble.textContent = frenchSpacing(data.userText);
    state.messages.push({ role: "assistant", content: raw });
    addBubble("tutor", data.reply);
    speak(data.reply);
    renderCorrection(data.correction);
    setStatus(t("your_turn"));
  } catch (err) {
    console.error(err);
    const msg = err && err.message ? err.message : String(err);
    setStatus(t("error_prefix") + msg);
    addBubble("tutor", t("err_bubble").replace("{msg}", msg));
  } finally {
    state.busy = false;
    micBtn.disabled = !recognition;
  }
}

// =========================================================
//  Appels aux API
// =========================================================
// Chaque fonction accepte un system prompt et une liste de messages,
// pour pouvoir servir aussi bien la conversation principale que de
// petites requêtes ponctuelles (ex : recherche d'un mot cliqué).
async function callAnthropic(systemPrompt, messages) {
  // Cache de prompt Anthropic : le système (identique à chaque message tant
  // que le niveau/personnage/mode ne changent pas) et l'historique déjà
  // envoyé sont mis en cache côté Anthropic, donc refacturés ~10x moins
  // cher au lieu du plein tarif à chaque nouveau message de la leçon.
  const cachedMessages = messages.map((m, i) => ({
    role: m.role,
    content: [{
      type: "text",
      text: m.content,
      ...(i === messages.length - 1 ? { cache_control: { type: "ephemeral" } } : {}),
    }],
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": state.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: cachedMessages,
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const json = await res.json();
  // Le premier bloc de "content" n'est pas toujours le texte (il peut y
  // avoir un bloc de réflexion avant) : on cherche le bloc de type "text".
  const textBlock = (json.content || []).find((b) => b.type === "text");
  return textBlock?.text || "";
}

async function callOpenAI(systemPrompt, messages) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: "Bearer " + state.apiKey,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}

// Modèles Groq essayés dans l'ordre : le meilleur d'abord,
// avec repli automatique si un modèle n'est pas disponible sur le compte.
// Les modèles Llama ont été retirés de Groq (dépréciation 2026) ;
// Groq recommande désormais les modèles gpt-oss.
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

async function callGroq(systemPrompt, messages) {
  // Groq est compatible avec le format OpenAI.
  const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];
  let lastErr;
  for (const model of GROQ_MODELS) {
    // Une réponse JSON mal formée (souvent coupée avant la fin) est parfois
    // un aléa ponctuel du modèle : on retente une fois sur le même modèle
    // avant de passer au suivant.
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer " + state.apiKey,
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          response_format: { type: "json_object" },
          messages: fullMessages,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.choices?.[0]?.message?.content || "";
      }
      let code = "";
      let detail = "";
      try {
        const body = await res.json();
        code = body.error?.code || "";
        detail = JSON.stringify(body.error || {});
      } catch (_) {}
      lastErr = new Error(`${res.status} ${detail}`);
      lastErr.status = res.status;
      if (code === "json_validate_failed" && attempt === 0) continue;   // on retente
      break;
    }
    // 400 (modèle indisponible ou JSON invalide même après retry) / 404 :
    // on tente le modèle suivant. Toute autre erreur (ex : 401) arrête tout.
    if (lastErr.status !== 400 && lastErr.status !== 404) throw lastErr;
  }
  throw lastErr;
}

async function callGemini(systemPrompt, messages) {
  // Gemini utilise les rôles "user" et "model" (pas "assistant"),
  // et la consigne système passe par un champ séparé.
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": state.apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 700 },
      }),
    }
  );
  if (!res.ok) throw new Error(await readError(res));
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Dispatche vers le fournisseur choisi, avec un system prompt et des
// messages fournis par l'appelant (conversation ou recherche ponctuelle).
async function callProvider(systemPrompt, messages) {
  return state.provider === "openai" ? await callOpenAI(systemPrompt, messages) :
    state.provider === "gemini" ? await callGemini(systemPrompt, messages) :
    state.provider === "groq" ? await callGroq(systemPrompt, messages) :
    await callAnthropic(systemPrompt, messages);
}

async function readError(res) {
  let detail = "";
  try { detail = JSON.stringify((await res.json()).error || {}); } catch (_) {}
  return `${res.status} ${detail}`;
}

// Parse une réponse JSON de l'IA avec tolérance (au cas où du texte
// s'ajoute autour du JSON malgré la consigne).
function parseJSON(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (_) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      try { return JSON.parse(raw.slice(start, end + 1)); } catch (_) {}
    }
    return fallback;
  }
}

function parseTutorJSON(raw) {
  return parseJSON(raw, { userText: null, reply: raw || "…", correction: null });
}

// =========================================================
//  Affichage
// =========================================================
function addBubble(who, text) {
  const div = document.createElement("div");
  div.className = "bubble " + (who === "user" ? "user" : "tutor");
  if (who === "tutor") {
    // Chaque mot est cliquable : l'apprenant choisit lui-même ce qu'il
    // veut ajouter à son vocabulaire, au lieu d'une liste imposée.
    makeWordsClickable(text, div);
    const btn = document.createElement("span");
    btn.className = "speak-again";
    btn.textContent = "🔊";
    btn.title = t("replay_title");
    btn.addEventListener("click", () => speak(text));
    div.appendChild(btn);
  } else {
    div.textContent = text;
  }
  transcriptEl.appendChild(div);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
  return div;
}

// Nettoyage local immédiat de la transcription : majuscule au début et
// point à la fin. L'IA affine ensuite avec la ponctuation complète.
// Ajoute une espace avant ? et ! (typographie française).
function frenchSpacing(s) {
  return (s || "").replace(/\s*([!?]+)/g, " $1");
}

function tidyTranscript(text) {
  let s = (text || "").trim();
  if (!s) return s;
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?…]$/.test(s)) s += ".";
  return frenchSpacing(s);
}

// Les corrections sont mémorisées entre les sessions (localStorage),
// comme le vocabulaire, pour suivre les fautes récurrentes dans le temps.
let savedCorrections = [];
try { savedCorrections = JSON.parse(localStorage.getItem("correctionsBank")) || []; } catch (_) { savedCorrections = []; }

function persistCorrections() {
  localStorage.setItem("correctionsBank", JSON.stringify(savedCorrections));
}

function renderCorrectionsPanel() {
  if (!savedCorrections.length) {
    correctionsEl.innerHTML = `<p class="small muted">${t("corrections_empty")}</p>`;
    return;
  }
  correctionsEl.innerHTML = "";
  savedCorrections.forEach((c) => {
    const card = document.createElement("div");
    card.className = "correction-card";
    card.innerHTML = `
      <div class="row"><span class="tag">${t("c_said")}</span><span class="said">${escapeHtml(c.original || "")}</span></div>
      <div class="row"><span class="tag">${t("c_better")}</span><span class="better">${escapeHtml(c.better)}</span></div>
      <div class="row"><span class="tag">${t("c_why")}</span><span class="why">${escapeHtml(c.explanation || "")}</span></div>`;
    correctionsEl.appendChild(card);
  });
}

function renderCorrection(c) {
  if (!c || !c.better) return;
  savedCorrections.unshift({ original: c.original || "", better: c.better, explanation: c.explanation || "" });
  persistCorrections();
  renderCorrectionsPanel();
}

$("clearCorrectionsBtn").addEventListener("click", () => {
  savedCorrections = [];
  persistCorrections();
  renderCorrectionsPanel();
});

// Le vocabulaire est mémorisé entre les sessions (localStorage), comme un
// carnet personnel qui s'enrichit au fil des leçons.
let savedVocab = [];
try { savedVocab = JSON.parse(localStorage.getItem("vocabBank")) || []; } catch (_) { savedVocab = []; }

function persistVocab() {
  localStorage.setItem("vocabBank", JSON.stringify(savedVocab));
}

function renderVocabPanel() {
  if (!savedVocab.length) {
    vocabEl.innerHTML = `<p class="small muted">${t("vocab_empty")}</p>`;
  } else {
    vocabEl.innerHTML = "";
    savedVocab.forEach((v) => {
      const el = document.createElement("div");
      el.className = "vocab-item";
      const genderTag = v.gender ? `<span class="vocab-tag">${v.gender === "f" ? "n.f." : "n.m."}</span>` : "";
      const infTag = v.infinitive ? `<span class="vocab-tag">→ ${escapeHtml(v.infinitive)}</span>` : "";
      el.innerHTML = `
        <div class="vocab-main"><span class="word">${escapeHtml(v.word)}</span>${genderTag}${infTag}</div>
        <span class="tr">${escapeHtml(v.translation || "")}</span>`;
      vocabEl.appendChild(el);
    });
  }
  updateReviewButton();
}

// Nouveau mot : prêt à être révisé dès maintenant (boîte 0 du système
// de Leitner), pour encourager une première révision peu après l'ajout.
function addVocabItem(word, translation, gender, infinitive) {
  const key = word.trim().toLowerCase();
  if (savedVocab.some((v) => v.word.trim().toLowerCase() === key)) return;
  savedVocab.unshift({
    word, translation: translation || "", gender: gender || null, infinitive: infinitive || null,
    box: 0, nextReview: Date.now(),
  });
  persistVocab();
}

$("clearVocabBtn").addEventListener("click", () => {
  savedVocab = [];
  persistVocab();
  renderVocabPanel();
});

// =========================================================
//  Révision espacée du vocabulaire (système de Leitner)
// =========================================================
// Boîte 0 à 4 : intervalle en jours avant la prochaine révision si la
// réponse est connue. Une réponse ratée renvoie toujours en boîte 0.
const LEITNER_INTERVALS_DAYS = [1, 2, 4, 8, 16];
const DAY_MS = 24 * 60 * 60 * 1000;

function dueVocab() {
  const now = Date.now();
  // Les mots sauvegardés avant l'ajout de la révision n'ont pas de
  // date : on les considère prêts à réviser dès aujourd'hui.
  return savedVocab.filter((v) => !v.nextReview || v.nextReview <= now);
}

function updateReviewButton() {
  const due = dueVocab().length;
  $("reviewBtn").textContent = due > 0 ? `${t("review_btn")} (${due})` : t("review_btn");
}

let reviewQueue = [];
let reviewIndex = 0;
let reviewAnswered = 0;

function openReview() {
  reviewQueue = dueVocab().sort(() => Math.random() - 0.5);
  reviewIndex = 0;
  reviewAnswered = 0;
  $("reviewModal").hidden = false;
  renderReviewCard();
}

function closeReview() {
  $("reviewModal").hidden = true;
  renderVocabPanel();
}

function renderReviewCard() {
  const body = $("reviewBody");
  if (!reviewQueue.length) {
    const msg = savedVocab.length ? t("review_empty_nothing_due") : t("review_empty_novocab");
    body.innerHTML = `<p class="review-empty">${escapeHtml(msg)}</p>`;
    return;
  }
  if (reviewIndex >= reviewQueue.length) {
    body.innerHTML = `<p class="review-done">${t("review_done").replace("{n}", String(reviewAnswered))}</p>`;
    return;
  }
  const v = reviewQueue[reviewIndex];
  const genderTag = v.gender ? `<span class="vocab-tag">${v.gender === "f" ? "n.f." : "n.m."}</span>` : "";
  const progress = t("review_progress")
    .replace("{current}", String(reviewIndex + 1))
    .replace("{total}", String(reviewQueue.length));
  body.innerHTML = `
    <p class="review-progress">${progress}</p>
    <div class="review-card">
      <span class="review-word">${escapeHtml(v.word)}</span>${genderTag}
      <div class="review-answer" id="reviewAnswer" hidden>
        <span class="review-translation">${escapeHtml(v.translation || "")}</span>
        ${v.infinitive ? `<span class="vocab-tag">→ ${escapeHtml(v.infinitive)}</span>` : ""}
      </div>
    </div>
    <div class="review-actions" id="reviewActions"></div>`;

  const actions = $("reviewActions");
  const showBtn = document.createElement("button");
  showBtn.className = "btn btn-ghost";
  showBtn.textContent = t("review_show_answer");
  showBtn.addEventListener("click", () => {
    $("reviewAnswer").hidden = false;
    actions.innerHTML = "";
    const knowBtn = document.createElement("button");
    knowBtn.className = "btn btn-primary";
    knowBtn.textContent = t("review_knew");
    knowBtn.addEventListener("click", () => gradeCard(v, true));
    const dontKnowBtn = document.createElement("button");
    dontKnowBtn.className = "btn btn-ghost";
    dontKnowBtn.textContent = t("review_didnt_know");
    dontKnowBtn.addEventListener("click", () => gradeCard(v, false));
    actions.appendChild(dontKnowBtn);
    actions.appendChild(knowBtn);
  });
  actions.appendChild(showBtn);
}

function gradeCard(v, knew) {
  v.box = knew ? Math.min((v.box || 0) + 1, LEITNER_INTERVALS_DAYS.length - 1) : 0;
  v.nextReview = Date.now() + LEITNER_INTERVALS_DAYS[v.box] * DAY_MS;
  persistVocab();
  reviewAnswered++;
  reviewIndex++;
  renderReviewCard();
}

$("reviewBtn").addEventListener("click", openReview);
$("closeReview").addEventListener("click", closeReview);

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function setStatus(msg) { statusLine.textContent = msg; }

// =========================================================
//  Indice sur le moteur configuré
// =========================================================
function refreshEngineHint() {
  const engine =
    state.provider === "openai" ? "OpenAI (GPT)" :
    state.provider === "gemini" ? "Google Gemini" :
    state.provider === "groq" ? "Groq" :
    "Claude";
  const key = state.apiKey ? t("hint_key_ok") : t("hint_key_missing");
  const voice = !SR ? t("hint_mic_no") : isBraveBrowser ? t("hint_mic_brave") : t("hint_mic_ok");
  $("engineHint").innerHTML = `${t("hint_engine")} : ${engine} · ${key}<br/>${t("hint_voice")} : ${voice}`;
}

// =========================================================
//  Avertissement Brave (la reconnaissance vocale n'y fonctionne pas)
// =========================================================
let isBraveBrowser = false;
(async () => {
  isBraveBrowser = !!(navigator.brave && (await navigator.brave.isBrave()));
  if (!isBraveBrowser) return;
  const banner = document.createElement("div");
  banner.className = "browser-warning";
  banner.innerHTML = `<span data-i18n-html="brave_warning">${t("brave_warning")}</span><button class="close-warning" title="✕">✕</button>`;
  banner.querySelector(".close-warning").addEventListener("click", () => banner.remove());
  document.querySelector(".topbar").insertAdjacentElement("afterend", banner);
  refreshEngineHint();
})();

// ---- Init ----
applyTheme();
document.getElementById("rateSelect").value = String(voiceRate);
applyLang();   // applique la langue (met aussi à jour l'indice moteur et le statut)
renderVocabPanel();   // affiche le vocabulaire sauvegardé des sessions précédentes
renderCorrectionsPanel();   // affiche les corrections sauvegardées des sessions précédentes
