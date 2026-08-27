/* =========================================================
   Tuteur de français IA - logique de l'application
   - Reconnaissance vocale et synthèse : navigateur (gratuit)
   - Cerveau : Claude (Anthropic) ou OpenAI, clé fournie par toi
   ========================================================= */

// ---- État global ----
const state = {
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
    lvl_beginner: "Débutant", lvl_intermediate: "Intermédiaire", lvl_upper_intermediate: "Intermédiaire avancé", lvl_advanced: "Avancé",
    label_persona: "Personnage",
    persona_tutor: "Tuteur classique",
    persona_group_writing: "Écriture", persona_group_painting: "Peinture", persona_group_music: "Musique",
    persona_group_science: "Science", persona_group_politics: "Politique", persona_group_sport: "Sport", persona_group_cinema: "Cinéma",
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
    btn_reset: "Terminer et voir le résumé",
    summary_h: "Résumé de la leçon",
    summary_date: "Date",
    btn_download_pdf: "Télécharger en PDF",
    summary_duration: "Durée",
    summary_exchanges: "Échanges",
    summary_new_words: "Nouveaux mots",
    summary_corrections: "Fautes corrigées",
    summary_no_new_words: "Aucun nouveau mot ajouté cette fois.",
    summary_no_corrections: "Aucune faute corrigée, bien joué !",
    summary_minutes: "{n} min",
    summary_less_minute: "moins d'une minute",
    summary_include_transcript: "Inclure la transcription complète",
    summary_transcript: "Transcription complète",
    summary_transcript_student: "Élève",
    summary_transcript_tutor: "Tuteur",
    panel_corrections: "Corrections",
    panel_vocab: "Vocabulaire",
    corrections_empty: "Tes corrections apparaîtront ici après chaque réponse.",
    vocab_empty: "Clique sur un mot dans la réponse du tuteur pour l'ajouter ici.",
    vocab_stats: "{mastered} maîtrisé(s) · {due} à réviser · 🔥 {streak} j. de suite",
    corrections_clear: "Vider",
    review_btn: "Réviser",
    review_h: "Révision du vocabulaire",
    review_empty_novocab: "Ajoute d'abord des mots en cliquant dessus dans une réponse du tuteur.",
    review_empty_nothing_due: "Rien à réviser pour l'instant. Reviens plus tard !",
    review_show_answer: "Afficher la réponse",
    review_listen: "Écouter",
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
    label_apikey: "Clé API Claude",
    apikey_ph: "Colle ta clé ici",
    privacy_note: "Ta clé est enregistrée uniquement dans ce navigateur (localStorage). Elle n'est jamais envoyée ailleurs qu'à Claude (Anthropic).",
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
    no_mic_ios: "Le micro n'est pas disponible sur iPhone/iPad, quel que soit le navigateur (limitation d'iOS). Écris tes réponses.",
    reset_ready: "Nouvelle leçon prête. Clique sur <strong>Démarrer la conversation</strong>.",
    err_bubble: "Problème technique. Détail : {msg}\n\nSi tu vois « 401 » : ta clé API est absente ou invalide (⚙️). Si tu vois « Failed to fetch » : le navigateur bloque l'appel, on lancera un serveur local.",
    c_said: "Tu as dit", c_better: "Mieux", c_why: "Pourquoi",
    replay_title: "Réécouter",
    translate_title: "Voir la traduction",
    vocab_clear: "Vider",
    voice_default: "Voix par défaut du navigateur",
    grammar_noun_f: "n.f.", grammar_noun_m: "n.m.", grammar_infinitive_prefix: "inf. :",
    hint_engine: "Moteur", hint_key_ok: "clé OK ✅", hint_key_missing: "clé manquante ⚠️",
    hint_voice: "Voix", hint_mic_ok: "micro dispo 🎤", hint_mic_no: "micro indispo (utilise le texte)",
    hint_mic_ios: "micro indispo sur iPhone/iPad (utilise le texte)",
    hint_mic_brave: "micro indispo sur Brave ⚠️",
    brave_warning: "⚠️ <strong>Tu utilises Brave</strong> : la reconnaissance vocale ne fonctionne pas dans ce navigateur (limitation volontaire de Brave, pas un bug de l'app). Utilise Chrome ou Edge pour parler au micro, ou écris tes réponses en attendant.",
    ios_warning: "⚠️ <strong>Tu es sur iPhone/iPad</strong> : le micro ne fonctionne dans aucun navigateur sur iOS (limitation du système, pas un bug de l'app). Écris tes réponses en attendant, ou utilise un ordinateur ou un appareil Android pour parler au micro.",
  },
  en: {
    brand: "Your French Tutor",
    theme_title: "Toggle light / dark",
    settings_title: "Settings",
    panel_lesson: "Your lesson",
    label_level: "Level",
    lvl_beginner: "Beginner", lvl_intermediate: "Intermediate", lvl_upper_intermediate: "Upper Intermediate", lvl_advanced: "Advanced",
    label_persona: "Character",
    persona_tutor: "Classic tutor",
    persona_group_writing: "Writer", persona_group_painting: "Painter", persona_group_music: "Music",
    persona_group_science: "Science", persona_group_politics: "Politics", persona_group_sport: "Sport", persona_group_cinema: "Cinema",
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
    btn_reset: "Finish and see summary",
    summary_h: "Lesson summary",
    summary_date: "Date",
    btn_download_pdf: "Download as PDF",
    summary_duration: "Duration",
    summary_exchanges: "Exchanges",
    summary_new_words: "New words",
    summary_corrections: "Corrections made",
    summary_no_new_words: "No new words added this time.",
    summary_no_corrections: "No mistakes corrected, well done!",
    summary_minutes: "{n} min",
    summary_less_minute: "less than a minute",
    summary_include_transcript: "Include full transcript",
    summary_transcript: "Full transcript",
    summary_transcript_student: "Student",
    summary_transcript_tutor: "Tutor",
    panel_corrections: "Corrections",
    panel_vocab: "Vocabulary",
    corrections_empty: "Your corrections will appear here after each answer.",
    vocab_empty: "Click a word in the tutor's reply to add it here.",
    vocab_stats: "{mastered} mastered · {due} to review · 🔥 {streak}-day streak",
    corrections_clear: "Clear",
    review_btn: "Review",
    review_h: "Vocabulary review",
    review_empty_novocab: "Add words first by clicking them in a tutor reply.",
    review_empty_nothing_due: "Nothing to review right now. Come back later!",
    review_show_answer: "Show answer",
    review_listen: "Listen",
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
    label_apikey: "Claude API key",
    apikey_ph: "Paste your key here",
    privacy_note: "Your key is stored only in this browser (localStorage). It is never sent anywhere except to Claude (Anthropic).",
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
    no_mic_ios: "The mic isn't available on iPhone/iPad, in any browser (an iOS limitation). Type your answers instead.",
    reset_ready: "New lesson ready. Click <strong>Start conversation</strong>.",
    err_bubble: "Technical problem. Details: {msg}\n\nIf you see \"401\": your API key is missing or invalid (⚙️). If you see \"Failed to fetch\": the browser is blocking the call, we'll set up a local server.",
    c_said: "You said", c_better: "Better", c_why: "Why",
    replay_title: "Play again",
    translate_title: "Show translation",
    vocab_clear: "Clear",
    voice_default: "Browser default voice",
    grammar_noun_f: "f.", grammar_noun_m: "m.", grammar_infinitive_prefix: "inf.:",
    hint_engine: "Engine", hint_key_ok: "key OK ✅", hint_key_missing: "key missing ⚠️",
    hint_voice: "Voice", hint_mic_ok: "mic ready 🎤", hint_mic_no: "mic unavailable (type instead)",
    hint_mic_ios: "mic unavailable on iPhone/iPad (type instead)",
    hint_mic_brave: "mic unavailable on Brave ⚠️",
    brave_warning: "⚠️ <strong>You're using Brave</strong>: voice recognition doesn't work in this browser (a deliberate Brave limitation, not an app bug). Use Chrome or Edge to talk with the mic, or type your answers instead.",
    ios_warning: "⚠️ <strong>You're on iPhone/iPad</strong>: the mic doesn't work in any browser on iOS (a system limitation, not an app bug). Type your answers instead, or use a computer or Android device to talk with the mic.",
  },
  es: {
    brand: "Your French Tutor",
    theme_title: "Cambiar claro / oscuro",
    settings_title: "Ajustes",
    panel_lesson: "Tu lección",
    label_level: "Nivel",
    lvl_beginner: "Principiante", lvl_intermediate: "Intermedio", lvl_upper_intermediate: "Intermedio avanzado", lvl_advanced: "Avanzado",
    label_persona: "Personaje",
    persona_tutor: "Tutor clásico",
    persona_group_writing: "Escritor", persona_group_painting: "Pintor", persona_group_music: "Música",
    persona_group_science: "Ciencia", persona_group_politics: "Política", persona_group_sport: "Deporte", persona_group_cinema: "Cine",
    label_mode: "Modo",
    mode_libre: "Conversación libre", mode_guidee: "Conversación guiada",
    mode_roleplay: "Juego de rol", mode_grammaire: "Gramática",
    ctx_subject: "Tema", ctx_scenario: "Escenario", ctx_grammar: "Punto de gramática",
    ctx_ph_default: "Ej: viaje, restaurante...",
    ctx_ph_subject: "Ej: viaje, trabajo, universidad...",
    ctx_ph_scenario: "Ej: en el restaurante, en el aeropuerto...",
    ctx_ph_grammar: "Ej: passé composé, subjuntivo...",
    label_voice: "Voz del tutor",
    label_rate: "Velocidad de la voz",
    rate_slow: "Lenta", rate_normal: "Normal", rate_fast: "Rápida",
    btn_start: "Empezar la conversación",
    btn_reset: "Terminar y ver el resumen",
    summary_h: "Resumen de la lección",
    summary_date: "Fecha",
    btn_download_pdf: "Descargar en PDF",
    summary_duration: "Duración",
    summary_exchanges: "Intercambios",
    summary_new_words: "Palabras nuevas",
    summary_corrections: "Errores corregidos",
    summary_no_new_words: "No se añadió ninguna palabra nueva esta vez.",
    summary_no_corrections: "Ningún error corregido, ¡muy bien!",
    summary_minutes: "{n} min",
    summary_less_minute: "menos de un minuto",
    summary_include_transcript: "Incluir la transcripción completa",
    summary_transcript: "Transcripción completa",
    summary_transcript_student: "Estudiante",
    summary_transcript_tutor: "Tutor",
    panel_corrections: "Correcciones",
    panel_vocab: "Vocabulario",
    corrections_empty: "Tus correcciones aparecerán aquí después de cada respuesta.",
    vocab_empty: "Haz clic en una palabra de la respuesta del tutor para añadirla aquí.",
    vocab_stats: "{mastered} dominada(s) · {due} para repasar · 🔥 racha de {streak} día(s)",
    corrections_clear: "Borrar",
    review_btn: "Repasar",
    review_h: "Repaso de vocabulario",
    review_empty_novocab: "Primero añade palabras haciendo clic en ellas en una respuesta del tutor.",
    review_empty_nothing_due: "Nada que repasar por ahora. ¡Vuelve más tarde!",
    review_show_answer: "Mostrar la respuesta",
    review_listen: "Escuchar",
    review_knew: "Lo sabía 👍",
    review_didnt_know: "A repasar 👎",
    review_done: "¡Repaso terminado! Has repasado {n} palabra(s).",
    review_progress: "Tarjeta {current} / {total}",
    empty_1: "Elige tu nivel y tu modo, luego haz clic en <strong>Empezar la conversación</strong>.",
    empty_2: "Tu tutor te hablará en francés y corregirá tus respuestas.",
    mic_title: "Hablar",
    text_ph: "...o escribe tu respuesta aquí",
    btn_send: "Enviar",
    settings_h: "Ajustes",
    label_apikey: "Clave API de Claude",
    apikey_ph: "Pega tu clave aquí",
    privacy_note: "Tu clave se guarda únicamente en este navegador (localStorage). Nunca se envía a ningún sitio salvo a Claude (Anthropic).",
    azure_h: "Voz premium (opcional)",
    azure_note: "Añade una clave de Azure Speech para voces mucho más naturales que las del navegador. Sin clave, la app sigue usando la voz del navegador.",
    label_azure_key: "Clave de Azure Speech",
    azure_key_ph: "Pega tu clave de Azure aquí",
    label_azure_region: "Región de Azure",
    azure_region_ph: "ej: francecentral",
    btn_save: "Guardar",
    status_ready: "Listo",
    status_listening: "Te escucho...",
    mic_denied: "Micrófono denegado. Permite el micrófono o escribe tu respuesta.",
    mic_problem: "Problema con el micrófono. Puedes escribir tu respuesta.",
    need_key: "Añade tu clave API para empezar.",
    preparing: "El tutor está preparando la lección...",
    thinking: "El tutor está pensando...",
    your_turn: "Tu turno. Haz clic en el micrófono o escribe.",
    error_prefix: "Error: ",
    start_first: "Primero haz clic en Empezar la conversación.",
    no_mic: "Tu navegador no admite el micrófono. Usa Chrome/Edge o escribe tus respuestas.",
    no_mic_ios: "El micrófono no está disponible en iPhone/iPad, en ningún navegador (una limitación de iOS). Escribe tus respuestas.",
    reset_ready: "Nueva lección lista. Haz clic en <strong>Empezar la conversación</strong>.",
    err_bubble: "Problema técnico. Detalle: {msg}\n\nSi ves «401»: tu clave API falta o no es válida (⚙️). Si ves «Failed to fetch»: el navegador está bloqueando la llamada, configuraremos un servidor local.",
    c_said: "Dijiste", c_better: "Mejor", c_why: "Por qué",
    replay_title: "Volver a escuchar",
    translate_title: "Ver la traducción",
    vocab_clear: "Borrar",
    voice_default: "Voz predeterminada del navegador",
    grammar_noun_f: "f.", grammar_noun_m: "m.", grammar_infinitive_prefix: "inf.:",
    hint_engine: "Motor", hint_key_ok: "clave OK ✅", hint_key_missing: "clave faltante ⚠️",
    hint_voice: "Voz", hint_mic_ok: "micrófono listo 🎤", hint_mic_no: "micrófono no disponible (usa el texto)",
    hint_mic_ios: "micrófono no disponible en iPhone/iPad (usa el texto)",
    hint_mic_brave: "micrófono no disponible en Brave ⚠️",
    brave_warning: "⚠️ <strong>Estás usando Brave</strong>: el reconocimiento de voz no funciona en este navegador (una limitación deliberada de Brave, no un error de la app). Usa Chrome o Edge para hablar por el micrófono, o escribe tus respuestas mientras tanto.",
    ios_warning: "⚠️ <strong>Estás en iPhone/iPad</strong>: el micrófono no funciona en ningún navegador en iOS (una limitación del sistema, no un error de la app). Escribe tus respuestas mientras tanto, o usa un ordenador o un dispositivo Android para hablar por el micrófono.",
  },
  de: {
    brand: "Your French Tutor",
    theme_title: "Hell/Dunkel umschalten",
    settings_title: "Einstellungen",
    panel_lesson: "Deine Lektion",
    label_level: "Niveau",
    lvl_beginner: "Anfänger", lvl_intermediate: "Mittelstufe", lvl_upper_intermediate: "Obere Mittelstufe", lvl_advanced: "Fortgeschritten",
    label_persona: "Charakter",
    persona_tutor: "Klassischer Tutor",
    persona_group_writing: "Schriftsteller", persona_group_painting: "Maler", persona_group_music: "Musik",
    persona_group_science: "Wissenschaft", persona_group_politics: "Politik", persona_group_sport: "Sport", persona_group_cinema: "Kino",
    label_mode: "Modus",
    mode_libre: "Freies Gespräch", mode_guidee: "Geführtes Gespräch",
    mode_roleplay: "Rollenspiel", mode_grammaire: "Grammatik",
    ctx_subject: "Thema", ctx_scenario: "Szenario", ctx_grammar: "Grammatikthema",
    ctx_ph_default: "z. B. Reise, Restaurant...",
    ctx_ph_subject: "z. B. Reise, Arbeit, Universität...",
    ctx_ph_scenario: "z. B. im Restaurant, am Flughafen...",
    ctx_ph_grammar: "z. B. passé composé, Konjunktiv...",
    label_voice: "Stimme des Tutors",
    label_rate: "Sprechgeschwindigkeit",
    rate_slow: "Langsam", rate_normal: "Normal", rate_fast: "Schnell",
    btn_start: "Gespräch starten",
    btn_reset: "Beenden und Zusammenfassung ansehen",
    summary_h: "Zusammenfassung der Lektion",
    summary_date: "Datum",
    btn_download_pdf: "Als PDF herunterladen",
    summary_duration: "Dauer",
    summary_exchanges: "Wortwechsel",
    summary_new_words: "Neue Wörter",
    summary_corrections: "Korrigierte Fehler",
    summary_no_new_words: "Diesmal wurden keine neuen Wörter hinzugefügt.",
    summary_no_corrections: "Keine Fehler korrigiert, gut gemacht!",
    summary_minutes: "{n} Min.",
    summary_less_minute: "weniger als eine Minute",
    summary_include_transcript: "Vollständiges Transkript einschließen",
    summary_transcript: "Vollständiges Transkript",
    summary_transcript_student: "Schüler",
    summary_transcript_tutor: "Tutor",
    panel_corrections: "Korrekturen",
    panel_vocab: "Wortschatz",
    corrections_empty: "Deine Korrekturen erscheinen hier nach jeder Antwort.",
    vocab_empty: "Klicke auf ein Wort in der Antwort des Tutors, um es hier hinzuzufügen.",
    vocab_stats: "{mastered} gemeistert · {due} zu wiederholen · 🔥 {streak} Tage in Folge",
    corrections_clear: "Leeren",
    review_btn: "Wiederholen",
    review_h: "Wortschatzwiederholung",
    review_empty_novocab: "Füge zuerst Wörter hinzu, indem du sie in einer Antwort des Tutors anklickst.",
    review_empty_nothing_due: "Gerade nichts zu wiederholen. Komm später wieder!",
    review_show_answer: "Antwort anzeigen",
    review_listen: "Anhören",
    review_knew: "Wusste ich 👍",
    review_didnt_know: "Muss ich üben 👎",
    review_done: "Wiederholung abgeschlossen! Du hast {n} Wort/Wörter wiederholt.",
    review_progress: "Karte {current} / {total}",
    empty_1: "Wähle dein Niveau und deinen Modus, dann klicke auf <strong>Gespräch starten</strong>.",
    empty_2: "Dein Tutor spricht Französisch mit dir und korrigiert deine Antworten.",
    mic_title: "Sprechen",
    text_ph: "...oder schreibe deine Antwort hier",
    btn_send: "Senden",
    settings_h: "Einstellungen",
    label_apikey: "Claude-API-Schlüssel",
    apikey_ph: "Füge deinen Schlüssel hier ein",
    privacy_note: "Dein Schlüssel wird nur in diesem Browser gespeichert (localStorage). Er wird niemals an einen anderen Ort als Claude (Anthropic) gesendet.",
    azure_h: "Premium-Stimme (optional)",
    azure_note: "Füge einen Azure-Speech-Schlüssel hinzu für Stimmen, die viel natürlicher klingen als die des Browsers. Ohne Schlüssel nutzt die App weiterhin die Browserstimme.",
    label_azure_key: "Azure-Speech-Schlüssel",
    azure_key_ph: "Füge deinen Azure-Schlüssel hier ein",
    label_azure_region: "Azure-Region",
    azure_region_ph: "z. B. francecentral",
    btn_save: "Speichern",
    status_ready: "Bereit",
    status_listening: "Ich höre zu...",
    mic_denied: "Mikrofon abgelehnt. Erlaube das Mikrofon oder schreibe deine Antwort.",
    mic_problem: "Mikrofonproblem. Du kannst deine Antwort schreiben.",
    need_key: "Füge deinen API-Schlüssel hinzu, um zu starten.",
    preparing: "Der Tutor bereitet die Lektion vor...",
    thinking: "Der Tutor denkt nach...",
    your_turn: "Du bist dran. Klicke auf das Mikrofon oder schreibe.",
    error_prefix: "Fehler: ",
    start_first: "Klicke zuerst auf Gespräch starten.",
    no_mic: "Dein Browser unterstützt das Mikrofon nicht. Nutze Chrome/Edge oder schreibe deine Antworten.",
    no_mic_ios: "Das Mikrofon ist auf iPhone/iPad in keinem Browser verfügbar (eine Einschränkung von iOS). Schreibe deine Antworten.",
    reset_ready: "Neue Lektion bereit. Klicke auf <strong>Gespräch starten</strong>.",
    err_bubble: "Technisches Problem. Details: {msg}\n\nWenn du \"401\" siehst: dein API-Schlüssel fehlt oder ist ungültig (⚙️). Wenn du \"Failed to fetch\" siehst: der Browser blockiert den Aufruf, wir richten einen lokalen Server ein.",
    c_said: "Du sagtest", c_better: "Besser", c_why: "Warum",
    replay_title: "Erneut anhören",
    translate_title: "Übersetzung anzeigen",
    vocab_clear: "Leeren",
    voice_default: "Standardstimme des Browsers",
    grammar_noun_f: "f.", grammar_noun_m: "m.", grammar_infinitive_prefix: "Inf.:",
    hint_engine: "Engine", hint_key_ok: "Schlüssel OK ✅", hint_key_missing: "Schlüssel fehlt ⚠️",
    hint_voice: "Stimme", hint_mic_ok: "Mikrofon bereit 🎤", hint_mic_no: "Mikrofon nicht verfügbar (nutze den Text)",
    hint_mic_ios: "Mikrofon auf iPhone/iPad nicht verfügbar (nutze den Text)",
    hint_mic_brave: "Mikrofon auf Brave nicht verfügbar ⚠️",
    brave_warning: "⚠️ <strong>Du nutzt Brave</strong>: Die Spracherkennung funktioniert in diesem Browser nicht (eine bewusste Einschränkung von Brave, kein App-Fehler). Nutze Chrome oder Edge, um mit dem Mikrofon zu sprechen, oder schreibe stattdessen deine Antworten.",
    ios_warning: "⚠️ <strong>Du bist auf iPhone/iPad</strong>: Das Mikrofon funktioniert in keinem Browser unter iOS (eine Systemeinschränkung, kein App-Fehler). Schreibe stattdessen deine Antworten, oder nutze einen Computer oder ein Android-Gerät, um mit dem Mikrofon zu sprechen.",
  },
  pt: {
    brand: "Your French Tutor",
    theme_title: "Alternar claro / escuro",
    settings_title: "Configurações",
    panel_lesson: "Sua lição",
    label_level: "Nível",
    lvl_beginner: "Iniciante", lvl_intermediate: "Intermediário", lvl_upper_intermediate: "Intermediário avançado", lvl_advanced: "Avançado",
    label_persona: "Personagem",
    persona_tutor: "Tutor clássico",
    persona_group_writing: "Escritor", persona_group_painting: "Pintor", persona_group_music: "Música",
    persona_group_science: "Ciência", persona_group_politics: "Política", persona_group_sport: "Esporte", persona_group_cinema: "Cinema",
    label_mode: "Modo",
    mode_libre: "Conversa livre", mode_guidee: "Conversa guiada",
    mode_roleplay: "Simulação", mode_grammaire: "Gramática",
    ctx_subject: "Tema", ctx_scenario: "Cenário", ctx_grammar: "Ponto de gramática",
    ctx_ph_default: "Ex: viagem, restaurante...",
    ctx_ph_subject: "Ex: viagem, trabalho, universidade...",
    ctx_ph_scenario: "Ex: no restaurante, no aeroporto...",
    ctx_ph_grammar: "Ex: passé composé, subjuntivo...",
    label_voice: "Voz do tutor",
    label_rate: "Velocidade da voz",
    rate_slow: "Lenta", rate_normal: "Normal", rate_fast: "Rápida",
    btn_start: "Começar a conversa",
    btn_reset: "Terminar e ver o resumo",
    summary_h: "Resumo da lição",
    summary_date: "Data",
    btn_download_pdf: "Baixar em PDF",
    summary_duration: "Duração",
    summary_exchanges: "Trocas",
    summary_new_words: "Palavras novas",
    summary_corrections: "Erros corrigidos",
    summary_no_new_words: "Nenhuma palavra nova adicionada desta vez.",
    summary_no_corrections: "Nenhum erro corrigido, muito bem!",
    summary_minutes: "{n} min",
    summary_less_minute: "menos de um minuto",
    summary_include_transcript: "Incluir a transcrição completa",
    summary_transcript: "Transcrição completa",
    summary_transcript_student: "Aluno",
    summary_transcript_tutor: "Tutor",
    panel_corrections: "Correções",
    panel_vocab: "Vocabulário",
    corrections_empty: "Suas correções vão aparecer aqui depois de cada resposta.",
    vocab_empty: "Clique em uma palavra na resposta do tutor para adicioná-la aqui.",
    vocab_stats: "{mastered} dominada(s) · {due} para revisar · 🔥 sequência de {streak} dia(s)",
    corrections_clear: "Limpar",
    review_btn: "Revisar",
    review_h: "Revisão de vocabulário",
    review_empty_novocab: "Adicione palavras primeiro, clicando nelas em uma resposta do tutor.",
    review_empty_nothing_due: "Nada para revisar por agora. Volte mais tarde!",
    review_show_answer: "Mostrar a resposta",
    review_listen: "Ouvir",
    review_knew: "Eu sabia 👍",
    review_didnt_know: "Preciso revisar 👎",
    review_done: "Revisão concluída! Você revisou {n} palavra(s).",
    review_progress: "Cartão {current} / {total}",
    empty_1: "Escolha seu nível e seu modo, depois clique em <strong>Começar a conversa</strong>.",
    empty_2: "Seu tutor vai falar em francês e corrigir suas respostas.",
    mic_title: "Falar",
    text_ph: "...ou escreva sua resposta aqui",
    btn_send: "Enviar",
    settings_h: "Configurações",
    label_apikey: "Chave API da Claude",
    apikey_ph: "Cole sua chave aqui",
    privacy_note: "Sua chave é guardada apenas neste navegador (localStorage). Nunca é enviada para nenhum outro lugar além da Claude (Anthropic).",
    azure_h: "Voz premium (opcional)",
    azure_note: "Adicione uma chave Azure Speech para vozes muito mais naturais do que as do navegador. Sem chave, o app continua usando a voz do navegador.",
    label_azure_key: "Chave Azure Speech",
    azure_key_ph: "Cole sua chave Azure aqui",
    label_azure_region: "Região Azure",
    azure_region_ph: "ex: francecentral",
    btn_save: "Salvar",
    status_ready: "Pronto",
    status_listening: "Estou ouvindo...",
    mic_denied: "Microfone recusado. Permita o microfone ou escreva sua resposta.",
    mic_problem: "Problema com o microfone. Você pode escrever sua resposta.",
    need_key: "Adicione sua chave API para começar.",
    preparing: "O tutor está preparando a lição...",
    thinking: "O tutor está pensando...",
    your_turn: "Sua vez. Clique no microfone ou escreva.",
    error_prefix: "Erro: ",
    start_first: "Clique primeiro em Começar a conversa.",
    no_mic: "Seu navegador não suporta o microfone. Use o Chrome/Edge ou escreva suas respostas.",
    no_mic_ios: "O microfone não está disponível em iPhone/iPad, em nenhum navegador (uma limitação do iOS). Escreva suas respostas.",
    reset_ready: "Nova lição pronta. Clique em <strong>Começar a conversa</strong>.",
    err_bubble: "Problema técnico. Detalhe: {msg}\n\nSe você vir \"401\": sua chave API está faltando ou é inválida (⚙️). Se você vir \"Failed to fetch\": o navegador está bloqueando o pedido, vamos configurar um servidor local.",
    c_said: "Você disse", c_better: "Melhor", c_why: "Por quê",
    replay_title: "Ouvir novamente",
    translate_title: "Ver a tradução",
    vocab_clear: "Limpar",
    voice_default: "Voz padrão do navegador",
    grammar_noun_f: "f.", grammar_noun_m: "m.", grammar_infinitive_prefix: "inf.:",
    hint_engine: "Motor", hint_key_ok: "chave OK ✅", hint_key_missing: "chave faltando ⚠️",
    hint_voice: "Voz", hint_mic_ok: "microfone pronto 🎤", hint_mic_no: "microfone indisponível (use o texto)",
    hint_mic_ios: "microfone indisponível em iPhone/iPad (use o texto)",
    hint_mic_brave: "microfone indisponível no Brave ⚠️",
    brave_warning: "⚠️ <strong>Você está usando o Brave</strong>: o reconhecimento de voz não funciona neste navegador (uma limitação deliberada do Brave, não é um erro do app). Use o Chrome ou o Edge para falar com o microfone, ou escreva suas respostas enquanto isso.",
    ios_warning: "⚠️ <strong>Você está no iPhone/iPad</strong>: o microfone não funciona em nenhum navegador no iOS (uma limitação do sistema, não um erro do app). Escreva suas respostas por enquanto, ou use um computador ou um aparelho Android para falar no microfone.",
  },
};

// Pour le format de date du résumé de leçon (toLocaleDateString).
const DATE_LOCALES = { fr: "fr-FR", en: "en-US", es: "es-ES", de: "de-DE", pt: "pt-BR" };

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
  document.querySelectorAll("[data-i18n-label]").forEach((el) => {
    el.label = t(el.getAttribute("data-i18n-label"));
  });
  $("langSelect").value = state.lang;
  // Éléments qui dépendent de l'état, pas seulement d'un attribut fixe.
  updateContextField();
  refreshEngineHint();
  updateReviewButton();
  // Ces panneaux construisent leur propre HTML avec t() au moment du rendu
  // (pas de data-i18n statique) : il faut les redessiner explicitement au
  // changement de langue, sinon leur texte reste figé dans l'ancienne langue.
  renderCorrectionsPanel();
  renderVocabPanel();
  if (!state.started) setStatus(micAvailable() ? t("status_ready") : isIOSDevice ? t("no_mic_ios") : t("no_mic"));
}

$("langSelect").addEventListener("change", (e) => {
  state.lang = e.target.value;
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
//  Réglages (clé API Claude + voix Azure)
// =========================================================
$("settingsBtn").addEventListener("click", openSettings);
$("closeSettings").addEventListener("click", () => ($("settingsModal").hidden = true));
$("saveSettings").addEventListener("click", () => {
  state.apiKey = $("apiKeyInput").value.trim();
  state.azureKey = $("azureKeyInput").value.trim();
  state.azureRegion = $("azureRegionInput").value.trim();
  localStorage.setItem("apiKey", state.apiKey);
  localStorage.setItem("azureKey", state.azureKey);
  localStorage.setItem("azureRegion", state.azureRegion);
  $("settingsModal").hidden = true;
  refreshEngineHint();
  loadVoices();   // la source de voix (Azure ou navigateur) a pu changer
});
function openSettings() {
  $("apiKeyInput").value = state.apiKey;
  $("azureKeyInput").value = state.azureKey;
  $("azureRegionInput").value = state.azureRegion;
  $("settingsModal").hidden = false;
}

// =========================================================
//  Choix de la leçon
// =========================================================
$("levelSelect").addEventListener("change", (e) => (state.level = e.target.value));
$("personaSelect").addEventListener("change", (e) => {
  state.persona = e.target.value;
  // La voix suit automatiquement le genre du personnage historique choisi,
  // sauf si la voix actuelle correspond déjà à ce genre (on ne casse pas un
  // choix déjà cohérent, ex : rester sur Éloïse plutôt que forcer Vivienne
  // pour un autre personnage féminin).
  const requiredGender = PERSONA_GENDER[state.persona];
  if (requiredGender && azureReady() && currentVoiceGender() !== requiredGender) {
    const match = AZURE_VOICES.find((v) => v.gender === requiredGender);
    if (match) {
      selectedVoiceName = match.id;
      localStorage.setItem("voiceNameV2", selectedVoiceName);
      loadVoices();
    }
  }
});
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
  { id: "fr-FR-RemyMultilingualNeural", label: "Rémy ⭐ (homme, très naturel)", gender: "m" },
  { id: "fr-FR-VivienneMultilingualNeural", label: "Vivienne ⭐ (femme, très naturelle)", gender: "f" },
  { id: "fr-FR-LucienMultilingualNeural", label: "Lucien ⭐ (homme, très naturel)", gender: "m" },
  { id: "fr-FR-DeniseNeural", label: "Denise (femme, naturelle)", gender: "f" },
  { id: "fr-FR-HenriNeural", label: "Henri (homme, naturel)", gender: "m" },
  { id: "fr-FR-EloiseNeural", label: "Éloïse (femme, douce)", gender: "f" },
];

function azureReady() {
  return !!(state.azureKey && state.azureRegion);
}

// Genre de la voix actuellement choisie (pour l'accord grammatical du
// tuteur classique, qui n'a pas de genre propre contrairement aux
// personnages historiques). Renvoie null si inconnu (voix du navigateur).
function currentVoiceGender() {
  const v = AZURE_VOICES.find((v) => v.id === selectedVoiceName);
  return v ? v.gender : null;
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

// Le style expressif "chat" rend parfois "où" ambigu (entendu comme
// "tout" par Xavier). Un phonème IPA brut (<phoneme>) a corrigé le
// problème sur les voix Multilingual (Rémy) mais pas sur les autres :
// le support du phonème IPA varie selon la voix chez Azure. La balise
// <sub> est mieux supportée partout : on fait lire "ou" à la place de
// "où" (même prononciation, aucune voix ne le rate).
// \b ne fonctionne pas de façon fiable après "ù" : \w est limité à l'ASCII
// en JS, donc la frontière de mot échoue juste après une lettre accentuée.
// On délimite donc "où" à la main avec des lettres (accentuées incluses).
function wrapPhonemes(escapedText) {
  return escapedText.replace(/(?<![A-Za-zÀ-ÖØ-öø-ÿ])où(?![A-Za-zÀ-ÖØ-öø-ÿ])/gi, (m) => `<sub alias="ou">${m}</sub>`);
}

// Voix Azure : synthèse via l'API REST Cognitive Services. Lève une erreur
// si la clé est invalide ou l'appel échoue, pour que l'appelant puisse
// basculer sur le navigateur.
let currentAzureAudio = null;
// Incrémenté à chaque appel à speak() : sert à repérer un appel devenu
// périmé (une voix plus récente a pris le relais) pour qu'il s'arrête au
// lieu de continuer à jouer ou de ressusciter en arrière-plan.
let speakToken = 0;

// Bascule la classe "speaking" pendant la lecture et libère l'URL objet à
// la fin (fin normale ou erreur). Utilisé par les deux chemins de lecture
// Azure (flux et téléchargement complet) : idempotent, peut être appelé
// plusieurs fois sans risque.
function wireAudioLifecycle(audio, objectUrl) {
  audio.onplay = () => waveform.classList.add("speaking");
  const cleanup = () => { waveform.classList.remove("speaking"); URL.revokeObjectURL(objectUrl); };
  audio.onended = cleanup;
  audio.onerror = cleanup;
  return cleanup;
}

// Découpe un texte en phrases (sur . ! ? …) pour pouvoir lancer la
// synthèse phrase par phrase : la voix démarre dès que la première phrase
// est prête, sans attendre que tout le texte ait été synthétisé.
// Approximatif (une abréviation avec un point coupera à tort), mais sans
// gravité ici : au pire une coupure de phrase un peu maladroite.
function splitSentences(text) {
  const matches = text.match(/[^.!?…]+(?:[.!?…]+|$)/g);
  return (matches || [text]).map((s) => s.trim()).filter(Boolean);
}

// Synthétise une seule phrase et renvoie le blob audio, sans la jouer.
async function fetchAzureAudioBlob(sentence, voiceName) {
  const ratePct = Math.round((voiceRate - 1) * 100);
  const rateAttr = ratePct >= 0 ? `+${ratePct}%` : `${ratePct}%`;
  // Les voix "Multilingual" (Vivienne, Rémy, Lucien) détectent
  // automatiquement la langue mot par mot. Un mot isolé qui existe aussi
  // en anglais (ex : "aspect") peut alors être prononcé avec un accent
  // anglais, surtout sans phrase autour pour donner un indice de langue.
  // On force le français avec la balise <lang> pour ces voix-là.
  const isMultilingual = voiceName.toLowerCase().includes("multilingual");
  const body = wrapPhonemes(escapeSSML(sentence));
  const spoken = isMultilingual ? `<lang xml:lang="fr-FR">${body}</lang>` : body;
  // Style "chat" : ton conversationnel plus naturel (moins plat, surtout
  // sur les questions) que la lecture neutre par défaut. Si la voix ne le
  // supporte pas, Azure l'ignore simplement sans erreur.
  const ssml = `<speak version="1.0" xml:lang="fr-FR" xmlns:mstts="https://www.w3.org/2001/mstts"><voice name="${voiceName}"><mstts:express-as style="chat"><prosody rate="${rateAttr}">${spoken}</prosody></mstts:express-as></voice></speak>`;

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
  return res.blob();
}

// Joue un blob déjà synthétisé jusqu'à la fin (nécessaire pour enchaîner
// sur la phrase suivante au bon moment). Se résout sans jouer si une voix
// plus récente a pris le relais entre-temps (jeton périmé).
function playAzureBlob(blob, token) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    if (token !== speakToken) { URL.revokeObjectURL(url); resolve(); return; }
    const audio = new Audio(url);
    currentAzureAudio = audio;
    const cleanup = wireAudioLifecycle(audio, url);
    audio.onended = () => { cleanup(); resolve(); };
    audio.onerror = () => { cleanup(); reject(new Error("Azure audio playback error")); };
    audio.play().catch((err) => { cleanup(); reject(err); });
  });
}

async function speakAzure(text, token) {
  // Figée une seule fois pour toute la réponse : si la voix sélectionnée
  // changeait entre deux phrases (ex : rechargement de la liste des voix
  // pendant la lecture), chaque phrase suivante aurait pu repartir avec
  // une voix différente de la première.
  const voiceName = selectedVoiceName;
  const sentences = splitSentences(text);

  // Une seule phrase : pas de gain à découper, chemin simple direct.
  if (sentences.length <= 1) {
    const blob = await fetchAzureAudioBlob(text, voiceName);
    if (token !== speakToken) return;
    await playAzureBlob(blob, token);
    return;
  }

  // Plusieurs phrases : on synthétise la suivante PENDANT que la
  // précédente joue, pour réduire le silence avant le début et entre les
  // phrases, sans le mécanisme de flux binaire (MediaSource) qui avait
  // cassé le son.
  let nextBlobPromise = fetchAzureAudioBlob(sentences[0], voiceName);
  for (let i = 0; i < sentences.length; i++) {
    if (token !== speakToken) return;
    const blob = await nextBlobPromise;
    if (token !== speakToken) return;
    if (i + 1 < sentences.length) {
      nextBlobPromise = fetchAzureAudioBlob(sentences[i + 1], voiceName);
    }
    await playAzureBlob(blob, token);
  }
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

// Un tiret entre deux nombres (ex : "25-30 minutes") est parfois lu chiffre
// par chiffre par les moteurs vocaux, comme un code plutôt qu'une fourchette
// naturelle. On le remplace par "à" avant de parler. Couvre aussi les tirets
// typographiques (–, —, tiret insécable...) que l'IA utilise parfois à la
// place d'un simple "-".
function normalizeForSpeech(text) {
  return String(text || "").replace(/(\d+)\s*[-‑–—−]\s*(\d+)/g, "$1 à $2");
}

function speak(text) {
  const spoken = normalizeForSpeech(text);
  const token = ++speakToken;
  if (currentAzureAudio) { currentAzureAudio.pause(); currentAzureAudio = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (azureReady()) {
    speakAzure(spoken, token).catch((err) => {
      if (token !== speakToken) return;   // supplanté entre-temps, inutile de basculer sur le navigateur
      console.warn("Azure TTS a échoué, repli sur la voix du navigateur :", err);
      speakBrowser(spoken);
    });
  } else {
    speakBrowser(spoken);
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
// Deux moteurs possibles, avec repli automatique du premier vers le second :
// - Azure Speech (prioritaire si une clé est configurée) : plus robuste
//   sur les accents étrangers, et fonctionne même sur iOS (simple accès
//   micro, pas de dépendance au moteur propriétaire du navigateur).
// - Le moteur du navigateur (Web Speech API), gratuit mais absent sur iOS
//   (Safari, Chrome et Edge y utilisent tous le moteur WebKit d'Apple).
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

let listening = false;
let usingAzureStt = false;
let azureRecognizer = null;
let azureFinalText = "";
// Passe à true dès qu'Azure échoue une fois (quota des 5h gratuites dépassé,
// clé invalide, etc.) : on ne le retente plus pour le reste de la session,
// repli définitif et silencieux sur le moteur du navigateur.
let azureSttBroken = false;

function hasAzureKey() {
  return !!(state.azureKey && state.azureRegion);
}
function canUseAzureStt() {
  return hasAzureKey() && !azureSttBroken && !!window.SpeechSDK;
}
function micAvailable() {
  return canUseAzureStt() || !!SR;
}

function finishListening(text) {
  listening = false;
  usingAzureStt = false;
  micBtn.classList.remove("listening");
  waveform.classList.remove("active");
  const trimmed = (text || "").trim();
  if (trimmed) sendMessage(trimmed, false, true);
  else setStatus(t("status_ready"));
}

// ---- Repli : moteur du navigateur ----
// Fusionne un nouveau segment final avec le texte déjà accumulé. Sur
// certains moteurs vocaux (Android notamment), chaque "segment final"
// n'est pas un nouveau bout de phrase : c'est une réémission de TOUT
// l'énoncé depuis le début, de plus en plus long ("bonjour" -> "bonjour,
// je" -> "bonjour, je sais" -> "bonjour, je sais pas"). Les additionner
// donnait un texte dupliqué en boucle. On remplace quand le nouveau
// segment prolonge (ou est prolongé par) l'existant, et on additionne
// seulement s'il s'agit d'un morceau vraiment distinct (comparaison
// insensible à la casse, car la reprise n'a pas toujours la même
// majuscule initiale que le premier envoi). Azure segmente proprement et
// n'a pas ce défaut, donc ce correctif ne concerne que ce moteur-ci.
function mergeFinalSegment(current, incoming) {
  if (!current) return incoming;
  if (!incoming) return current;
  const curLower = current.toLowerCase();
  const incLower = incoming.toLowerCase();
  if (incLower.startsWith(curLower)) return incoming;
  if (curLower.startsWith(incLower)) return current;
  return current + incoming;
}

let browserRecognition = null;
if (SR) {
  browserRecognition = new SR();
  browserRecognition.lang = "fr-FR";
  browserRecognition.continuous = true;   // enregistre jusqu'au prochain clic
  browserRecognition.interimResults = true;

  let browserFinalText = "";
  browserRecognition.onstart = () => {
    listening = true;
    usingAzureStt = false;
    browserFinalText = "";
    micBtn.classList.add("listening");
    waveform.classList.add("active");
    setStatus(t("status_listening"));
  };
  browserRecognition.onresult = (e) => {
    let interim = "";
    for (let i = 0; i < e.results.length; i++) {
      if (e.results[i].isFinal) browserFinalText = mergeFinalSegment(browserFinalText, e.results[i][0].transcript);
      else interim += e.results[i][0].transcript;
    }
    setStatus(interim || browserFinalText || "...");
  };
  browserRecognition.onerror = (e) => {
    console.error("Erreur reconnaissance vocale (navigateur) :", e.error);
    setStatus(e.error === "not-allowed" ? t("mic_denied") : `${t("mic_problem")} (${e.error})`);
  };
  browserRecognition.onend = () => finishListening(browserFinalText);
}

function startBrowserRecognition() {
  usingAzureStt = false;
  if (!browserRecognition) return;
  try { browserRecognition.start(); } catch (_) {}
}

// ---- Prioritaire : Azure Speech-to-Text ----
function startAzureRecognition() {
  const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(state.azureKey, state.azureRegion);
  speechConfig.speechRecognitionLanguage = "fr-FR";
  const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
  const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
  azureRecognizer = recognizer;
  azureFinalText = "";

  recognizer.recognizing = (_s, e) => {
    const preview = azureFinalText ? `${azureFinalText} ${e.result.text}` : e.result.text;
    setStatus(preview || t("status_listening"));
  };
  recognizer.recognized = (_s, e) => {
    if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
      azureFinalText = azureFinalText ? `${azureFinalText} ${e.result.text}` : e.result.text;
    }
  };
  recognizer.canceled = (_s, e) => {
    if (azureRecognizer !== recognizer) return;   // déjà arrêté/remplacé par ailleurs, cet événement tardif ne concerne plus l'écoute en cours
    if (e.reason !== SpeechSDK.CancellationReason.Error) return;   // arrêt normal (clic sur le micro), pas une erreur
    console.error("Erreur reconnaissance vocale (Azure) :", e.errorCode, e.errorDetails);
    azureSttBroken = true;
    azureRecognizer = null;
    recognizer.close();
    // On repasse au moteur du navigateur sans couper l'élève : s'il avait
    // déjà commencé à parler, on envoie ce qui a été compris jusque-là ;
    // sinon on relance directement l'écoute avec le moteur de secours.
    if (azureFinalText.trim() || !SR) {
      finishListening(azureFinalText);
    } else {
      startBrowserRecognition();
    }
  };

  recognizer.startContinuousRecognitionAsync(
    () => {
      // Condition de course possible : sur un échec de connexion rapide (clé
      // invalide, quota dépassé...), l'événement "canceled" peut arriver
      // AVANT ce callback de succès (qui ne confirme que le démarrage local,
      // pas la connexion réseau réelle). Si ce recognizer a déjà été
      // invalidé entre-temps (repli déjà enclenché), on ignore ce callback
      // tardif pour ne pas écraser l'état déjà remis à zéro.
      if (azureRecognizer !== recognizer) return;
      listening = true;
      usingAzureStt = true;
      micBtn.classList.add("listening");
      waveform.classList.add("active");
      setStatus(t("status_listening"));
    },
    (err) => {
      if (azureRecognizer !== recognizer) return;
      console.error("Échec démarrage Azure STT :", err);
      azureSttBroken = true;
      recognizer.close();
      azureRecognizer = null;
      if (SR) startBrowserRecognition();
      else setStatus(`${t("mic_problem")} (Azure)`);
    }
  );
}

micBtn.addEventListener("click", () => {
  if (!micAvailable()) return;
  if (listening) {
    if (usingAzureStt && azureRecognizer) {
      const recognizer = azureRecognizer;
      azureRecognizer = null;
      recognizer.stopContinuousRecognitionAsync(
        () => { recognizer.close(); finishListening(azureFinalText); },
        (err) => { console.error("Erreur à l'arrêt Azure STT :", err); recognizer.close(); finishListening(azureFinalText); }
      );
    } else if (browserRecognition) {
      browserRecognition.stop();
    }
    return;
  }
  speechSynthesis.cancel();          // on ne parle pas par-dessus le tuteur
  if (canUseAzureStt()) startAzureRecognition();
  else startBrowserRecognition();
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
// Pris au début de la leçon pour pouvoir calculer, à la fin, ce qui a été
// appris PENDANT cette leçon (durée, nouveaux mots, nouvelles corrections)
// plutôt que le total cumulé depuis toujours.
let lessonStartTime = null;
let vocabCountAtStart = 0;
let correctionsCountAtStart = 0;

function formatLessonDuration(ms) {
  const minutes = Math.round(ms / 60000);
  return minutes < 1 ? t("summary_less_minute") : t("summary_minutes").replace("{n}", minutes);
}

// Calculée une seule fois, à l'affichage du résumé, et réutilisée pour le
// PDF : state.messages est déjà vidé par le moment où l'élève clique sur
// "Télécharger" (le clic sur "Terminer" fait les deux à la suite).
let lastLessonSummary = null;

function buildLessonSummaryData() {
  // Reconstruit la conversation lisible à partir de l'historique brut :
  // on saute le déclencheur système qui lance la leçon (jamais dit par
  // l'élève) et on relit le JSON de chaque réponse pour n'en garder que
  // le texte parlé ("reply"), pas le JSON complet stocké en mémoire.
  const transcript = [];
  state.messages.forEach((m) => {
    if (m.role === "user") {
      if (m.content.startsWith("[Début de la leçon")) return;
      transcript.push({ role: "user", text: m.content });
    } else if (m.role === "assistant") {
      const data = parseTutorJSON(m.content);
      if (data.reply) transcript.push({ role: "tutor", text: data.reply });
    }
  });

  return {
    dateText: new Date().toLocaleDateString(DATE_LOCALES[state.lang] || "en-US", {
      day: "numeric", month: "long", year: "numeric",
    }),
    durationText: lessonStartTime ? formatLessonDuration(Date.now() - lessonStartTime) : "",
    exchangeCount: state.messages.filter((m) => m.role === "user").length,
    newWords: savedVocab.slice(0, Math.max(0, savedVocab.length - vocabCountAtStart)),
    newCorrections: savedCorrections.slice(0, Math.max(0, savedCorrections.length - correctionsCountAtStart)),
    transcript,
  };
}

function showLessonSummary() {
  lastLessonSummary = buildLessonSummaryData();
  const { dateText, durationText, exchangeCount, newWords, newCorrections } = lastLessonSummary;

  const wordsHtml = newWords.length
    ? `<ul class="summary-list">${newWords.map((v) => `<li><strong>${escapeHtml(v.word)}</strong>${escapeHtml(vocabGrammarSuffix(v))} — ${escapeHtml(v.translation || "")}${v.example ? `<br><span class="small muted">${escapeHtml(v.example)}${v.exampleTranslation ? ` — ${escapeHtml(v.exampleTranslation)}` : ""}</span>` : ""}</li>`).join("")}</ul>`
    : `<p class="small muted">${t("summary_no_new_words")}</p>`;
  const correctionsHtml = newCorrections.length
    ? `<ul class="summary-list">${newCorrections.map((c) => `<li><strong>${escapeHtml(c.original || "")}</strong> → ${escapeHtml(c.better)}${c.explanation ? `<br><span class="small muted">${escapeHtml(c.explanation)}</span>` : ""}</li>`).join("")}</ul>`
    : `<p class="small muted">${t("summary_no_corrections")}</p>`;

  $("summaryBody").innerHTML = `
    <div class="summary-row"><span class="summary-tag">${t("summary_date")}</span><span>${dateText}</span></div>
    <div class="summary-row"><span class="summary-tag">${t("summary_duration")}</span><span>${durationText}</span></div>
    <div class="summary-row"><span class="summary-tag">${t("summary_exchanges")}</span><span>${exchangeCount}</span></div>
    <h3 class="modal-subhead">${t("summary_new_words")} (${newWords.length})</h3>
    ${wordsHtml}
    <h3 class="modal-subhead">${t("summary_corrections")} (${newCorrections.length})</h3>
    ${correctionsHtml}
  `;
  $("summaryModal").hidden = false;
}

$("closeSummary").addEventListener("click", () => ($("summaryModal").hidden = true));

// Export en PDF direct (jsPDF, chargé localement dans vendor/) : construit
// le fichier dans le navigateur et déclenche son téléchargement en un
// clic, sans passer par la fenêtre d'impression.
function exportSummaryAsPdf(includeTranscript) {
  if (!lastLessonSummary || !window.jspdf) return;
  const { dateText, durationText, exchangeCount, newWords, newCorrections, transcript } = lastLessonSummary;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const marginLeft = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Découpe le texte pour qu'il tienne dans la largeur de page (les
  // répliques de conversation, contrairement aux mots de vocabulaire,
  // peuvent être longues) et gère le passage à la page suivante.
  const addLine = (text, x, size) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, pageWidth - x - marginLeft);
    lines.forEach((line) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, x, y);
      y += size >= 13 ? 8 : 6;
    });
  };

  addLine(t("summary_h"), marginLeft, 16);
  y += 2;
  addLine(`${t("summary_date")} : ${dateText}`, marginLeft, 11);
  addLine(`${t("summary_duration")} : ${durationText}`, marginLeft, 11);
  addLine(`${t("summary_exchanges")} : ${exchangeCount}`, marginLeft, 11);
  y += 4;

  addLine(`${t("summary_new_words")} (${newWords.length})`, marginLeft, 13);
  if (newWords.length) {
    newWords.forEach((v) => {
      addLine(`- ${v.word}${vocabGrammarSuffix(v)} — ${v.translation || ""}`, marginLeft + 3, 11);
      if (v.example) addLine(`${v.example}${v.exampleTranslation ? ` — ${v.exampleTranslation}` : ""}`, marginLeft + 6, 10);
    });
  } else {
    addLine(t("summary_no_new_words"), marginLeft + 3, 11);
  }
  y += 4;

  addLine(`${t("summary_corrections")} (${newCorrections.length})`, marginLeft, 13);
  if (newCorrections.length) {
    newCorrections.forEach((c) => {
      addLine(`- ${c.original || ""} -> ${c.better}`, marginLeft + 3, 11);
      if (c.explanation) addLine(c.explanation, marginLeft + 6, 10);
    });
  } else {
    addLine(t("summary_no_corrections"), marginLeft + 3, 11);
  }

  // Transcription complète en annexe (page à part), seulement si l'élève
  // a coché la case : ce n'est pas ce qui aide le plus à réviser, donc ça
  // reste optionnel plutôt que systématique.
  if (includeTranscript && transcript.length) {
    doc.addPage();
    y = 20;
    addLine(t("summary_transcript"), marginLeft, 16);
    y += 2;
    transcript.forEach((turn) => {
      const label = turn.role === "user" ? t("summary_transcript_student") : t("summary_transcript_tutor");
      addLine(`${label} : ${turn.text}`, marginLeft, 11);
      y += 2;
    });
  }

  doc.save("resume-lecon.pdf");
}
$("downloadSummaryBtn").addEventListener("click", () => {
  exportSummaryAsPdf($("includeTranscriptCheckbox").checked);
});

$("startBtn").addEventListener("click", startLesson);
$("resetBtn").addEventListener("click", () => {
  if (state.started && state.messages.some((m) => m.role === "user")) {
    showLessonSummary();
  }
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
  lessonStartTime = Date.now();
  vocabCountAtStart = savedVocab.length;
  correctionsCountAtStart = savedCorrections.length;
  transcriptEl.innerHTML = "";
  micBtn.disabled = !micAvailable();
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
  louis16:
    "Tu incarnes Louis XVI, le roi de France né à Versailles en 1754 et mort guillotiné à Paris en 1793. " +
    "Tu peux raconter ta vie et parler de toi : ton mariage à 15 ans avec Marie-Antoinette, princesse autrichienne, arrangé pour sceller une alliance entre la France et l'Autriche, " +
    "ton sacre comme roi en 1774 à seulement 19 ans, alors que tu ne t'y attendais pas vraiment et que tu te sentais mal préparé à régner, " +
    "ton goût personnel pour la serrurerie, que tu pratiquais comme passe-temps dans un atelier, et pour la géographie, qui t'a poussé à financer l'expédition de La Pérouse autour du monde, " +
    "ton soutien financier et militaire à la Révolution américaine contre l'Angleterre, qui a vidé un peu plus les caisses du royaume déjà fragiles, " +
    "la grave crise financière et les mauvaises récoltes qui ont mené à la convocation des États généraux en 1789, point de départ de la Révolution française, " +
    "ta tentative de fuite déguisé avec ta famille en 1791, arrêtée à Varennes, qui a brisé la confiance du peuple envers toi, " +
    "et ton procès devant la Convention nationale, ta condamnation pour trahison, et ton exécution le 21 janvier 1793 sur la place de la Révolution à Paris. " +
    "Tu es bienveillant, timide, indécis et plus à l'aise seul dans ton atelier de serrurerie qu'au milieu de la cour, et tu regrettes de ne pas avoir su agir plus fermement face aux événements qui t'ont dépassé.",
  veil:
    "Tu incarnes Simone Veil, née Simone Jacob à Nice en 1927 et morte à Paris en 2017. " +
    "Tu peux raconter ta vie et parler de toi : ta déportation à seulement 16 ans, avec ta mère et ta sœur, au camp d'Auschwitz-Birkenau en 1944, où ta mère est morte et où toi et tes sœurs avez survécu, " +
    "ton retour en France après la guerre, tes études de droit et de sciences politiques, et ta carrière de magistrate où tu as amélioré les conditions de détention des prisonniers, " +
    "ton rôle de ministre de la Santé à partir de 1974, et ton combat, en 1974 et 1975, pour faire adopter la loi qui a légalisé l'avortement en France, malgré des débats très violents à l'Assemblée nationale et des attaques personnelles, " +
    "ton élection comme première présidente du Parlement européen élu au suffrage universel direct, en 1979, et ton engagement de toute une vie pour la construction européenne, " +
    "et ton entrée à l'Académie française en 2008, puis ton entrée au Panthéon en 2018, aux côtés de ton mari Antoine, pour l'ensemble de ton engagement politique et humain. " +
    "Tu disais que la loi sur l'avortement était nécessaire mais que tu ne l'avais jamais votée « de gaîté de cœur », et tu as consacré une grande partie de ta vie à la mémoire de la Shoah. " +
    "Tu es droite, courageuse, déterminée et directe, capable de tenir tête à l'hostilité, et profondément marquée par ce que tu as vécu et vu pendant la guerre.",
};

// Genre réel de chaque personnage historique, pour que l'accord grammatical
// (adjectifs, participes passés) quand il/elle parle de lui/elle-même soit
// toujours correct. Le tuteur classique n'a pas de genre défini : il suit
// alors la voix choisie (voir currentVoiceGender()).
const PERSONA_GENDER = {
  hugo: "m", vangogh: "m", stromae: "m",
  curie: "f", napoleon: "m", zidane: "m", guetta: "m", bardot: "f",
  louis16: "m", veil: "f",
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
    "Niveau intermédiaire (B1). " +
    "Vocabulaire : plus large que le débutant, avec des mots abstraits simples et des expressions usuelles de la vie courante. Pas encore d'expressions idiomatiques. " +
    "Temps verbaux : passé composé et imparfait en contraste, futur simple, conditionnel présent pour la politesse et les hypothèses simples, et le subjonctif présent UNIQUEMENT dans des tournures figées très courantes (« il faut que », « je voudrais que », « je ne pense pas que »). " +
    "Phrases : de longueur moyenne, avec des subordonnées relatives simples (qui, que, où). Connecteurs de base : donc, parce que, ensuite, cependant, mais.",
  intermediaire_avance:
    "Niveau intermédiaire avancé (B2). " +
    "Vocabulaire : large, avec des mots abstraits variés, des nuances de sentiments et d'opinions, et quelques expressions idiomatiques courantes. " +
    "Temps verbaux : plus-que-parfait, subjonctif présent plus librement (pas seulement dans des tournures figées), conditionnel passé simple, début de concordance des temps. " +
    "Phrases : plus longues, avec des subordonnées causales et concessives simples (bien que). Connecteurs logiques variés : par contre, en revanche, du coup, en effet, malgré tout.",
  avance:
    "Niveau avancé (C1-C2). " +
    "Vocabulaire : riche et nuancé, expressions idiomatiques, registre soutenu quand le contexte s'y prête, mots précis ou spécialisés selon le sujet abordé. " +
    "Temps verbaux : tous les temps et modes disponibles, subjonctif et conditionnel passé, concordance des temps. " +
    "Phrases : complexes, avec plusieurs subordonnées enchâssées. Connecteurs logiques sophistiqués : bien que, quoique, de sorte que, en dépit de, de même que. N'hésite pas aux nuances stylistiques et sous-entendus.",
};

// Découpé en deux prompts distincts (réponse / correction), appelés en
// parallèle depuis sendMessage() : la voix n'attend plus que la correction,
// souvent plus longue à écrire, ait fini d'être générée.
function buildReplySystemPrompt() {
  const personaText = personas[state.persona];
  const intro = personaText
    ? `${personaText}
Tu restes toujours dans ce personnage et tu peux parler librement de ta vie, de ton passé, de tes émotions et de ta personnalité.
TRÈS IMPORTANT : exprime-toi dans un français moderne, jamais dans un style d'époque ou exagérément littéraire, car la personne apprend le français et doit te comprendre. La richesse de ton vocabulaire doit suivre le niveau de l'apprenant précisé plus bas, pas ton époque d'origine.
Tu es aussi un professeur de français bienveillant, mais tu ne corriges JAMAIS l'apprenant dans ta réponse : tu continues simplement la conversation (les corrections sont gérées ailleurs, pas ici).`
    : "Tu es un professeur de français langue étrangère, patient, encourageant et naturel. Tu n'es jamais robotique. De temps en temps, quand une vraie occasion se présente naturellement dans la conversation (une réponse surprenante de l'apprenant, un jeu de mots possible, une situation cocasse), tu peux glisser une touche d'humour léger. Ce n'est jamais systématique ni forcé : la plupart de tes réponses restent simplement chaleureuses, sans chercher à être drôle à tout prix.";

  const modeText = {
    libre: "Conversation libre sur le sujet que l'apprenant veut.",
    guidee: `Conversation guidée sur le thème : ${state.context || "au choix"}. Rends la difficulté progressive.`,
    roleplay: `Jeu de rôle. Scénario : ${state.context || "au choix"}. Joue pleinement ton personnage, en suivant un déroulé réaliste et dans l'ordre logique de la vraie vie pour cette situation, étape par étape (par exemple, au restaurant : demander d'abord s'il y a une réservation, puis le nombre de personnes, avant d'installer les clients et de présenter le menu). Ne saute pas d'étapes et ne pars pas dans une autre direction avant d'avoir naturellement progressé dans la situation.`,
    grammaire: `Leçon de grammaire interactive sur : ${state.context || "au choix"}. Ne fais pas de longs exposés : pose des questions et guide l'apprenant vers la règle.`,
  }[state.mode];

  const levelGuidance = LEVEL_GUIDANCE[state.level] || LEVEL_GUIDANCE.intermediaire;

  // Le genre du personnage historique est réel et fixe (ex : Marie Curie
  // reste une femme quelle que soit la voix choisie). Le tuteur classique
  // n'a pas de genre propre : il suit la voix sélectionnée, pour que
  // l'accord grammatical corresponde à ce qu'on entend.
  const gender = PERSONA_GENDER[state.persona] || currentVoiceGender();
  const genderHint = gender === "f"
    ? "\n- Tu es une femme : accorde TOUJOURS au féminin tout ce qui te concerne personnellement (adjectifs, participes passés), par exemple « je suis contente », « je suis née », « je suis fatiguée »."
    : gender === "m"
    ? "\n- Tu es un homme : accorde TOUJOURS au masculin tout ce qui te concerne personnellement (adjectifs, participes passés), par exemple « je suis content », « je suis né », « je suis fatigué »."
    : "";

  return `${intro}
${levelGuidance}
Respecte STRICTEMENT ces repères de niveau à chaque réponse, aussi bien dans ton vocabulaire que dans la construction de tes phrases.
Mode de la séance : ${modeText}

Règles :
- RÈGLE LA PLUS IMPORTANTE, à vérifier avant d'envoyer ta réponse : ne pose JAMAIS de question avec l'inversion sujet-verbe (comme « Rêves-tu ? », « As-tu... ? », « Aimes-tu... ? », « Veux-tu... ? », « Peux-tu... ? », « Aime-t-il... ? »), même avec un apprenant avancé. C'est un registre soutenu et littéraire que les francophones n'utilisent presque jamais à l'oral : ça sonnerait artificiel venant de toi. Utilise TOUJOURS soit l'intonation simple, sujet avant le verbe (« Tu rêves ? », « Tu veux... ? »), soit « est-ce que » (« Est-ce que tu rêves ? », « Est-ce que tu veux... ? »). Avant d'écrire un point d'interrogation, relis ta phrase et vérifie qu'aucun verbe n'est suivi d'un tiret puis d'un pronom (tu/vous/il/elle/on/nous/ils/elles) : si c'est le cas, réécris la question avec le sujet placé avant le verbe.
- Parle UNIQUEMENT en français dans le champ "reply" (sauf une traduction courte d'un mot difficile si vraiment utile).
- Écris toujours dans un français IMPECCABLE, naturel et idiomatique, digne d'un professeur natif expérimenté. Aucune faute, aucune tournure maladroite ou traduite.${genderHint}
- Ne corrige JAMAIS et ne signale JAMAIS les erreurs de l'apprenant dans ta réponse. Réagis seulement au sens de ce qu'il dit et continue la conversation naturellement.
- Garde tes réponses courtes et naturelles, comme à l'oral. Pose une question de suivi pour relancer.

Tu DOIS répondre EXCLUSIVEMENT avec un objet JSON valide, sans aucun texte autour, avec cette forme exacte :
{
  "userText": "la phrase de l'apprenant réécrite avec une ponctuation soignée : majuscule au début, virgules si besoin, et point ou point d'interrogation à la fin. Garde EXACTEMENT ses mots, ne corrige PAS la grammaire dans ce champ.",
  "reply": "ta réponse orale en français, courte"
}
Ne mets rien d'autre que ce JSON.`;
}

// Analyse UNIQUEMENT le dernier message de l'apprenant (pas tout
// l'historique) : plus rapide et moins cher, puisque rien de tout ça
// n'a besoin du contexte des tours précédents pour juger une phrase isolée.
function buildCorrectionSystemPrompt(fromVoice) {
  const explLang = { en: "anglais", es: "espagnol", de: "allemand", pt: "portugais brésilien" }[state.lang] || "français";
  const modeHint = state.mode === "roleplay" && state.context
    ? `Contexte du jeu de rôle en cours : ${state.context}. Si ce contexte impose le vouvoiement (entretien d'embauche, administration, médecin...), ne considère pas le vouvoiement de l'apprenant comme une faute, c'est attendu.`
    : "";
  // La reconnaissance vocale du navigateur capitalise parfois par erreur un
  // mot ordinaire en plein milieu de la phrase (surtout les noms de langue
  // ou de nationalité), sans que l'apprenant y soit pour quelque chose. On
  // ne relâche cette règle QUE pour la voix : au clavier, une majuscule
  // injustifiée reste une vraie faute à corriger (erreur fréquente chez les
  // anglophones sur les noms de langue).
  const voiceHint = fromVoice
    ? `\n- Ce message vient de la reconnaissance vocale du navigateur, pas du clavier : elle capitalise parfois par erreur un mot ordinaire au milieu de la phrase (ex : "le Français" au lieu de "le français"), même si l'apprenant ne l'a pas prononcé avec une majuscule. NE corrige PAS une majuscule inattendue sur un mot par ailleurs bien orthographié : ce n'est pas une faute de l'apprenant, mais un artefact de la transcription. Continue bien sûr à corriger toutes les vraies fautes de langue (conjugaison, accord, élision, orthographe, vocabulaire).
- Autre artefact possible de la reconnaissance vocale : un mot ou un groupe de mots répété consécutivement à l'identique sans raison (ex : "je voudrais je voudrais un café", "un café un café"), causé par le moteur de transcription, pas par l'apprenant. NE traite JAMAIS cette répétition comme une faute de langue. Si la phrase, une fois la répétition ignorée, est par ailleurs correcte, mets "correction" à null.`
    : "";

  return `Tu es un EXPERT de la grammaire et de l'orthographe françaises. Ta seule tâche : analyser UNE phrase dite par un apprenant de français langue étrangère et repérer ses éventuelles fautes. ${modeHint}${voiceHint}

Règle des corrections (TRÈS IMPORTANT) :
- Ne corrige QUE les vraies fautes. Une faute, c'est une erreur de conjugaison, d'orthographe, d'accord, de genre, de vocabulaire, d'élision ou une structure vraiment incorrecte.
- Dès qu'il y a au moins une vraie faute, "correction" ne doit JAMAIS être null.
- Vérifie SYSTÉMATIQUEMENT chaque mot de la phrase un par un, ne te contente pas d'une lecture globale rapide : les fautes discrètes (une lettre, une élision manquante, un petit mot mal accordé) sont aussi importantes à corriger que les grosses fautes.
- Fais particulièrement attention à l'ÉLISION : "de", "le", "la", "que", "ne", "je", "me", "te", "se", "ce" doivent devenir "d'", "l'", "qu'", "n'", "j'", "m'", "t'", "s'", "c'" devant un mot commençant par une voyelle ou un h muet. Exemple de faute à corriger : « avant de être » doit devenir « avant d'être ». Autres exemples : « le enfant » → « l'enfant », « que il vient » → « qu'il vient », « je ai » → « j'ai ».
- Fais particulièrement attention à l'ACCORD SUJET-VERBE, même dans une phrase très simple et très courte : "tu" + verbe au présent se termine TOUJOURS en "-es" ou "-s" (jamais "-e" seul), sauf "tu peux", "tu veux", "tu vas". Exemple de faute à corriger : « tu prononce » doit devenir « tu prononces ». Vérifie aussi les accords avec "il/elle" (-e), "nous" (-ons), "vous" (-ez), "ils/elles" (-ent).
- Quand la phrase contient une ou plusieurs vraies fautes, corrige-les TOUTES d'un coup. Repère chaque erreur : conjugaison, temps verbal, accord en genre et en nombre, article, préposition, orthographe, choix du mot, syntaxe. Le champ "better" doit être la phrase ENTIÈREMENT corrigée, et "explanation" doit expliquer brièvement CHAQUE faute corrigée (une courte phrase par faute).
- Ne mentionne et NE CORRIGE JAMAIS la majuscule en début de phrase, le point final, ou l'ajout de virgules « pour la clarté » : ce sont des détails de mise en forme (gérés séparément par l'application, surtout pour la voix, qui n'a ni majuscule ni ponctuation), pas des fautes de français. Le champ "correction" doit porter UNIQUEMENT sur du contenu linguistique réel (conjugaison, orthographe, accord, élision, genre, vocabulaire, syntaxe), jamais sur la ponctuation ou les majuscules de la phrase.
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
  "correction": { "original": "ce que l'apprenant a dit", "better": "version corrigée en français", "explanation": "explication courte et simple en ${explLang}" } ou null
}
Ne mets rien d'autre que ce JSON.`;
}

// =========================================================
//  Traduction à la demande d'une réplique du tuteur (langue d'interface)
// =========================================================
function buildTranslatePrompt() {
  const targetLang = { en: "anglais", es: "espagnol", de: "allemand", pt: "portugais brésilien" }[state.lang] || "anglais";
  return `Tu es un traducteur français-${targetLang} expert, utilisé dans une application d'apprentissage du français.
On te donne une phrase dite par un tuteur de français à un apprenant.
Réponds EXCLUSIVEMENT avec un objet JSON valide, sans aucun texte autour, avec cette forme exacte :
{
  "translation": "traduction naturelle et fluide de la phrase en ${targetLang}"
}
Ne mets rien d'autre que ce JSON.`;
}

async function translateBubble(text, btn, box) {
  if (box.dataset.loaded) {
    box.hidden = !box.hidden;
    return;
  }
  btn.classList.add("looking-up");
  try {
    const raw = await callProvider(buildTranslatePrompt(), [{ role: "user", content: text }]);
    const data = parseJSON(raw, { translation: "" });
    box.textContent = data.translation || "";
    box.dataset.loaded = "1";
    box.hidden = false;
  } catch (err) {
    console.warn("Traduction indisponible :", err);
  } finally {
    btn.classList.remove("looking-up");
  }
}

// =========================================================
//  Recherche d'un mot cliqué dans le chat (vocabulaire à la demande)
// =========================================================
function buildVocabLookupPrompt() {
  const targetLang = { en: "anglais", es: "espagnol", de: "allemand", pt: "portugais brésilien" }[state.lang] || "anglais";
  return `Tu es un dictionnaire français-${targetLang} expert, utilisé dans une application d'apprentissage du français.
On te donne un mot ou une courte expression française, cliqué par un apprenant dans une phrase, avec la phrase complète comme contexte.
Réponds EXCLUSIVEMENT avec un objet JSON valide, sans aucun texte autour, avec cette forme exacte :
{
  "word": "le mot ou l'expression exactement comme on te l'a donné, sans le modifier (SAUF cas du verbe pronominal, voir règle plus bas)",
  "translation": "traduction en ${targetLang}, courte et naturelle, adaptée au contexte donné",
  "gender": "m" ou "f" si le mot est un nom commun (indique son genre), sinon null,
  "infinitive": "la forme infinitive" si le mot est un verbe conjugué et que sa forme diffère de l'infinitif, sinon null,
  "masculine": "la forme masculin singulier" si le mot est un adjectif, sinon null,
  "masculinePlural": "la forme masculin pluriel" si le mot est un adjectif, sinon null,
  "feminine": "la forme féminin singulier" si le mot est un adjectif, sinon null,
  "femininePlural": "la forme féminin pluriel" si le mot est un adjectif, sinon null,
  "example": "une phrase simple et naturelle en français utilisant ce mot, différente de la phrase donnée en contexte",
  "exampleTranslation": "traduction naturelle de cette phrase d'exemple en ${targetLang}"
}
Pour un adjectif, donne TOUJOURS les 4 formes (masculine, masculinePlural, feminine, femininePlural), même si l'une d'elles est identique au mot donné (ex : pour "rouge", masculine et feminine valent tous les deux "rouge").
Un mot ne peut appartenir qu'à UNE SEULE catégorie à la fois (nom commun / verbe / adjectif), jamais plusieurs en même temps. Certains mots en "-ant" comme "surprenant" ou "intéressant" peuvent être soit un participe présent (verbe, invariable), soit un adjectif (variable en genre et en nombre) : regarde la PHRASE donnée en contexte pour trancher.
- S'il fonctionne comme un ADJECTIF dans cette phrase (il décrit un nom, il pourrait varier en genre/nombre) : remplis UNIQUEMENT masculine/masculinePlural/feminine/femininePlural. Laisse "gender" et "infinitive" à null.
- S'il fonctionne comme un VERBE conjugué dans cette phrase : remplis UNIQUEMENT "infinitive". Laisse "gender", masculine, masculinePlural, feminine et femininePlural à null.
Cas du verbe pronominal (réfléchi) : un verbe est pronominal quand le pronom qui l'accompagne (me/m', te/t', se/s', nous, vous) désigne LA MÊME PERSONNE que le sujet du verbe (ex : "je me lave" → "me" = "je", pronominal ; à l'inverse "il me lave" → "me" ≠ "il", PAS pronominal, "me" est un simple complément d'objet). Si le mot cliqué est un verbe pronominal dans la phrase donnée, OU si le mot cliqué est lui-même ce pronom réfléchi :
- "word" doit inclure le pronom réfléchi avec le verbe, jamais le verbe seul (ex : clique sur "passe" dans "il se passe quelque chose" → "word" = "se passe", PAS "passe" ; clique sur "se" au même endroit → même résultat "se passe")
- "infinitive" est la forme pronominale complète "se/s' + infinitif" (ex : "se passer", "se lever", "s'appeler"), jamais l'infinitif seul : le sens change complètement entre les deux formes (ex : "passer" = to pass/spend time, mais "se passer" = to happen ; "appeler" = to call, mais "s'appeler" = to be named)
- "translation" doit refléter le sens de la forme PRONOMINALE, jamais celui du verbe simple
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
    ], MODEL_FAST);
    const data = parseJSON(raw, {
      word: cleanWord, translation: "", gender: null, infinitive: null,
      masculine: null, masculinePlural: null, feminine: null, femininePlural: null,
      example: null, exampleTranslation: null,
    });
    addVocabItem(data.word || cleanWord, data.translation, data.gender, data.infinitive, {
      masculine: data.masculine, masculinePlural: data.masculinePlural,
      feminine: data.feminine, femininePlural: data.femininePlural,
    }, data.example, data.exampleTranslation);
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
async function sendMessage(text, isSystemTrigger = false, fromVoice = false) {
  if (state.busy) return;
  if (!state.started) { setStatus(t("start_first")); return; }
  if (!state.apiKey) { openSettings(); return; }

  const userBubble = isSystemTrigger ? null : addBubble("user", tidyTranscript(text));
  state.messages.push({ role: "user", content: text });

  // La correction tourne dans un appel séparé, en parallèle, et ne retarde
  // jamais la réponse parlée : elle ne porte que sur ce seul message (pas
  // besoin de tout l'historique) et met à jour son panneau dès qu'elle est
  // prête, même après que le tuteur ait fini de répondre.
  if (!isSystemTrigger) {
    callProvider(buildCorrectionSystemPrompt(fromVoice), [{ role: "user", content: text }], MODEL_FAST)
      .then((raw) => renderCorrection(parseJSON(raw, { correction: null }).correction))
      .catch((err) => console.warn("Correction indisponible :", err));
  }

  state.busy = true;
  setStatus(t("thinking"));
  micBtn.disabled = true;

  try {
    const raw = await callProvider(buildReplySystemPrompt(), state.messages);
    const data = parseTutorJSON(raw);

    if (userBubble && data.userText) userBubble.textContent = frenchSpacing(data.userText);
    // Un contenu vide dans l'historique ferait échouer le prochain appel à
    // Claude (l'API rejette un bloc de texte vide) : on garde un espace
    // réservé plutôt qu'une chaîne vide dans ce cas rare.
    state.messages.push({ role: "assistant", content: raw || "…" });
    data.reply = fixInversionQuestions(data.reply);
    addBubble("tutor", data.reply);
    speak(data.reply);
    setStatus(t("your_turn"));
  } catch (err) {
    console.error(err);
    const msg = err && err.message ? err.message : String(err);
    setStatus(t("error_prefix") + msg);
    addBubble("tutor", t("err_bubble").replace("{msg}", msg));
  } finally {
    state.busy = false;
    micBtn.disabled = !micAvailable();
  }
}

// =========================================================
//  Appels aux API
// =========================================================
// Chaque fonction accepte un system prompt et une liste de messages,
// pour pouvoir servir aussi bien la conversation principale que de
// petites requêtes ponctuelles (ex : recherche d'un mot cliqué).
// Constante unique pour les 4 fournisseurs : évite qu'une future
// augmentation de cette limite en oublie un (déjà arrivé avec Gemini).
const MAX_TOKENS = 2000;

// Sonnet pour la conversation principale (qualité maximale attendue) ;
// Haiku, nettement moins cher et plus rapide, pour les tâches annexes
// bien cadrées (correction d'une phrase, recherche d'un mot) où sa
// qualité s'est révélée identique à celle de Sonnet lors de tests comparatifs.
const MODEL_MAIN = "claude-sonnet-5";
const MODEL_FAST = "claude-haiku-4-5-20251001";

async function callAnthropic(systemPrompt, messages, model = MODEL_MAIN) {
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
      model,
      max_tokens: MAX_TOKENS,
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

// Point d'entrée unique pour tous les appels IA (conversation ou recherche
// ponctuelle). Un seul fournisseur (Claude) est proposé dans les réglages ;
// les fournisseurs Groq/OpenAI/Gemini, initialement supportés, ont été
// retirés pour simplifier le code après qu'ils ne soient plus accessibles
// depuis l'interface.
async function callProvider(systemPrompt, messages, model) {
  return callAnthropic(systemPrompt, messages, model);
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
    // Traduction à la demande : utile seulement si l'apprenant lit dans une
    // langue d'interface différente du français. Rien n'est appelé tant
    // qu'il ne clique pas.
    if (state.lang !== "fr") {
      const translateBtn = document.createElement("span");
      translateBtn.className = "speak-again";
      translateBtn.textContent = "🌐";
      translateBtn.title = t("translate_title");
      const box = document.createElement("div");
      box.className = "bubble-translation";
      box.hidden = true;
      translateBtn.addEventListener("click", () => translateBubble(text, translateBtn, box));
      div.appendChild(translateBtn);
      div.appendChild(box);
    }
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

// Filet de sécurité : le prompt interdit déjà l'inversion sujet-verbe dans
// les questions du tuteur ("As-tu... ?"), mais un modèle de langage ne suit
// jamais une consigne "jamais" à 100 %. On rattrape ici les cas qui
// passeraient quand même, en réordonnant "Verbe-tu" en "Tu verbe" (et
// "Verbe-t-il/-elle/-on" en "Il/Elle/On verbe"), avant que la phrase soit
// affichée ou lue à voix haute.
const INVERSION_EUPHONIC_RE = /\b(\p{L}+)-t-(il|elle|on)\b/giu;
const INVERSION_DIRECT_RE = /\b(\p{L}+)-(tu|vous|il|elle|on|nous|ils|elles)\b/giu;

function fixInversionQuestions(text) {
  if (!text) return text;
  const reorder = (_match, verb, pronoun) => {
    const wasCapitalized = /^[A-ZÀ-Þ]/.test(verb);
    const lowerVerb = wasCapitalized ? verb.charAt(0).toLowerCase() + verb.slice(1) : verb;
    const properPronoun = wasCapitalized
      ? pronoun.charAt(0).toUpperCase() + pronoun.slice(1)
      : pronoun.toLowerCase();
    return `${properPronoun} ${lowerVerb}`;
  };
  return text
    .replace(INVERSION_EUPHONIC_RE, reorder)
    .replace(INVERSION_DIRECT_RE, reorder);
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

// Les 4 formes d'un adjectif (masculin, masculin pluriel, féminin, féminin
// pluriel), utilisé à la fois dans le panneau de vocabulaire et les cartes
// de révision.
// Repère, parmi les 4 formes d'un adjectif, celle qui correspond déjà au
// mot affiché (pour ne pas la réécrire), et renvoie les autres à part.
// Partagé entre l'affichage HTML (adjectiveTags) et le texte du PDF
// (vocabGrammarSuffix).
function computeAdjectiveForms(v) {
  const forms = [
    ["m.", v.masculine], ["m.pl.", v.masculinePlural],
    ["f.", v.feminine], ["f.pl.", v.femininePlural],
  ];
  const wordKey = (v.word || "").trim().toLowerCase();
  let ownLabel = null;
  const others = [];
  forms.forEach(([label, form]) => {
    if (!form) return;
    if (!ownLabel && form.trim().toLowerCase() === wordKey) {
      ownLabel = label;
    } else {
      others.push({ label, form });
    }
  });
  return { ownLabel, others };
}

function adjectiveTags(v) {
  const { ownLabel, others } = computeAdjectiveForms(v);
  const tags = others.map(({ label, form }) => `<span class="vocab-tag">${label} ${escapeHtml(form)}</span>`);
  if (ownLabel) tags.unshift(`<span class="vocab-tag">${ownLabel}</span>`);
  return tags.join("");
}

// Version texte brut (pas de HTML) des mêmes informations grammaticales,
// pour les lister dans le PDF du résumé de leçon : genre du nom, infinitif
// d'un verbe conjugué, ou formes d'un adjectif.
function vocabGrammarSuffix(v) {
  const parts = [];
  if (v.gender) parts.push(v.gender === "f" ? t("grammar_noun_f") : t("grammar_noun_m"));
  if (v.infinitive) parts.push(`${t("grammar_infinitive_prefix")} ${v.infinitive}`);
  const { ownLabel, others } = computeAdjectiveForms(v);
  if (ownLabel) parts.push(ownLabel);
  others.forEach(({ label, form }) => parts.push(`${label} ${form}`));
  return parts.length ? ` (${parts.join(", ")})` : "";
}

function renderVocabPanel() {
  if (!savedVocab.length) {
    vocabEl.innerHTML = `<p class="small muted">${t("vocab_empty")}</p>`;
  } else {
    vocabEl.innerHTML = "";
    savedVocab.forEach((v) => {
      const el = document.createElement("div");
      el.className = "vocab-item";
      const genderTag = v.gender ? `<span class="vocab-tag">${v.gender === "f" ? t("grammar_noun_f") : t("grammar_noun_m")}</span>` : "";
      const infTag = v.infinitive ? `<span class="vocab-tag">→ ${escapeHtml(v.infinitive)}</span>` : "";
      el.innerHTML = `
        <div class="vocab-main"><span class="word">${escapeHtml(v.word)}</span>${genderTag}${infTag}${adjectiveTags(v)}</div>
        <span class="tr">${escapeHtml(v.translation || "")}</span>`;
      vocabEl.appendChild(el);
    });
  }
  renderVocabStats();
  updateReviewButton();
}

// Nouveau mot : prêt à être révisé dès maintenant (boîte 0 du système
// de Leitner), pour encourager une première révision peu après l'ajout.
function addVocabItem(word, translation, gender, infinitive, adjForms, example, exampleTranslation) {
  const key = word.trim().toLowerCase();
  if (savedVocab.some((v) => v.word.trim().toLowerCase() === key)) return;
  const forms = adjForms || {};
  savedVocab.unshift({
    word, translation: translation || "", gender: gender || null, infinitive: infinitive || null,
    masculine: forms.masculine || null, masculinePlural: forms.masculinePlural || null,
    feminine: forms.feminine || null, femininePlural: forms.femininePlural || null,
    example: example || null, exampleTranslation: exampleTranslation || null,
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

// Un mot "maîtrisé" a atteint la dernière boîte du système de Leitner
// (16 jours d'intervalle), le signe qu'il est bien retenu.
function masteredVocab() {
  return savedVocab.filter((v) => (v.box || 0) >= LEITNER_INTERVALS_DAYS.length - 1);
}

// Clé du jour en heure locale (pas toISOString, qui utilise l'UTC et
// pourrait faire changer de "jour" trop tôt ou trop tard selon le fuseau).
function todayKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

let reviewStreak = { count: 0, lastDay: null };
try {
  reviewStreak = JSON.parse(localStorage.getItem("reviewStreak")) || reviewStreak;
} catch (_) { /* valeur par défaut conservée */ }

// Appelée à chaque carte notée : incrémente la série si la dernière
// révision remonte à hier, la remet à 1 sinon (et ne double-compte pas
// une deuxième carte revue le même jour).
function bumpStreak() {
  const today = todayKey();
  if (reviewStreak.lastDay === today) return;
  reviewStreak.count = reviewStreak.lastDay === todayKey(-1) ? reviewStreak.count + 1 : 1;
  reviewStreak.lastDay = today;
  localStorage.setItem("reviewStreak", JSON.stringify(reviewStreak));
}

function renderVocabStats() {
  const el = $("vocabStats");
  if (!el) return;
  if (!savedVocab.length) { el.textContent = ""; return; }
  el.textContent = t("vocab_stats")
    .replace("{mastered}", String(masteredVocab().length))
    .replace("{due}", String(dueVocab().length))
    .replace("{streak}", String(reviewStreak.count));
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
  const genderTag = v.gender ? `<span class="vocab-tag">${v.gender === "f" ? t("grammar_noun_f") : t("grammar_noun_m")}</span>` : "";
  const progress = t("review_progress")
    .replace("{current}", String(reviewIndex + 1))
    .replace("{total}", String(reviewQueue.length));
  body.innerHTML = `
    <p class="review-progress">${progress}</p>
    <div class="review-card">
      <div class="review-word-row">
        <span class="review-word">${escapeHtml(v.word)}</span>${genderTag}
        <button type="button" class="icon-btn review-listen-btn" id="reviewListenBtn" title="${t("review_listen")}">🔊</button>
      </div>
      <div class="review-answer" id="reviewAnswer" hidden>
        <span class="review-translation">${escapeHtml(v.translation || "")}</span>
        ${v.infinitive ? `<span class="vocab-tag">→ ${escapeHtml(v.infinitive)}</span>` : ""}
        ${adjectiveTags(v)}
        ${v.example ? `<p class="review-example">${escapeHtml(v.example)}</p>` : ""}
        ${v.exampleTranslation ? `<p class="review-example-translation">${escapeHtml(v.exampleTranslation)}</p>` : ""}
      </div>
    </div>
    <div class="review-actions" id="reviewActions"></div>`;

  $("reviewListenBtn").addEventListener("click", () => speak(v.word));

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
  bumpStreak();
  renderVocabStats();
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
  const engine = "Claude";
  const key = state.apiKey ? t("hint_key_ok") : t("hint_key_missing");
  const voice = canUseAzureStt() ? t("hint_mic_ok")
    : !SR ? (isIOSDevice ? t("hint_mic_ios") : t("hint_mic_no"))
    : isBraveBrowser ? t("hint_mic_brave") : t("hint_mic_ok");
  $("engineHint").innerHTML = `${t("hint_engine")} : ${engine} · ${key}<br/>${t("hint_voice")} : ${voice}`;
}

// =========================================================
//  Avertissements navigateur/appareil (micro indisponible)
// =========================================================
function addWarningBanner(i18nKey) {
  const banner = document.createElement("div");
  banner.className = "browser-warning";
  banner.innerHTML = `<span data-i18n-html="${i18nKey}">${t(i18nKey)}</span><button class="close-warning" title="✕">✕</button>`;
  banner.querySelector(".close-warning").addEventListener("click", () => banner.remove());
  const lastBanner = document.querySelector(".browser-warning:last-of-type");
  (lastBanner || document.querySelector(".topbar")).insertAdjacentElement("afterend", banner);
}

if (isIOSDevice && !canUseAzureStt()) addWarningBanner("ios_warning");

let isBraveBrowser = false;
(async () => {
  isBraveBrowser = !!(navigator.brave && (await navigator.brave.isBrave()));
  if (!isBraveBrowser) return;
  addWarningBanner("brave_warning");
  refreshEngineHint();
})();

// ---- Init ----
applyTheme();
document.getElementById("rateSelect").value = String(voiceRate);
applyLang();   // applique la langue (met aussi à jour l'indice moteur et le statut)
renderVocabPanel();   // affiche le vocabulaire sauvegardé des sessions précédentes
renderCorrectionsPanel();   // affiche les corrections sauvegardées des sessions précédentes
