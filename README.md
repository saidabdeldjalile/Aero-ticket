# Aero-ticket- Système de Gestion de Tickets (Air Algérie)

Un système complet de gestion de tickets développé avec **Spring Boot** (backend) et **React/TypeScript** (frontend), incluant un assistant intelligent basé sur le LLM **Qwen 2.5**.

## 📋 Table des Matières

- [Fonctionnalités](#-fonctionnalités)
- [Captures d'écran](#-captures-décran)
- [Architecture](#-architecture)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Démarrage](#-démarrage)
- [API Endpoints](#-api-endpoints)
- [Variables d'Environnement](#-variables-denvironnement)
- [Structure du Projet](#-structure-du-projet)
- [Développement](#-développement)
- [Dépannage](#-dépannage)
- [Licence](#-licence)

---

## ✨ Fonctionnalités

### Gestion des Tickets
- ✅ Création, modification, suppression de tickets
- ✅ Attribution de tickets aux utilisateurs
- ✅ Statuts personnalisables (Open, ToDo, InProgress, Done, Closed, Deleted)
- ✅ Priorités (Critical, High, Medium, Low)
- ✅ Recherche full-text et pagination

### Gestion des Utilisateurs
- ✅ Authentification JWT sécurisée
- ✅ Rôles (ADMIN, SUPPORT, USER)
- ✅ Gestion des départements et projets

### 🤖 Assistant Intelligent (IA)
- ✅ **Chatbot Qwen 2.5** : Dialogue naturel via Ollama (remplace l'ancien système Rasa).
- ✅ **Recherche FAQ hybride** : Recherche d'abord dans la base de connaissances, puis appel au LLM si nécessaire.
- ✅ **Création automatique de tickets** : L'IA peut extraire les informations et créer un ticket directement depuis la conversation.
- ✅ **Classification intelligente** : Détermination automatique de la catégorie et de la priorité des demandes.
- ✅ **Détection de doublons** : Analyse sémantique pour éviter les tickets redondants.

---

## 📸 Captures d'écran

| | |
|---|---|
| ![Page de connexion](captures/Login%20d%20app.png) | ![Page d'accueil de l'application](captures/Page%20d%20acceuil%20d%20app.png) |

| | |
|---|---|
| ![Assistant IA](captures/assistant%20ai.png) | ![Knowledge Center](captures/Knowledge%20center.png) |

| | |
|---|---|
| ![Détail de ticket](captures/detail%20de%20ticket.png) | ![Changement de mot de passe](captures/Changement%20de%20mot%20de%20passe.png) |

---

## 🏗️ Architecture

### Backend
- **Spring Boot 3.1.5** / Java 17
- **PostgreSQL** (Données) / **Redis** (Cache)
- **Spring Security + JWT**

### Frontend
- **React 18** / TypeScript / Vite
- **Tailwind CSS + DaisyUI**

### Intelligence Artificielle (AI Suite)
- **Ollama** : Moteur d'exécution pour le LLM **Qwen 2.5 (1.5b)**.
- **Python / Flask** : Interface entre le backend et Ollama.
- **Sentence Transformers** : Pour la détection de doublons (NLP).

---

## 📦 Prérequis

- **Java 17**
- **Node.js 18+**
- **PostgreSQL 15**
- **Python 3.10+**
- **Ollama** (indispensable pour le chatbot)

---

## 🚀 Installation

### 1. Configuration de l'IA (Ollama)
Installez Ollama depuis [ollama.com](https://ollama.com), puis téléchargez le modèle Qwen :
```bash
ollama pull qwen2.5:1.5b
```

### 2. Cloner le dépôt
```bash
git clone https://github.com/saidabdeldjalile/issue-tracker-air.git
cd IssueTracker-main
```

### 3. Backend (Spring Boot)
Configurez vos identifiants dans `src/main/resources/application.properties` et lancez :
```bash
mvn clean install
mvn spring-boot:run
```

### 4. Frontend (React)
```bash
cd issue-tracker-web
npm install
npm run dev
```

### 5. Services IA (Python)
```bash
# Dans ai-service/
pip install -r requirements.txt
python app.py
```

---

## ▶️ Démarrage Rapide

Le plus simple est d'utiliser les scripts automatisés fournis :

- **Windows** : Exécutez `start-chatbot-services.ps1` pour lancer toute la suite IA.
- **Docker** : `docker-compose up --build` (assurez-vous qu'Ollama tourne sur votre hôte).

---

## 📁 Structure du Projet

```
IssueTracker-main/
├── src/                          # Backend Java (Spring Boot)
├── issue-tracker-web/           # Frontend React (Vite)
├── ai-service/                  # Service principal IA (Ollama + Qwen integration)
├── duplicate-detection/         # Service NLP de détection de doublons
├── classification-service/      # (Legacy) Service de classification par mots-clés
├── chatbot-service/             # (Legacy) Ancien service chatbot
├── docker-compose.yml           # Orchestration Docker
└── README.md                    # Ce fichier
```

---

## 📝 Licence

Ce projet est sous licence MIT. Développé avec ❤️ pour Air Algérie.
--

## 📞 Support

Pour toute question ou problème :
- Ouvrez une issue sur GitHub
- Contactez l'équipe de développement

---

## 🙏 Remerciements

- **Spring Boot** pour le framework backend
- **React** pour la bibliothèque frontend
- **Sentence Transformers** pour la détection de doublons
- **Tailwind CSS** et **DaisyUI** pour le design

---

**Développé avec ❤️ par l'équipe IssueTracker**
