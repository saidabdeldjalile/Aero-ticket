"""
Intelligent Chatbot Service with Ollama LLM
Model: qwen2.5:1.5b (fast & lightweight)
Flow: FAQ → Ollama → Feedback → Ask Description → Auto Ticket Creation
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import uuid
import os
import requests
from typing import Dict, List, Tuple, Any
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ==================== CONFIG ====================

OLLAMA_URL   = os.environ.get("OLLAMA_URL",   "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:1.5b")
OLLAMA_TIMEOUT = float(os.environ.get("OLLAMA_TIMEOUT", "15"))
FAQ_SIMILARITY_THRESHOLD = float(os.environ.get("FAQ_SIMILARITY_THRESHOLD", "0.75"))
_RAW_BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:6969")

def _normalise_backend_base(url: str) -> str:
    """
    Accept BACKEND_URL values like:
    - http://host:6969
    - http://host:6969/
    - http://host:6969/api
    - http://host:6969/api/v1
    and normalise to the server origin (no trailing /api...).
    """
    u = (url or "").strip().rstrip("/")
    for suffix in ("/api/v1", "/api"):
        if u.endswith(suffix):
            u = u[: -len(suffix)]
            break
    return u.rstrip("/")

BACKEND_ORIGIN = _normalise_backend_base(_RAW_BACKEND_URL)
BACKEND_API_V1 = f"{BACKEND_ORIGIN}/api/v1"

DB_CONFIG = {
    "host":     os.environ.get("DB_HOST",     "localhost"),
    "port":     int(os.environ.get("DB_PORT", "5433")),
    "database": os.environ.get("DB_NAME",     "issue_tracker_db"),
    "user":     os.environ.get("DB_USER",     "postgres"),
    "password": os.environ.get("DB_PASSWORD", "postgres"),
}

FAQ_DATA: List[Dict] = []

# ==================== PROMPTS ====================

PROMPT_SYSTEM = """Tu es l'assistant virtuel interne de l'application IssueTracker d'Air Algérie.

CATÉGORIES DE TICKETS:
- IT: Problèmes techniques, réseau, VPN, wifi, email, logiciels
- Matériel: Équipement, imprimantes, ordinateurs
- RH: Congés, contrats, salaires, attestations
- Maintenance: Bâtiment, climatisation, électricité
- Formation: Demandes de formation
- Autres: Demandes diverses

RÈGLES:
1. Sois serviable, professionnel et concis (2-4 phrases maximum)
2. Propose des solutions concrètes et pratiques directement, sans poser de questions
3. Ne pose JAMAIS de questions à l'utilisateur. Donne la réponse complète immédiatement.
4. Si la demande concerne les congés, explique directement la procédure sans demander le type de congé.

Réponds uniquement en français de manière utile et directe."""

# ==================== FAQ ====================

def get_db_connection():
    try:
        import psycopg2
        return psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        logger.warning(f"Database connection failed: {e}")
        return None


def load_faq() -> List[Dict]:
    """Load FAQ data from database, fallback to static list."""
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            # Load FAQ with keywords from the many-to-many faq_keywords table
            cursor.execute(
                "SELECT id, question, answer, category FROM faq WHERE active = true"
            )
            rows = cursor.fetchall()
            faqs = []
            for r in rows:
                faq_id = r[0]
                # Load keywords for this FAQ
                try:
                    cursor.execute(
                        "SELECT keywords FROM faq_keywords WHERE faq_id = %s",
                        (faq_id,)
                    )
                    keywords = [k[0] for k in cursor.fetchall() if k[0]]
                except Exception:
                    keywords = []
                faqs.append({
                    "id": faq_id,
                    "question": r[1],
                    "answer": r[2],
                    "category": r[3] or "Autres",
                    "keywords": keywords,
                })
            cursor.close()
            conn.close()
            if faqs:
                logger.info(f"✅ FAQ loaded from DB: {len(faqs)} entries with keywords")
                return faqs
        except Exception as e:
            logger.warning(f"Could not load FAQ from DB: {e}")

    # Static fallback FAQ
    logger.info("📋 Using fallback FAQ")
    return [
        {
            "id": 1,
            "question": "vpn télétravail accès distant",
            "answer": (
                "Pour obtenir un accès VPN pour le télétravail, créez un ticket IT. "
                "Le service informatique vous fournira vos identifiants de connexion sous 24h ouvrées."
            ),
            "category": "IT",
            "keywords": ["vpn", "télétravail", "accès distant", "connexion"],
        },
        {
            "id": 2,
            "question": "connexion wifi réseau sans fil",
            "answer": (
                "Pour vous connecter au WiFi Air Algérie, sélectionnez le réseau 'AirAlgerie-WiFi' "
                "et utilisez le mot de passe 'AIRALGERIE2024'. Si le problème persiste, contactez l'IT."
            ),
            "category": "IT",
            "keywords": ["wifi", "réseau", "connexion", "internet"],
        },
        {
            "id": 3,
            "question": "créer ticket ouvrir demande",
            "answer": (
                "Pour créer un ticket, cliquez sur 'Nouveau Ticket' dans le menu principal, "
                "remplissez le formulaire avec les détails de votre demande et soumettez."
            ),
            "category": "IT",
            "keywords": ["ticket", "demande", "créer", "ouvrir"],
        },
        {
            "id": 4,
            "question": "mot de passe oublié réinitialiser",
            "answer": (
                "Pour réinitialiser votre mot de passe, cliquez sur 'Mot de passe oublié' "
                "sur la page de connexion. Un email vous sera envoyé avec les instructions."
            ),
            "category": "IT",
            "keywords": ["mot de passe", "oublié", "réinitialiser", "compte"],
        },
        {
            "id": 5,
            "question": "congé demande absence",
            "answer": (
                "Pour faire une demande de congé, soumettez un ticket dans la catégorie RH "
                "avec les dates souhaitées. Votre responsable sera notifié pour validation."
            ),
            "category": "RH",
            "keywords": ["congé", "absence", "rh"],
        },
        {
            "id": 6,
            "question": "demande matériel ordinateur écran imprimante",
            "answer": (
                "Pour demander du matériel (ordinateur, écran, imprimante, etc.), créez un ticket "
                "dans la catégorie Matériel en précisant l'équipement, le site concerné et l'urgence. "
                "Le service Achats traitera votre demande."
            ),
            "category": "Matériel",
            "keywords": ["matériel", "équipement", "ordinateur", "écran", "imprimante", "achat"],
        },
        {
            "id": 7,
            "question": "panne connexion email internet réseau",
            "answer": (
                "En cas de panne réseau, email ou connexion internet, créez un ticket IT. "
                "Le support technique interviendra dans les plus brefs délais."
            ),
            "category": "IT",
            "keywords": ["panne", "connexion", "email", "internet", "réseau"],
        },
    ]


def search_faq(query: str) -> Tuple[str | None, float, str | None]:
    """Keyword-based FAQ search with stem/plural handling. Returns (answer, score, category)."""
    if not FAQ_DATA:
        return None, 0.0, None

    import re
    query_lower = query.lower()
    best_answer   = None
    best_score    = 0.0
    best_category = None

    # Normalize: remove accents, handle common verb endings for better matching
    def normalize(word: str) -> str:
        word = word.replace("é", "e").replace("è", "e").replace("ê", "e")
        word = word.replace("ç", "c")
        word = word.replace("à", "a").replace("â", "a")
        word = word.replace("ù", "u").replace("û", "u")
        word = word.replace("î", "i").replace("ï", "i")
        word = word.replace("ô", "o").replace("ö", "o")
        # Strip trailing s/x for plural matching
        word = re.sub(r'[sx]$', '', word)
        # Strip common French verb infinitive endings (er, ir, re)
        word = re.sub(r'(?:er|ir|re)$', '', word)
        # Strip trailing 'e' so "demande" and "demander" share the same stem "demand"
        word = re.sub(r'e$', '', word)
        return word

    query_words = [normalize(w) for w in query_lower.split() if len(w) > 2]

    for item in FAQ_DATA:
        question = item.get("question", "").lower()
        answer   = item.get("answer",   "").lower()
        category = item.get("category", "Autres")
        keywords = item.get("keywords") or []  # Get keywords from DB

        question_normalized = normalize(question)
        answer_normalized = normalize(answer)
        keywords_normalized = [normalize(kw.lower()) for kw in keywords if kw]

        # Also split FAQ question into normalized words for partial match
        faq_words = [normalize(w) for w in question.split() if len(w) > 2]

        score = 0
        for kw in query_words:
            # Check if keyword matches any DB keywords FIRST (strongest signal)
            # e.g., "matériel" in user query matches keywords of the "Matériel" FAQ
            if any(kw in fkw or fkw in kw for fkw in keywords_normalized):
                score += 4  # Keywords match = very strong
            # Check if keyword is in question (substring match for compound words)
            elif kw in question_normalized:
                score += 2
            # Check if any FAQ word contains the keyword or vice versa (stem match)
            elif any(kw in fw or fw in kw for fw in faq_words):
                score += 2
            elif kw in answer_normalized:
                score += 1

        # Bonus: if all query words match, boost score
        matched_words = sum(1 for kw in query_words if kw in question_normalized or any(kw in fw or fw in kw for fw in faq_words) or any(kw in fkw or fkw in kw for fkw in keywords_normalized))
        if query_words and matched_words == len(query_words):
            score += 3

        normalised = min(score / 10, 0.95)
        if normalised > best_score:
            best_score    = normalised
            best_answer   = item.get("answer", "")
            best_category = category

    if best_score >= FAQ_SIMILARITY_THRESHOLD:
        return best_answer, best_score, best_category
    return None, 0.0, None

# ==================== OLLAMA ====================

def call_ollama(prompt: str) -> Dict[str, Any]:
    """
    Call the configured Ollama model.
    Single model, 2 retries, clear error codes — no blind fallback to missing models.
    """
    model = OLLAMA_MODEL
    full_prompt = f"{PROMPT_SYSTEM}\n\nUtilisateur: {prompt}\n\nAssistant:"

    for attempt in range(1, 3):          # attempts 1 and 2
        try:
            payload = {
                "model": model,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.8,
                    "num_predict": 200,
                    "stop": ["\n\nUtilisateur:", "Question:"],
                },
            }

            logger.info(f"🤖 Calling Ollama ({model}) — attempt {attempt}")
            response = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json=payload,
                timeout=OLLAMA_TIMEOUT,
            )

            if response.status_code == 200:
                data = response.json()
                text = data.get("response", "").strip()
                logger.info(f"✅ Ollama responded ({len(text)} chars)")
                return {"response": text, "success": True}

            if response.status_code == 404:
                logger.error(
                    f"❌ Model '{model}' not found in Ollama. "
                    f"Run: ollama pull {model}"
                )
                return {"response": "", "success": False, "model_not_found": True}

            logger.warning(f"Ollama HTTP {response.status_code} on attempt {attempt}")

        except requests.exceptions.Timeout:
            logger.warning(f"⌛ Timeout on attempt {attempt} ({OLLAMA_TIMEOUT}s)")

        except requests.exceptions.ConnectionError:
            logger.error(f"❌ Cannot connect to Ollama at {OLLAMA_URL}")
            return {"response": "", "success": False, "connection_error": True}

        except Exception as e:
            logger.error(f"❌ Unexpected Ollama error: {e}")

    logger.error("❌ Ollama failed after 2 attempts")
    return {"response": "", "success": False, "all_attempts_failed": True}


def _ollama_fallback_message(result: Dict, message: str) -> str:
    """Build a user-friendly fallback when Ollama is unavailable."""
    if result.get("model_not_found"):
        hint = (
            f"⚙️ Le modèle IA n'est pas encore installé sur le serveur.\n\n"
            f"**Action requise :** `ollama pull {OLLAMA_MODEL}`\n\n"
        )
    elif result.get("connection_error"):
        hint = "❌ Le service IA est hors ligne. "
    else:
        hint = "⏱️ Le service IA est temporairement indisponible. "

    faq_answer, _, _ = search_faq(message)
    if faq_answer:
        return hint + "Voici ce que j'ai trouvé dans la FAQ :\n\n" + faq_answer
    return hint + "Veuillez réessayer dans quelques instants ou contacter le support IT."

# ==================== CLASSIFICATION ====================

def classify_demand(text: str) -> str:
    """Fast keyword-based category classifier (no LLM call needed)."""
    t = text.lower()
    if any(k in t for k in ["vpn", "wifi", "réseau", "internet", "email", "bug", "pc", "logiciel", "mot de passe", "accès"]):
        return "IT"
    if any(k in t for k in ["congé", "salaire", "contrat", "rh", "administratif", "attestation"]):
        return "RH"
    if any(k in t for k in ["matériel", "imprimante", "souris", "clavier", "écran", "ordinateur"]):
        return "Matériel"
    if any(k in t for k in ["maintenance", "bâtiment", "climatisation", "électricité", "chauffage"]):
        return "Maintenance"
    if any(k in t for k in ["formation", "cours", "apprentissage", "certification"]):
        return "Formation"
    return "Autres"

# ==================== PRIORITY ====================

def classify_priority(text: str) -> str:
    """Heuristic priority classifier compatible with backend enum (High/Medium/Low/Critical)."""
    t = (text or "").lower()
    if any(k in t for k in ["critique", "critical", "panne totale", "hors service", "impossible", "bloquant total"]):
        return "Critical"
    if any(k in t for k in ["urgent", "immédiat", "immediat", "bloquant", "down", "incident majeur"]):
        return "High"
    if any(k in t for k in ["quand possible", "non urgent", "mineur"]):
        return "Low"
    return "Medium"

# ==================== TICKET CREATION ====================

def create_ticket_in_backend(ticket_data: Dict, auth_token: str = None) -> Dict:
    """POST a new ticket to the backend API."""
    try:
        headers = {"Content-Type": "application/json"}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
            logger.debug(f"Sending ticket creation request with token: {auth_token[:30]}...")

        # Get default project ID from environment or use 1
        default_project_id = int(os.environ.get("DEFAULT_PROJECT_ID", "1"))

        priority = ticket_data.get("priority") or "Medium"
        if priority not in {"High", "Medium", "Low", "Critical"}:
            priority = "Medium"

        payload = {
            "title":       ticket_data.get("title",       "Demande Chatbot"),
            "description": ticket_data.get("description", ""),
            "category":    ticket_data.get("category",    "Autres"),
            "priority":    priority,
            "status":      "Open",
            "reporter":    ticket_data.get("userEmail",   "unknown@airalgerie.dz"),
            "project":     default_project_id,
            # Optional fields left null/empty
            "assignee":    None,
            "issueType":   None,
        }

        response = requests.post(
            f"{BACKEND_API_V1}/tickets",
            json=payload,
            headers=headers,
            timeout=30,
        )

        logger.info(f"Backend response status: {response.status_code}")
        if response.status_code in [200, 201]:
            data = response.json()
            ticket_id = data.get("id") or data.get("ticketId")
            logger.info(f"✅ Ticket created: #{ticket_id}")
            return {"success": True, "ticketId": ticket_id}

        logger.error(f"Backend returned HTTP {response.status_code}: {response.text[:200]}")
        return {"success": False, "error": f"HTTP {response.status_code}: {response.text[:100]}"}

    except Exception as e:
        logger.error(f"Create ticket error: {e}")
        return {"success": False, "error": str(e)}

# ==================== SESSION MANAGER ====================

class ConversationManager:
    def __init__(self):
        self.sessions: Dict[str, dict] = {}

    def get_session(self, session_id: str) -> dict:
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                "id":                       session_id,
                "messages":                 [],
                "last_question":            "",
                "last_answer":              "",
                "waiting_for_description":  False,
                "waiting_for_confirmation": False,
                "pending_ticket":           None,
                "auth_token":               None,
            }
        return self.sessions[session_id]

    def add_message(self, session_id: str, role: str, content: str):
        session = self.get_session(session_id)
        session["messages"].append({
            "role":      role,
            "content":   content,
            "timestamp": datetime.now().isoformat(),
        })
        if role == "user":
            session["last_question"] = content
        elif role == "assistant":
            session["last_answer"] = content

    def set_waiting_for_description(self, session_id: str, info: dict):
        s = self.get_session(session_id)
        s["waiting_for_description"] = True
        s["waiting_for_confirmation"] = False
        s["pending_ticket"]          = info

    def set_waiting_for_confirmation(self, session_id: str, info: dict):
        s = self.get_session(session_id)
        s["waiting_for_description"] = False
        s["waiting_for_confirmation"] = True
        s["pending_ticket"] = info

    def clear_waiting(self, session_id: str):
        s = self.get_session(session_id)
        s["waiting_for_description"] = False
        s["waiting_for_confirmation"] = False
        s["pending_ticket"]          = None

    def is_waiting(self, session_id: str) -> bool:
        return self.get_session(session_id).get("waiting_for_description", False)

    def is_waiting_confirmation(self, session_id: str) -> bool:
        return self.get_session(session_id).get("waiting_for_confirmation", False)

    def get_pending(self, session_id: str) -> dict:
        return self.get_session(session_id).get("pending_ticket") or {}


conversation_manager = ConversationManager()

# ==================== UNANSWERED QUESTIONS (auto-enrich FAQ) ====================

def save_unanswered_question(question: str, category: str, user_email: str, session_id: str):
    """Save questions that Ollama answered (no FAQ match) so admins can review & add to FAQ."""
    try:
        payload = {
            "question": question[:500],
            "context": f"Posée via chatbot (session: {session_id[:8]}, catégorie: {category})",
            "userEmail": user_email or "chatbot@system",
            "suggestedCategory": category,
            "suggestedDepartment": classify_demand(question),
        }
        response = requests.post(
            f"{BACKEND_API_V1}/unanswered-questions",
            json=payload,
            timeout=10,
        )
        if response.status_code in [200, 201]:
            logger.info(f"📝 Unanswered question saved: '{question[:50]}...' (cat: {category})")
        else:
            logger.debug(f"Unanswered question save returned HTTP {response.status_code}")
    except requests.exceptions.ConnectionError:
        logger.debug(f"Backend unreachable — couldn't save unanswered question")
    except Exception as e:
        logger.debug(f"Could not save unanswered question: {e}")

# ==================== HELPERS ====================

AUTO_TICKET_TRIGGERS = [
    "créer un ticket", "crée un ticket", "ouvre un ticket", "ouvrir un ticket",
    "je veux un ticket", "besoin d'un ticket", "j'ai besoin d'un ticket",
    "signaler un problème", "signaler", "reporter un bug", "bug", "erreur",
    "déclarer un incident", "incident", "panne", "problème urgent",
]

def should_auto_create_ticket(message: str) -> Tuple[bool, str]:
    msg_lower = message.lower()
    for trigger in AUTO_TICKET_TRIGGERS:
        if trigger in msg_lower:
            return True, trigger
    return False, ""


def is_feedback_response(msg: str) -> bool:
    return msg.lower().strip() in {"oui", "o", "yes", "y", "non", "n", "no", "ok", "pas", "ça marche"}


def is_positive_feedback(msg: str) -> bool:
    return msg.lower().strip() in {"oui", "o", "yes", "y", "ok", "ça marche", "parfait", "bien"}

# ==================== ROUTES ====================

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data       = request.get_json()
        message    = (data.get("message") or "").strip()
        session_id = data.get("sessionId") or str(uuid.uuid4())
        user_email = data.get("userEmail", "")
        create_ticket = bool(data.get("createTicket"))
        draft_title = (data.get("title") or "").strip()
        draft_description = (data.get("description") or "").strip()
        draft_category = (data.get("category") or "").strip()
        draft_priority = (data.get("priority") or "").strip()

        # Extract auth token from Authorization header (Bearer token from Java backend)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            auth_token = auth_header.split(" ", 1)[1]
        else:
            auth_token = data.get("authToken", "")

        logger.info(f"🔐 Auth: {bool(auth_token)}, email={user_email}, session={session_id[:8]}")

        if not message:
            return jsonify({"error": "Message requis"}), 400

        logger.info(f"📨 [{session_id[:12]}] {message[:60]}")

        session = conversation_manager.get_session(session_id)
        if auth_token:
            session["auth_token"] = auth_token

        # ── STEP 0 : explicit ticket confirmation from UI ──
        if create_ticket:
            pending = conversation_manager.get_pending(session_id)
            title = draft_title or pending.get("title") or f"[Chatbot] {draft_category or pending.get('category', 'Autres')}"
            description = draft_description or pending.get("description") or message
            category = draft_category or pending.get("category") or classify_demand(description)
            priority = draft_priority or pending.get("priority") or classify_priority(description)

            if not auth_token:
                response_msg = (
                    "🔐 **Connexion requise**\n\n"
                    "Pour créer un ticket, connectez-vous d'abord via le menu latéral."
                )
                conversation_manager.add_message(session_id, "assistant", response_msg)
                return jsonify({"sessionId": session_id, "response": response_msg, "conversationEnded": True})

            result = create_ticket_in_backend(
                {
                    "title": title[:200],
                    "description": description,
                    "category": category or "Autres",
                    "priority": priority,
                    "userEmail": user_email,
                },
                auth_token,
            )

            conversation_manager.clear_waiting(session_id)

            if result.get("success"):
                ticket_id = result.get("ticketId")
                response_msg = (
                    f"✅ **Ticket #{ticket_id} créé avec succès !**\n\n"
                    f"Catégorie : **{category}** (priorité : **{priority}**)"
                )
                return jsonify({
                    "sessionId": session_id,
                    "response": response_msg,
                    "ticketCreated": True,
                    "ticketId": ticket_id,
                    "ticketUrl": f"/tickets/{ticket_id}",
                    "category": category,
                    "priority": priority,
                    "conversationEnded": True,
                })

            response_msg = f"❌ Erreur lors de la création du ticket : {result.get('error')}"
            conversation_manager.add_message(session_id, "assistant", response_msg)
            return jsonify({"sessionId": session_id, "response": response_msg, "conversationEnded": True})

        # ── STEP 1 : waiting for problem description → create ticket ──
        if conversation_manager.is_waiting(session_id):
            logger.info("📝 Creating ticket with description...")
            pending  = conversation_manager.get_pending(session_id)
            category = pending.get("category", "Autres")
            priority = pending.get("priority") or classify_priority(
                f"{message} {pending.get('question', '')} {pending.get('answer', '')}"
            )

            # Require authentication
            if not auth_token:
                response_msg = (
                    "🔐 **Connexion requise**\n\n"
                    "Pour créer un ticket, connectez-vous d'abord via le menu latéral."
                )
                conversation_manager.add_message(session_id, "assistant", response_msg)
                return jsonify({"sessionId": session_id, "response": response_msg, "conversationEnded": True})

            # User-only declaration: keep the ticket description strictly what the user typed
            ticket_desc = message

            title = pending.get("title") or f"[Chatbot] {category} - {message[:60]}"
            result = create_ticket_in_backend(
                {
                    "title": title[:200],
                    "description": ticket_desc,
                    "category": category or "Autres",
                    "priority": priority,
                    "userEmail": user_email,
                },
                auth_token,
            )

            conversation_manager.clear_waiting(session_id)

            if result.get("success"):
                ticket_id = result.get("ticketId")
                response_msg = (
                    f"✅ **Ticket #{ticket_id} créé avec succès !**\n\n"
                    f"Catégorie : **{category}** (priorité : **{priority}**)"
                )
                conversation_manager.add_message(session_id, "assistant", response_msg)
                return jsonify({
                    "sessionId": session_id,
                    "response": response_msg,
                    "ticketCreated": True,
                    "ticketId": ticket_id,
                    "ticketUrl": f"/tickets/{ticket_id}",
                    "category": category,
                    "priority": priority,
                    "conversationEnded": True,
                })

            response_msg = f"❌ Erreur lors de la création du ticket : {result.get('error')}"
            conversation_manager.add_message(session_id, "assistant", response_msg)
            return jsonify({"sessionId": session_id, "response": response_msg, "conversationEnded": True})

        # ── STEP 1b : waiting for ticket confirmation (Oui/Non) ──
        if conversation_manager.is_waiting_confirmation(session_id) and is_feedback_response(message):
            pending = conversation_manager.get_pending(session_id)
            if is_positive_feedback(message):
                if not auth_token:
                    response_msg = (
                        "🔐 **Connexion requise**\n\n"
                        "Pour créer un ticket, connectez-vous d'abord via le menu latéral."
                    )
                    conversation_manager.add_message(session_id, "assistant", response_msg)
                    return jsonify({"sessionId": session_id, "response": response_msg, "conversationEnded": True})

                result = create_ticket_in_backend(
                    {
                        "title": pending.get("title") or "Demande Chatbot",
                        "description": pending.get("description") or "",
                        "category": pending.get("category") or "Autres",
                        "priority": pending.get("priority") or "Medium",
                        "userEmail": user_email,
                    },
                    auth_token,
                )
                conversation_manager.clear_waiting(session_id)

                if result.get("success"):
                    ticket_id = result.get("ticketId")
                    response_msg = f"✅ **Ticket #{ticket_id} créé avec succès !**"
                    conversation_manager.add_message(session_id, "assistant", response_msg)
                    return jsonify({
                        "sessionId": session_id,
                        "response": response_msg,
                        "ticketCreated": True,
                        "ticketId": ticket_id,
                        "ticketUrl": f"/tickets/{ticket_id}",
                        "conversationEnded": True,
                    })

                response_msg = f"❌ Erreur lors de la création du ticket : {result.get('error')}"
                conversation_manager.add_message(session_id, "assistant", response_msg)
                return jsonify({"sessionId": session_id, "response": response_msg, "conversationEnded": True})

            # Non → cancel
            conversation_manager.clear_waiting(session_id)
            response_msg = "D'accord — je n'ai pas créé de ticket. Souhaitez-vous que je vous aide autrement ?"
            conversation_manager.add_message(session_id, "assistant", response_msg)
            return jsonify({"sessionId": session_id, "response": response_msg, "conversationEnded": True})

        # ── STEP 2 : handle feedback (oui / non) ──
        if is_feedback_response(message) and session.get("last_answer"):
            if is_positive_feedback(message):
                response_msg = "Merci pour votre retour ! Ravi d'avoir pu vous aider. 🙏"
                conversation_manager.add_message(session_id, "assistant", response_msg)
                return jsonify({
                    "sessionId":         session_id,
                    "response":          response_msg,
                    "conversationEnded": True,
                })
            else:
                category = classify_demand(
                    session.get("last_question", "") + " " + session.get("last_answer", "")
                )
                conversation_manager.set_waiting_for_description(session_id, {
                    "question": session.get("last_question", ""),
                    "answer":   session.get("last_answer",   ""),
                    "feedback": message,
                    "category": category,
                })
                response_msg = (
                    f"Je suis désolé que ma réponse ne vous ait pas satisfait. 📝\n\n"
                    f"**Décrivez votre problème en détail** pour que je crée un ticket :\n\n"
                    f"Catégorie détectée : **{category}**"
                )
                conversation_manager.add_message(session_id, "assistant", response_msg)
                return jsonify({
                    "sessionId":               session_id,
                    "response":                response_msg,
                    "waitingFor":              "ticket_description",
                })

        # ── STEP 3 : auto-ticket trigger ──
        should_auto, trigger = should_auto_create_ticket(message)
        if should_auto:
            category = classify_demand(message)

            # Require authentication
            if not auth_token:
                response_msg = (
                    "🔐 **Connexion requise**\n\n"
                    "Pour créer un ticket, connectez-vous d'abord via le menu latéral."
                )
                conversation_manager.add_message(session_id, "assistant", response_msg)
                return jsonify({"sessionId": session_id, "response": response_msg, "conversationEnded": True})

            conversation_manager.set_waiting_for_description(session_id, {
                "question": message,
                "answer":   "",
                "feedback": "auto_trigger",
                "category": category,
            })
            response_msg = (
                f"📝 **Demande de ticket détectée** (catégorie : **{category}**)\n\n"
                f"Décrivez votre problème en détail pour que je crée le ticket automatiquement :"
            )
            conversation_manager.add_message(session_id, "assistant", response_msg)
            return jsonify({
                "sessionId":         session_id,
                "response":          response_msg,
                "waitingFor":        "ticket_description",
            })

        # ── STEP 4 : normal conversation ──
        conversation_manager.add_message(session_id, "user", message)

        # 4a — FAQ first (instant)
        faq_answer, faq_score, faq_category = search_faq(message)
        if faq_answer:
            logger.info(f"🔍 FAQ match (score={faq_score:.2f})")
            full_answer = f"{faq_answer}\n\n---\n❓ **Cette réponse vous a-t-elle aidé ?** (Oui/Non)"
            conversation_manager.add_message(session_id, "assistant", full_answer)
            return jsonify({
                "sessionId":   session_id,
                "response":    full_answer,
                "need_feedback": True,
                "source":      "faq",
            })

        # 4b — Ollama LLM
        ollama_result = call_ollama(message)

        # Save question as "unanswered" (no FAQ match) for admin review
        category = classify_demand(message)
        save_unanswered_question(message, category, user_email, session_id)

        if ollama_result["success"]:
            answer = ollama_result["response"]
            source = "llm"
        else:
            answer = _ollama_fallback_message(ollama_result, message)
            source = "fallback"

        full_answer = f"{answer}\n\n---\n❓ **Cette réponse vous a-t-elle aidé ?** (Oui/Non)"
        conversation_manager.add_message(session_id, "assistant", full_answer)

        return jsonify({
            "sessionId":     session_id,
            "response":      full_answer,
            "need_feedback": True,
            "source":        source,
        })

    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        return jsonify({"response": f"Erreur interne : {str(e)}", "need_feedback": False}), 500


@app.route("/classify", methods=["POST"])
def classify():
    """
    Endpoint for backend to classify tickets automatically.
    Unifies the classification service with the AI service.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        title = data.get("title", "")
        text = data.get("text", "")
        full_text = f"{title} {text}"
        
        # Use existing logic from ai-service
        category = classify_demand(full_text)
        priority = classify_priority(full_text)
        
        # Map detected categories to actual departments (based on seed data)
        # 1: DSI, 2: DRH, 3: OPS, 4: MAINTENANCE, 5: GFC
        dept_map = {
            "IT": "DSI",
            "RH": "DRH",
            "Matériel": "DSI",
            "Maintenance": "MAINTENANCE",
            "Formation": "DRH",
            "Autres": "DSI"
        }
        
        return jsonify({
            "category": category,
            "suggestedDepartment": dept_map.get(category, "DSI"),
            "suggestedPriority": priority,
            "confidence": 0.90,
            "keywords": []
        })
    except Exception as e:
        logger.error(f"Classification error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/chat/feedback", methods=["POST"])
def chat_feedback():
    """Store user feedback about chatbot responses."""
    try:
        data = request.get_json()
        session_id = data.get("sessionId", "")
        user_email = data.get("userEmail", "")
        message = data.get("message", "")
        response_text = data.get("response", "")
        rating = data.get("rating", 0)
        feedback_text = data.get("feedback", "")
        helpful = data.get("helpful", False)

        logger.info(f"📊 Feedback received - session={session_id[:8]}, rating={rating}, helpful={helpful}")

        # TODO: Store feedback in database if needed
        # For now, just log it
        logger.info(f"Feedback details: message={message[:100]}, response={response_text[:100]}, feedback={feedback_text}")

        return jsonify({"success": True, "message": "Feedback enregistré"}), 200

    except Exception as e:
        logger.error(f"Feedback error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    ollama_ok    = False
    model_ready  = False
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if r.status_code == 200:
            ollama_ok   = True
            model_names = [m.get("name", "") for m in r.json().get("models", [])]
            model_ready = any(OLLAMA_MODEL in n for n in model_names)
    except Exception:
        pass

    status = "healthy" if (ollama_ok and model_ready) else "degraded"
    return jsonify({
        "status":      status,
        "ollama":      ollama_ok,
        "model":       OLLAMA_MODEL,
        "model_ready": model_ready,
        "faq_count":   len(FAQ_DATA),
        "timeout":     f"{OLLAMA_TIMEOUT}s",
    })


@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "service": "Chatbot Service — Air Algérie IssueTracker",
        "version": "6.0 — qwen2.5:1.5b",
        "model":   OLLAMA_MODEL,
        "backend_api": BACKEND_API_V1,
        "flow":    [
            "1. FAQ search (instant)",
            "2. Ollama LLM (qwen2.5:1.5b — fast)",
            "3. Feedback (Oui/Non)",
            "4. Ask description if negative feedback",
            "5. Auto ticket creation",
        ],
    })

# ==================== STARTUP ====================

def initialize():
    global FAQ_DATA
    logger.info("=" * 60)
    logger.info("🚀 Chatbot Service v6.0 — qwen2.5:1.5b")
    logger.info("=" * 60)

    # Load FAQ
    try:
        FAQ_DATA = load_faq()
        logger.info(f"✅ FAQ ready: {len(FAQ_DATA)} entries")
    except Exception as e:
        logger.warning(f"FAQ load failed: {e} — using empty list")
        FAQ_DATA = []

    # Check Ollama + model
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        if r.status_code == 200:
            models      = r.json().get("models", [])
            model_names = [m.get("name", "") for m in models]
            logger.info(f"✅ Ollama active — installed models: {model_names}")

            if any(OLLAMA_MODEL in n for n in model_names):
                logger.info(f"✅ Model '{OLLAMA_MODEL}' is ready")
            else:
                logger.error(f"⚠️  Model '{OLLAMA_MODEL}' NOT FOUND in Ollama!")
                logger.error(f"   Fix: ollama pull {OLLAMA_MODEL}")
        else:
            logger.warning(f"Ollama returned HTTP {r.status_code}")
    except Exception as e:
        logger.warning(f"⚠️  Ollama not reachable: {e}")
        logger.warning(f"   Make sure Ollama is running: ollama serve")

    logger.info(f"⏱  Timeout : {OLLAMA_TIMEOUT}s")
    logger.info(f"🔗 Backend origin : {_RAW_BACKEND_URL}")
    logger.info(f"🔗 Backend API v1 : {BACKEND_API_V1}")
    logger.info("=" * 60)


if __name__ == "__main__":
    initialize()
    port = int(os.environ.get("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=True)
