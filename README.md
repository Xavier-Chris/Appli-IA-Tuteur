# Tuteur de français IA

Une application web simple mais fonctionnelle : tu parles français, un tuteur IA te répond à voix haute, te corrige et t'apprend du vocabulaire. Interface bilingue français / anglais.

## Comment lancer l'app

### Option 1 (la plus fiable) : petit serveur local

Le micro du navigateur marche mieux sur un vrai serveur que par un simple double-clic.

1. Ouvre un terminal dans ce dossier.
2. Lance (si tu as Python installé) :

```bash
python -m http.server 8000
```

3. Ouvre ton navigateur (Chrome ou Edge de préférence) sur : http://localhost:8000

### Option 2 : double-clic

Tu peux aussi double-cliquer sur `index.html`. Si le micro est bloqué, utilise le champ texte "...ou écris ta réponse ici" : tout le reste fonctionne pareil.

## Première utilisation

1. Clique sur l'engrenage ⚙️ en haut à droite.
2. Choisis ton fournisseur d'IA et colle ta clé API :
   - Groq : https://console.groq.com/keys — gratuit, sans carte bancaire, recommandé pour démarrer
   - Google Gemini : https://aistudio.google.com (gratuit selon le pays)
   - Claude (Anthropic) : https://console.anthropic.com
   - OpenAI : https://platform.openai.com
3. Enregistre. Ta clé reste sur ton ordinateur (dans le navigateur), elle n'est envoyée qu'au fournisseur choisi.
4. Choisis ton niveau (Débutant / Intermédiaire / Avancé), un personnage et un mode, puis clique sur **Démarrer la conversation**.
5. Clique sur le gros bouton micro 🎤 pour parler (clique à nouveau pour arrêter l'enregistrement), ou écris ta réponse.

## Ce que fait cette version

- Conversation vocale en français (reconnaissance + voix du navigateur, sans ElevenLabs), micro en mode marche/arrêt
- 4 fournisseurs d'IA au choix : Groq (par défaut), Google Gemini, Claude, OpenAI
- Personnages incarnés par l'IA en plus du tuteur classique : Victor Hugo, Vincent van Gogh, Stromae, Marie Curie, Napoléon Bonaparte, Zinédine Zidane, David Guetta, Brigitte Bardot, avec de vrais éléments biographiques et un français simple et moderne (jamais de style d'époque)
- 4 modes : conversation libre, guidée, jeu de rôle, grammaire
- Niveaux simplifiés : Débutant, Intermédiaire, Avancé
- Interface bilingue français / anglais (bouton en haut à droite)
- Panneau de corrections (ce que tu as dit / mieux / pourquoi), qui n'apparaît jamais dans la réponse orale du tuteur
- Panneau de vocabulaire (mots et expressions), sauvegardé sur l'appareil et conservé d'une session à l'autre, avec un bouton pour le vider
- Voix restreinte à "Paul" (français de France) quand disponible, avec réglage de vitesse ; les voix les plus naturelles passent par Microsoft Edge (voix "Natural")
- Transcription avec ponctuation et majuscules ajoutées automatiquement
- Thème clair / sombre, responsive mobile

## Ce qui n'est pas encore fait (volontairement)

Dashboard, flashcards à révision espacée, score de prononciation, export PDF,
authentification, examens DELF/DALF, gamification. On les ajoutera si le coeur te convient.

## Coût

La voix est gratuite (navigateur). Seuls les appels à l'IA sont facturés par ton
fournisseur, à l'usage. Groq est gratuit sans carte bancaire. Une conversation coûte
quelques centimes chez les fournisseurs payants.
