package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.ai.dto.AIChatResponse;
import com.suryakn.IssueTracker.ai.dto.TicketDraftDTO;
import com.suryakn.IssueTracker.service.AIChatClient;
import com.suryakn.IssueTracker.dto.ChatRequest;
import com.suryakn.IssueTracker.dto.ChatResponse;
import com.suryakn.IssueTracker.dto.TicketRequest;
import com.suryakn.IssueTracker.entity.Comment;
import com.suryakn.IssueTracker.entity.Department;
import com.suryakn.IssueTracker.entity.FAQ;
import com.suryakn.IssueTracker.entity.Notification;
import com.suryakn.IssueTracker.entity.Priority;
import com.suryakn.IssueTracker.entity.Project;
import com.suryakn.IssueTracker.entity.Status;
import com.suryakn.IssueTracker.entity.Ticket;
import com.suryakn.IssueTracker.entity.UserEntity;
import com.suryakn.IssueTracker.repository.CommentRepository;
import com.suryakn.IssueTracker.repository.DepartmentRepository;
import com.suryakn.IssueTracker.repository.FAQRepository;
import com.suryakn.IssueTracker.repository.NotificationRepository;
import com.suryakn.IssueTracker.repository.ProjectRepository;
import com.suryakn.IssueTracker.repository.TicketRepository;
import com.suryakn.IssueTracker.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final FAQRepository faqRepository;
    private final RoutingService routingService;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final TicketService ticketService;
    private final UnansweredQuestionService unansweredQuestionService;
    private final AIChatClient aiChatClient;
    private final TicketRepository ticketRepository;
    private final DepartmentRepository departmentRepository;
    private final NotificationRepository notificationRepository;
    private final CommentRepository commentRepository;

    private final Map<String, ConversationContext> sessions = new ConcurrentHashMap<>();
    private TFIDFVectorizer vectorizer = new TFIDFVectorizer();

    private static final Set<String> AFFIRMATIVE_WORDS = Set.of(
            "oui", "ok", "okay", "daccord", "d'accord", "vas y", "vas-y", "confirmer", "confirme", "c'est bon", "parfait", "exact", "bien sûr", "bien sur", "je veux", "je valide", "continuez", "continue", "allez", "go"
    );
    private static final Set<String> NEGATIVE_WORDS = Set.of(
            "non", "annuler", "pas maintenant", "plus tard", "laisse", "stop", "jamais", "rien", "pas utile", "sans objet", "cancel"
    );
    private static final Set<String> GREETING_WORDS = Set.of(
            "bonjour", "salut", "hello", "hi", "bonsoir", "qui es tu", "qui es-tu", "aide", "help", "coucou", "bjr"
    );
    private static final Set<String> THANKS_WORDS = Set.of(
            "merci", "thanks", "remercie", "bravo", "parfait", "super", "génial", "bien joué"
    );
    private static final Map<String, List<String>> CATEGORY_KEYWORDS = new HashMap<>();

    static {
        CATEGORY_KEYWORDS.put("informatique", List.of(
                "wifi", "vpn", "mot de passe", "password", "email", "mail", "reseau", "connexion", "application", 
                "pc", "ordinateur", "bug", "erreur", "imprimante", "logiciel", "informatique", "informatique", 
                "internet", "lent", "lent", "bloqué", "bloque", "acces", "access", "compte", "identifiant",
                "session", "deconnexion", "deconnecte", "serveur", "systeme", "windows", "mac", "linux",
                "outlook", "teams", "sharepoint", "onedrive", "cloud", "messagerie", "signature", "calendar",
                "agenda", "rendez-vous", "reunion", "visio", "teams", "zoom", "crash", "plantage",
                "virus", "malware", "securite", "securite", "cyber", "hack", "phishing", "spam",
                "developpement", "dev", "code", "api", "base de donnees", "database", "sql"
        ));
        CATEGORY_KEYWORDS.put("materiel", List.of(
                "materiel", "matériel", "equipement", "équipement", "ordinateur", "telephone", "téléphone", "ecran", "écran", "souris", "clavier", 
                "casque", "imprimante", "hardware", "device", "peripherique", "périphérique",
                "clavier", "souris", "ecouteurs", "écouteurs", "micro", "webcam", "projecteur", "tableau",
                "smartphone", "tablette", "ipad", "batterie", "chargeur", "cable", "câble", "adaptateur",
                "ecran", "moniteur", "display", "achat materiel", "nouveau", "remplacement",
                "demande materiel", "demande équipement", "requested", "new laptop", "nouvel ordi",
                "siège", "bureau", "fauteuil", "écran", "périphériques", "périphérique"
        ));
        CATEGORY_KEYWORDS.put("administratif", List.of(
                "conge", "absence", "salaire", "bulletin", "contrat", "rh", "administratif", 
                "attestation", "formation", "vacation", "pointage", "presence", "retard", "depart",
                "embauche", "depart", "mutation", "promotion", "evaluation", "entretient", 
                "entretien", "formation", "stage", "intern", "interim", "cdd", "cdi", "contract",
                "avantage", "prime", "indemnite", "repas", "ticket", "transport", "voiture",
                "mission", "deplacement", "note de frais", "recu", "justificatif", "document",
                "carte", "badge", "acces batiment", "parking"
        ));
        CATEGORY_KEYWORDS.put("maintenance", List.of(
                "climatisation", "eclairage", "porte", "plomberie", "bureau", "salle", 
                "maintenance", "ascenseur", "serrure", "chauffage", "radiateur", "climatiseur",
                "conditionnement", "froid", "chaud", "temperature", "toilette", "wc", "robinet",
                "evier", "evacuation", "fuite", "degat", "eau", "incendie", "extincteur",
                "secours", "evacuation", "issue", "sortie", "escalier", "escalier mecanique",
                "monte charge", "monte-charge", "elec", "electricite", "prise", "prise electrique",
                "lumière", "ampoule", "spot", "luminosite", "obscur", "son", "bruit", "vibration"
        ));
        CATEGORY_KEYWORDS.put("achat", List.of(
                "achat", "commande", "fourniture", "budget", "approvisionnement", "besoin",
                "fourniture", "materiel", "equipement", "fournisseur", "cahier des charges",
                "devis", "facture", "bon de commande", "achat", "procurement", "achats",
                "cuisine", "café", "cafe", "the", "eau", "gobelet", "papier", "stylo",
                "crayon", "agenda", "cahier", "classeur", "dossier", "chemise", "trombone",
                "agrafeuse", "perforateur", "table", "chaise", "fauteuil", "bureau",
                "armoire", "etagere", "mobilier", "amenagement", "travaux", "renovation"
        ));
        CATEGORY_KEYWORDS.put("formation", List.of(
                "formation", "certification", "cours", "apprentissage", "stage", "formation",
                "scolarite", "diplome", "certificate", "certificat", "attestation", "validate",
                "competence", "skill", "skill", "learning", "e-learning", "elearning", "module",
                "tuto", "tutorial", "video", "formation en ligne", "mooc", "Udemy", "LinkedIn",
                "inscription", "plan de formation", "budget formation", "dre", "drh"
        ));
    }

    private static final Map<String, String> CATEGORY_LABELS = Map.of(
            "informatique", "Informatique",
            "materiel", "Matériel",
            "administratif", "Administratif",
            "maintenance", "Maintenance",
            "achat", "Achat",
            "formation", "Formation",
            "autres", "Autres"
    );
    
    private static final Map<String, String> PRIORITY_LABELS = Map.of(
            "High", "Haute",
            "Medium", "Normale", 
            "Low", "Faible"
    );

    private static final long SESSION_EXPIRY_MINUTES = 30;

    /**
     * Gather relevant database context based on the user's question
     */
    private Map<String, Object> gatherDatabaseContext(String message, String userEmail) {
        Map<String, Object> context = new HashMap<>();
        String normalizedMessage = normalize(message).toLowerCase();

        try {
            // Get user info
            if (userEmail != null && !userEmail.isBlank()) {
                userRepository.findByEmail(userEmail).ifPresent(user -> {
                    Map<String, Object> userInfo = new HashMap<>();
                    userInfo.put("id", user.getId());
                    userInfo.put("firstName", user.getFirstName());
                    userInfo.put("lastName", user.getLastName());
                    userInfo.put("email", user.getEmail());
                    userInfo.put("role", user.getRole() != null ? user.getRole().name() : null);
                    if (user.getDepartment() != null) {
                        userInfo.put("department", user.getDepartment().getName());
                    }
                    context.put("currentUser", userInfo);

                    // Get user's tickets
                    List<Ticket> userTickets = ticketRepository.findByCreatedBy(user);
                    if (!userTickets.isEmpty()) {
                        context.put("userTicketCount", userTickets.size());
                        List<Map<String, Object>> recentTickets = userTickets.stream()
                                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                                .limit(5)
                                .map(t -> {
                                    Map<String, Object> ticketInfo = new HashMap<>();
                                    ticketInfo.put("id", t.getId());
                                    ticketInfo.put("title", t.getTitle());
                                    ticketInfo.put("status", t.getStatus() != null ? t.getStatus().name() : null);
                                    ticketInfo.put("priority", t.getPriority() != null ? t.getPriority().name() : null);
                                    ticketInfo.put("createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : null);
                                    return ticketInfo;
                                })
                                .collect(Collectors.toList());
                        context.put("userRecentTickets", recentTickets);
                    }

                    // Get user's notifications
                    List<Notification> notifications = notificationRepository.findByUserAndIsReadFalse(user);
                    if (!notifications.isEmpty()) {
                        context.put("unreadNotificationsCount", notifications.size());
                    }
                });
            }

            // Get tickets data if question is about tickets
            if (normalizedMessage.contains("ticket") || normalizedMessage.contains("demande") ||
                normalizedMessage.contains("problème") || normalizedMessage.contains("issue")) {
                List<Ticket> allTickets = ticketRepository.findAll();
                Map<String, Object> ticketsInfo = new HashMap<>();
                ticketsInfo.put("totalCount", allTickets.size());

                // Count by status
                Map<String, Long> byStatus = allTickets.stream()
                        .filter(t -> t.getStatus() != null)
                        .collect(Collectors.groupingBy(t -> t.getStatus().name(), Collectors.counting()));
                ticketsInfo.put("byStatus", byStatus);

                // Count by priority
                Map<String, Long> byPriority = allTickets.stream()
                        .filter(t -> t.getPriority() != null)
                        .collect(Collectors.groupingBy(t -> t.getPriority().name(), Collectors.counting()));
                ticketsInfo.put("byPriority", byPriority);

                // Recent tickets
                List<Map<String, Object>> recentTickets = allTickets.stream()
                        .sorted((a, b) -> {
                            if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
                            if (a.getCreatedAt() == null) return 1;
                            if (b.getCreatedAt() == null) return -1;
                            return b.getCreatedAt().compareTo(a.getCreatedAt());
                        })
                        .limit(10)
                        .map(t -> {
                            Map<String, Object> tInfo = new HashMap<>();
                            tInfo.put("id", t.getId());
                            tInfo.put("title", t.getTitle());
                            tInfo.put("status", t.getStatus() != null ? t.getStatus().name() : null);
                            tInfo.put("priority", t.getPriority() != null ? t.getPriority().name() : null);
                            tInfo.put("createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : null);
                            return tInfo;
                        })
                        .collect(Collectors.toList());
                ticketsInfo.put("recentTickets", recentTickets);

                context.put("tickets", ticketsInfo);
            }

            // Get projects data if question is about projects
            if (normalizedMessage.contains("projet") || normalizedMessage.contains("project")) {
                List<Project> projects = projectRepository.findAll();
                List<Map<String, Object>> projectsInfo = projects.stream()
                        .map(p -> {
                            Map<String, Object> pInfo = new HashMap<>();
                            pInfo.put("id", p.getId());
                            pInfo.put("name", p.getName());
                            if (p.getDepartment() != null) {
                                pInfo.put("department", p.getDepartment().getName());
                            }
                            if (p.getTickets() != null) {
                                pInfo.put("ticketsCount", p.getTickets().size());
                            }
                            return pInfo;
                        })
                        .collect(Collectors.toList());
                context.put("projects", projectsInfo);
            }

            // Get departments data
            if (normalizedMessage.contains("département") || normalizedMessage.contains("department") ||
                normalizedMessage.contains("service")) {
                List<Department> departments = departmentRepository.findAll();
                List<Map<String, Object>> deptInfo = departments.stream()
                        .map(d -> {
                            Map<String, Object> dInfo = new HashMap<>();
                            dInfo.put("id", d.getId());
                            dInfo.put("name", d.getName());
                            if (d.getUsers() != null) {
                                dInfo.put("usersCount", d.getUsers().size());
                            }
                            if (d.getProjects() != null) {
                                dInfo.put("projectsCount", d.getProjects().size());
                            }
                            return dInfo;
                        })
                        .collect(Collectors.toList());
                context.put("departments", deptInfo);
            }

            // Get dashboard stats if question is about statistics/dashboard
            if (normalizedMessage.contains("stat") || normalizedMessage.contains("dashboard") ||
                normalizedMessage.contains("nombre") || normalizedMessage.contains("combien") ||
                normalizedMessage.contains("total")) {
                Map<String, Object> dashboardStats = new HashMap<>();

                long totalTickets = ticketRepository.count();
                dashboardStats.put("totalTickets", totalTickets);

                long openTickets = ticketRepository.countByStatus(Status.Nouveau);
                dashboardStats.put("openTickets", openTickets);

long inProgressTickets = ticketRepository.countByStatus(Status.EnCours);
                 dashboardStats.put("inProgressTickets", inProgressTickets);

                  long resolvedTickets = ticketRepository.countByStatus(Status.Terminé);
                 dashboardStats.put("resolvedTickets", resolvedTickets);

                long totalProjects = projectRepository.count();
                dashboardStats.put("totalProjects", totalProjects);

                long totalUsers = userRepository.count();
                dashboardStats.put("totalUsers", totalUsers);

                context.put("dashboardStats", dashboardStats);
            }

        } catch (Exception e) {
            log.error("Error gathering database context: {}", e.getMessage(), e);
        }

        return context;
    }

     public ChatResponse processChat(ChatRequest request, String authToken) {
        String message = normalize(request.getMessage());
        String sessionId = resolveSessionId(request);

        cleanExpiredSessions();

        if (message.isBlank()) {
            return baseResponse(sessionId)
                    .intent("clarification")
                    .response("Je n'ai pas compris votre message. Décrivez votre besoin ou votre problème en une phrase.")
                    .build();
        }

        ConversationContext context = sessions.computeIfAbsent(sessionId, ignored -> new ConversationContext());

        if (isGreeting(message) && context.getMessageCount() > 2) {
            context = new ConversationContext();
            sessions.put(sessionId, context);
        }

        context.incrementMessageCount();
        context.setLastMessage(message);
        context.setLastInteractionEpochMs(Instant.now().toEpochMilli());

        if (isGreeting(message)) {
            return greet(sessionId);
        }

        if (request.getCreateTicket() != null && request.getCreateTicket()) {
            return createTicketFromChat(request, sessionId, context);
        }

        if (isThanks(message)) {
            return handleThanks(sessionId, context);
        }

        if (isAffirmative(message) && context.getPendingDraft() != null) {
            return buildDraftConfirmation(sessionId, context);
        }

        if (isAffirmative(message) && context.isEscalationRequested()) {
            context.setPendingDraft(null);
            return createEscalationTicket(sessionId, request, context);
        }

        if (isNegative(message) && context.getPendingDraft() != null) {
            context.setPendingDraft(null);
            return baseResponse(sessionId)
                    .intent("cancel_ticket")
                    .response("Très bien. Je garde le contexte de votre demande si vous voulez continuer la discussion ou reformuler le besoin.")
                    .build();
        }

        if (isNegative(message) && context.isEscalationRequested()) {
            context.setEscalationRequested(false);
            context.resetFailedAttempts();
            return baseResponse(sessionId)
                    .intent("escalation_cancelled")
                    .response("Très bien. Je reste à votre disposition. Décrivez-moi autrement votre besoin ou posez-moi une autre question.")
                    .build();
        }

        // AI Integration: call external AI chatbot service with database context
        if (aiChatClient.isAvailable()) {
            // Gather relevant database context based on user's question
            Map<String, Object> dbContext = gatherDatabaseContext(message, request.getUserEmail());

            AIChatResponse aiResponse = aiChatClient.chat(message, sessionId, request.getUserEmail(), dbContext, authToken);
            if (aiResponse != null && aiResponse.getResponse() != null) {
                // Update conversation context with AI insights
                if (aiResponse.getCategory() != null) {
                    context.setLastCategory(aiResponse.getCategory());
                }
                if (aiResponse.getTicketDraft() != null) {
                    context.setPendingDraft(new TicketDraft(
                            aiResponse.getTicketDraft().getTitle(),
                            aiResponse.getTicketDraft().getDescription(),
                            aiResponse.getTicketDraft().getCategory(),
                            aiResponse.getTicketDraft().getPriority(),
                            request.getUserEmail()
                    ));
                }
                if (Boolean.TRUE.equals(aiResponse.getNeedsEscalation())) {
                    context.setEscalationRequested(true);
                }
                if (aiResponse.getConfidenceScore() != null) {
                    context.setLastConfidenceScore(aiResponse.getConfidenceScore());
                }
                return convertAIChatResponse(aiResponse, sessionId);
            }
        }

        String normalizedMsg = normalize(message);
        boolean isExplicitRequest = normalizedMsg.contains("demande") || normalizedMsg.contains("request") || normalizedMsg.contains("besoin");
        
        KnowledgeHit bestKnowledgeHit = findBestKnowledgeHit(message);
        
        boolean hasValidMatch = bestKnowledgeHit != null && 
                                bestKnowledgeHit.score >= 5 && 
                                bestKnowledgeHit.semanticScore >= 0.5;

        if (!hasValidMatch) {
            context.incrementFailedAttempts();
            context.setLastConfidenceScore(bestKnowledgeHit != null ? bestKnowledgeHit.semanticScore : 0.0);
        } else {
            context.resetFailedAttempts();
        }

        if (hasValidMatch) {
            context.setLastCategory(bestKnowledgeHit.category);
            context.setLastKnowledgeTitle(bestKnowledgeHit.title);
            context.setLastConfidenceScore(bestKnowledgeHit.semanticScore);
            context.setPendingDraft(null);
            if (isExplicitRequest) {
                String directAnswer = """
                        %s

                        Source: %s
                        """.formatted(bestKnowledgeHit.excerpt, bestKnowledgeHit.typeLabel);
                return baseResponse(sessionId)
                        .intent("faq_direct_answer")
                        .category(defaultCategory(bestKnowledgeHit.category))
                        .suggestedDepartment(routingService.getSuggestedDepartmentName(bestKnowledgeHit.category))
                        .knowledgeType(bestKnowledgeHit.type)
                        .knowledgeTitle(bestKnowledgeHit.title)
                        .response(directAnswer.strip())
                        .build();
            }
            return knowledgeResponse(sessionId, bestKnowledgeHit);
        }

        if (context.getFailedAttempts() >= 2 && !context.isEscalationRequested()) {
            context.setEscalationRequested(true);
            return buildEscalationResponse(sessionId, request.getUserEmail(), context);
        }

        String detectedCategory = Optional.ofNullable(detectCategory(message)).orElse(context.getLastCategory());
        
        if (detectedCategory.equals("autres") && context.getLastCategory() != null && !context.getLastCategory().equals("autres")) {
            detectedCategory = context.getLastCategory();
        }
        
        if (detectedCategory.equals("autres")) {
            return baseResponse(sessionId)
                    .intent("needs_clarification")
                    .response("Je n'ai pas bien compris la catégorie de votre demande. Pouvez-vous être plus précis ? " +
                              "Par exemple : problème informatique, demande de matériel, question RH, problème de bâtiment, demande d'achat, etc.")
                    .build();
        }
        
        String suggestedPriority = detectPriority(message).name();
        TicketDraft draft = buildDraft(message, detectedCategory, suggestedPriority, request.getUserEmail());
        context.setLastCategory(detectedCategory);
        context.setPendingDraft(draft);

        String department = routingService.getSuggestedDepartmentName(detectedCategory);
        SuggestedProject suggestedProject = resolveSuggestedProject(department, request.getUserEmail());

        String response = """
                Je peux vous aider à transformer cela en demande exploitable.

                Analyse rapide :
                - Catégorie suggérée : %s
                - Priorité suggérée : %s
                - Service cible : %s

                Si vous voulez continuer, répondez "oui" et je vous prépare un brouillon de ticket prêt à compléter.
                """.formatted(labelForCategory(detectedCategory), suggestedPriority, department);

        return baseResponse(sessionId)
                .intent("ticket_guidance")
                .category(defaultCategory(detectedCategory))
                .suggestedCategory(defaultCategory(detectedCategory))
                .suggestedPriority(suggestedPriority)
                .suggestedDepartment(department)
                .suggestedProjectId(suggestedProject.projectId)
                .suggestedProjectName(suggestedProject.projectName)
                .needsTicketCreation(true)
                .draftTitle(draft.title)
                .draftDescription(draft.description)
                .response(response.strip())
                .build();
    }

    public List<FAQ> searchKnowledgeBase(String query) {
        String normalized = normalize(query);
        return faqRepository.findByActiveTrue().stream()
                .filter(faq -> computeScore(normalized, normalize(faq.getQuestion() + " " + faq.getAnswer() + " " + String.join(" ", safeList(faq.getKeywords())))) > 0)
                .sorted(Comparator.comparingInt((FAQ faq) -> computeScore(normalized, normalize(faq.getQuestion() + " " + faq.getAnswer()))).reversed())
                .limit(10)
                .collect(Collectors.toList());
    }

    private ChatResponse greet(String sessionId) {
        return baseResponse(sessionId)
                .intent("greeting")
                .category("autres")
                .response("""
                        Bonjour, je suis l'assistant interne Air Algérie.

                        Je peux :
                        - répondre à une question via la FAQ ou les procédures
                        - orienter votre demande vers le bon service
                        - préparer un brouillon de ticket à partir de votre message
                        """.strip())
                .build();
    }

    private ChatResponse knowledgeResponse(String sessionId, KnowledgeHit hit) {
        String answer = """
                J'ai trouvé une ressource pertinente dans la base de connaissance.

                %s : %s

                %s

                Si cela ne suffit pas, je peux aussi vous préparer un ticket orienté vers le service %s.
                """.formatted("FAQ", hit.title, hit.excerpt, routingService.getSuggestedDepartmentName(hit.category));

        return baseResponse(sessionId)
                .intent("faq_match")
                .category(defaultCategory(hit.category))
                .suggestedCategory(defaultCategory(hit.category))
                .suggestedDepartment(routingService.getSuggestedDepartmentName(hit.category))
                .knowledgeType("faq")
                .knowledgeTitle(hit.title)
                .response(answer.strip())
                .build();
    }

    private ChatResponse buildEscalationResponse(String sessionId, String userEmail, ConversationContext context) {
        String department = routingService.getSuggestedDepartmentName("informatique");
        SuggestedProject suggestedProject = resolveSuggestedProject(department, userEmail);

        String previousContext = context.getLastMessage() != null ? context.getLastMessage() : "Échange avec l'assistant";

        unansweredQuestionService.saveQuestion(
                previousContext,
                "Low confidence after multiple attempts. Category: " + context.getLastCategory(),
                userEmail,
                context.getLastCategory(),
                department,
                null
        );

        return baseResponse(sessionId)
                .intent("escalation")
                .category("informatique")
                .suggestedCategory("informatique")
                .suggestedPriority("High")
                .suggestedDepartment(department)
                .suggestedProjectId(suggestedProject.projectId)
                .suggestedProjectName(suggestedProject.projectName)
                .confidenceScore(context.getLastConfidenceScore())
                .needsEscalation(true)
                .response("""
                        Je n'ai pas réussi à trouver une solution adaptée à votre demande après plusieurs tentatives.

                        Un technician du support sera plus qualifié pour vous aider directement.

                        Voulez-vous que je crée un ticket de support prioritaire pour escalader vers un agent ?
                        """.strip())
                .build();
    }

    private ChatResponse buildDraftConfirmation(String sessionId, ConversationContext context) {
        TicketDraft draft = context.getPendingDraft();
        String department = routingService.getSuggestedDepartmentName(draft.category);
        SuggestedProject suggestedProject = resolveSuggestedProject(department, draft.userEmail);

        String response = """
                J'ai préparé un brouillon de ticket.

                - Titre : %s
                - Catégorie : %s
                - Priorité : %s
                - Service visé : %s

                Ouvrez la création de ticket pour vérifier et compléter les informations avant envoi.
                """.formatted(draft.title, labelForCategory(draft.category), draft.priority, department);

        return baseResponse(sessionId)
                .intent("ticket_draft_ready")
                .category(defaultCategory(draft.category))
                .suggestedCategory(defaultCategory(draft.category))
                .suggestedPriority(draft.priority)
                .suggestedDepartment(department)
                .suggestedProjectId(suggestedProject.projectId)
                .suggestedProjectName(suggestedProject.projectName)
                .needsTicketCreation(true)
                .draftTitle(draft.title)
                .draftDescription(draft.description)
                .response(response.strip())
                .build();
    }

    private KnowledgeHit findBestKnowledgeHit(String message) {
        List<KnowledgeHit> hits = new ArrayList<>();
        String normalizedMessage = normalize(message);
        String detectedCategory = detectCategory(message);
        Set<String> messageTokens = tokenize(normalizedMessage);

        for (FAQ faq : faqRepository.findByActiveTrue()) {
            String faqQuestion = normalize(faq.getQuestion());
            String faqAnswer = normalize(faq.getAnswer());
            String keywords = String.join(" ", safeList(faq.getKeywords()));
            String corpus = faqQuestion + " " + faqAnswer + " " + keywords;
            Set<String> faqTokens = tokenize(faqQuestion);
            
            int matchingKeyWords = 0;
            for (String token : messageTokens) {
                if (token.length() >= 4 && !COMMON_WORDS.contains(token) && faqTokens.contains(token)) {
                    matchingKeyWords++;
                }
            }
            
            int keywordScore = computeScore(message, corpus);
            double semanticScore = vectorizer.cosineSimilarity(message, corpus) * 10;
            
            int boostScore = 0;
            if (detectedCategory != null && faq.getCategory() != null && 
                detectedCategory.equals(faq.getCategory())) {
                boostScore = 2;
            }
            
            double combinedScore = keywordScore + semanticScore + boostScore;
            if (combinedScore > 0 && matchingKeyWords >= 1) {
                hits.add(new KnowledgeHit(faq.getQuestion(), excerpt(faq.getAnswer()), defaultCategory(faq.getCategory()), (int) combinedScore, semanticScore, "faq", "FAQ"));
            }
}

        return hits.stream()
                .max(Comparator.comparingInt(hit -> hit.score))
                .orElse(null);
    }

    private static final Set<String> COMMON_WORDS = Set.of(
        "je", "vous", "nous", "ils", "elle", "est", "suis", "sommes", "etes",
        "vouloir", "veux", "souhaite", "souhaiter", "faire", "fait",
        "demande", "demander", "request", "une", "des", "le", "la", "les", "un",
        "pour", "avec", "sans", "dans", "sur", "ce", "cette", "ces", "mon", "ma",
        "mes", "ton", "ta", "tes", "notre", "votre", "leur", "qui", "quoi",
        "comment", "pourquoi", "quand", "ou", "ete", "etait", "etais", "etaient"
    );

    private int computeScore(String query, String corpus) {
        if (corpus.isEmpty() || query.isEmpty()) {
            return 0;
        }
        
        String normalizedQuery = normalize(query);
        String normalizedCorpus = normalize(corpus);
        
        if (normalizedCorpus.contains(normalizedQuery) || normalizedQuery.length() > 3) {
            Set<String> queryTokens = tokenize(normalizedQuery);
            Set<String> corpusTokens = tokenize(normalizedCorpus);
            
            int exactMatches = 0;
            int partialMatches = 0;
            
            for (String token : queryTokens) {
                if (token.length() < 2) continue;
                if (COMMON_WORDS.contains(token)) continue;
                
                if (corpusTokens.contains(token)) {
                    exactMatches += 3;
                } else {
                    for (String corpusToken : corpusTokens) {
                        if (corpusToken.length() >= 3 && !COMMON_WORDS.contains(corpusToken) && 
                            (token.startsWith(corpusToken) || corpusToken.startsWith(token) || levenshteinDistance(token, corpusToken) <= 2)) {
                            partialMatches += 1;
                            break;
                        }
                    }
                }
            }
            
            return exactMatches + partialMatches;
        }
        
        return 0;
    }
    
    private int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];
        
        for (int i = 0; i <= s1.length(); i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= s2.length(); j++) {
            dp[0][j] = j;
        }
        
        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(Math.min(dp[i - 1][j], dp[i][j - 1]), dp[i - 1][j - 1]);
                }
            }
        }
        
        return dp[s1.length()][s2.length()];
    }

    private Set<String> tokenize(String text) {
        return Arrays.stream(text.split("\\s+"))
                .map(String::trim)
                .filter(token -> !token.isBlank())
                .collect(Collectors.toCollection(HashSet::new));
    }

    private Priority detectPriority(String message) {
        if (containsAny(message, List.of("urgent", "critique", "bloquant", "hors service", "grave"))) {
            return Priority.High;
        }
        if (containsAny(message, List.of("quand possible", "faible", "simple", "mineur"))) {
            return Priority.Low;
        }
        return Priority.Medium;
    }

    private String detectCategory(String message) {
        String bestCategory = null;
        int bestScore = 0;
        
        String normalizedMessage = normalize(message);
        
        if (normalizedMessage.contains("demande") || normalizedMessage.contains("request")) {
            if (normalizedMessage.contains("materiel") || normalizedMessage.contains("equipement") || 
                normalizedMessage.contains("requested") || normalizedMessage.contains("achat") ||
                normalizedMessage.contains("nouveau") || normalizedMessage.contains("demander")) {
                return "materiel";
            }
            if (normalizedMessage.contains("conge") || normalizedMessage.contains("attestation") || 
                normalizedMessage.contains("absence") || normalizedMessage.contains("vacation") || 
                normalizedMessage.contains("rh") || normalizedMessage.contains("bulletin")) {
                return "administratif";
            }
            if (normalizedMessage.contains("wifi") || normalizedMessage.contains("vpn") || 
                normalizedMessage.contains("password") || normalizedMessage.contains("internet") || 
                normalizedMessage.contains("reseau") || normalizedMessage.contains("connexion") || 
                normalizedMessage.contains("email") || normalizedMessage.contains("ordinateur")) {
                return "informatique";
            }
            if (normalizedMessage.contains("climate") || normalizedMessage.contains("climatisation") || 
                normalizedMessage.contains("porte") || normalizedMessage.contains("plomberie") ||
                normalizedMessage.contains("chauffage") || normalizedMessage.contains("ascenseur")) {
                return "maintenance";
            }
        }
        
        Map<String, Integer> categoryScores = new HashMap<>();
        
        for (Map.Entry<String, List<String>> entry : CATEGORY_KEYWORDS.entrySet()) {
            int score = 0;
            Set<String> messageTokens = tokenize(message);
            
            for (String keyword : entry.getValue()) {
                String normalizedKeyword = normalize(keyword);
                if (normalizedKeyword.length() >= 3) {
                    if (message.contains(normalizedKeyword)) {
                        score += 2;
                    }
                    for (String token : messageTokens) {
                        if (token.length() >= 3 && (normalizedKeyword.contains(token) || token.contains(normalizedKeyword))) {
                            score += 1;
                        }
                    }
                } else if (message.contains(normalizedKeyword)) {
                    score += 1;
                }
            }
            
            categoryScores.put(entry.getKey(), score);
            
            if (score > bestScore) {
                bestScore = score;
                bestCategory = entry.getKey();
            }
        }

        return bestCategory == null ? "autres" : bestCategory;
    }

    private TicketDraft buildDraft(String message, String category, String priority, String userEmail) {
        String cleanMessage = compact(message);
        String title = cleanMessage.length() > 90 ? cleanMessage.substring(0, 90) + "..." : cleanMessage;
        if (title.isBlank()) {
            title = "Nouvelle demande interne";
        }

        String description = """
                Demande préparée depuis l'assistant interne.

                Besoin exprimé :
                %s

                Catégorie suggérée : %s
                Priorité suggérée : %s
                """.formatted(requestSafeSentence(message), labelForCategory(category), priority).strip();

        return new TicketDraft(title, description, defaultCategory(category), priority, userEmail);
    }

    private SuggestedProject resolveSuggestedProject(String departmentName, String userEmail) {
        Optional<Project> departmentProject = projectRepository.findAll().stream()
                .filter(project -> project.getDepartment() != null && departmentName.equalsIgnoreCase(project.getDepartment().getName()))
                .findFirst();

        if (departmentProject.isPresent()) {
            Project project = departmentProject.get();
            return new SuggestedProject(project.getId(), project.getName());
        }

        Optional<UserEntity> user = Optional.ofNullable(userEmail)
                .flatMap(userRepository::findByEmail);
        if (user.isPresent() && user.get().getDepartment() != null) {
            Optional<Project> fallback = projectRepository.findByDepartmentId(user.get().getDepartment().getId()).stream().findFirst();
            if (fallback.isPresent()) {
                Project project = fallback.get();
                return new SuggestedProject(project.getId(), project.getName());
            }
        }

        return projectRepository.findAll().stream()
                .findFirst()
                .map(project -> new SuggestedProject(project.getId(), project.getName()))
                .orElse(new SuggestedProject(null, null));
    }

    private String resolveSessionId(ChatRequest request) {
        if (request.getSessionId() != null && !request.getSessionId().isBlank()) {
            return request.getSessionId();
        }
        if (request.getUserEmail() != null && !request.getUserEmail().isBlank()) {
            return "user:" + request.getUserEmail().toLowerCase(Locale.ROOT);
        }
        return "anon:" + UUID.randomUUID();
    }

    private ChatResponse.ChatResponseBuilder baseResponse(String sessionId) {
        return ChatResponse.builder()
                .sessionId(sessionId)
                .needsTicketCreation(false)
                .category("autres")
                .suggestedCategory("autres");
    }

    private boolean isGreeting(String message) {
        return containsAny(message, List.of("bonjour", "salut", "hello", "hi", "bonsoir", "qui es tu", "qui es-tu", "aide", "coucou", "bjr"));
    }

    private boolean isThanks(String message) {
        return THANKS_WORDS.stream().anyMatch(word -> message.contains(word));
    }

    private ChatResponse handleThanks(String sessionId, ConversationContext context) {
        String response;
        
        if (context.getPendingDraft() != null) {
            response = "Avec plaisir ! Pour créer votre ticket, répondez \"oui\" et je finalise le brouillon. Ou décrivez-moi plus en détail votre besoin.";
        } else {
            response = "De rien ! Je suis là pour vous aider. Posez-moi votre question ou décrivez votre besoin.";
        }
        
        return baseResponse(sessionId)
                .intent("thanks")
                .category("autres")
                .response(response)
                .build();
    }

    private boolean isAffirmative(String message) {
        return AFFIRMATIVE_WORDS.stream().anyMatch(message::contains);
    }

    private boolean isNegative(String message) {
        return NEGATIVE_WORDS.stream().anyMatch(message::contains);
    }

    private boolean containsWord(String normalizedText, String word) {
        if (normalizedText == null || word == null) return false;
        String normalizedWord = normalize(word);
        if (normalizedWord.isBlank()) return false;
        String[] tokens = normalizedWord.split("\\s+");
        for (String token : tokens) {
            if (token.length() >= 3 && normalizedText.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsAny(String message, List<String> candidates) {
        return candidates.stream().map(this::normalize).anyMatch(message::contains);
    }

    private String normalize(String input) {
        if (input == null) {
            return "";
        }
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
        return normalized.replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    private String compact(String input) {
        return input == null ? "" : input.trim().replaceAll("\\s+", " ");
    }

    private String excerpt(String input) {
        String compact = compact(input);
        return compact.length() > 320 ? compact.substring(0, 320) + "..." : compact;
    }

    private String requestSafeSentence(String input) {
        String compact = compact(input);
        return compact.isBlank() ? "Aucun détail fourni." : compact;
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : values;
    }

    private String labelForCategory(String category) {
        return CATEGORY_LABELS.getOrDefault(defaultCategory(category), "Autres");
    }
    
    private String labelForPriority(String priority) {
        return PRIORITY_LABELS.getOrDefault(priority, "Normale");
    }

    private String defaultCategory(String category) {
        return category == null || category.isBlank() ? "autres" : category;
    }

    @lombok.Data
    private static class ConversationContext {
        private String lastCategory;
        private String lastKnowledgeTitle;
        private String lastMessage;
        private Long lastInteractionEpochMs;
        private TicketDraft pendingDraft;
        private int messageCount = 0;
        private int failedAttempts = 0;
        private double lastConfidenceScore = 0.0;
        private boolean escalationRequested = false;

        public void incrementMessageCount() {
            this.messageCount++;
        }

        public void incrementFailedAttempts() {
            this.failedAttempts++;
        }

        public void resetFailedAttempts() {
            this.failedAttempts = 0;
        }
    }
    
    private void cleanExpiredSessions() {
        long now = Instant.now().toEpochMilli();
        sessions.entrySet().removeIf(entry -> {
            ConversationContext ctx = entry.getValue();
            return ctx.getLastInteractionEpochMs() != null && 
                   (now - ctx.getLastInteractionEpochMs()) > SESSION_EXPIRY_MINUTES * 60 * 1000;
        });
    }

    private ChatResponse createTicketFromChat(ChatRequest request, String sessionId, ConversationContext context) {
        try {
            String title = request.getTitle();
            String description = request.getDescription();
            String category = request.getCategory() != null ? request.getCategory() : context.getLastCategory();
            String priority = request.getPriority() != null ? request.getPriority() : "Medium";
            String userEmail = request.getUserEmail();
            String department = routingService.getSuggestedDepartmentName(defaultCategory(category));
            
            // Pour les tickets générés par chatbot, le projet sera déterminé par l'admin
            // On ne passe pas de projet pour permettre à l'admin d'orienter le ticket
            Long projectId = null; // Le projet sera assigné par l'admin
            log.info("Chatbot ticket created without project - awaiting admin orientation");

            if (title == null || title.isBlank()) {
                return baseResponse(sessionId)
                        .intent("ticket_creation_error")
                        .response("Le titre du ticket est obligatoire. Pouvez-vous me donner un titre pour votre demande?")
                        .build();
            }
            
            // Note: projectId peut être null ici (le ticket sera créé sans projet)
            // L'admin pourra l'orienter vers un projet depuis le panneau d'administration

            TicketRequest ticketRequest = TicketRequest.builder()
                    .title(title)
                    .description(description != null ? description : "Ticket créé depuis l'assistant interne.")
                    .category(defaultCategory(category))
                    .priority(priority != null ? com.suryakn.IssueTracker.entity.Priority.valueOf(priority) : com.suryakn.IssueTracker.entity.Priority.Medium)
                    .project(projectId)
                    .reporter(userEmail)
                    .build();

            ResponseEntity<?> response = ticketService.addTicket(ticketRequest);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                com.suryakn.IssueTracker.dto.TicketResponse ticketResponse = (com.suryakn.IssueTracker.dto.TicketResponse) response.getBody();
                Long ticketId = ticketResponse.getId();
                
                context.setPendingDraft(null);

                unansweredQuestionService.saveQuestion(
                        title,
                        description,
                        userEmail,
                        category,
                        department,
                        ticketId
                );
                
                return baseResponse(sessionId)
                        .intent("ticket_created")
                        .category(defaultCategory(category))
                        .needsTicketCreation(true)
                        .ticketCreated(true)
                        .ticketId(ticketId)
                        .ticketUrl("/projects/" + projectId + "/tickets/" + ticketId)
                        .response("Votre ticket a été créé avec succès!\n\n" +
                                  "Ticket #" + ticketId + " - " + title + "\n" +
                                  "Catégorie: " + labelForCategory(category) + "\n" +
                                  "Priorité: " + labelForPriority(priority) + "\n\n" +
                                  "Vous pouvez suivre l'avancement de votre ticket dans la section Projets.")
                        .build();
            } else {
                return baseResponse(sessionId)
                        .intent("ticket_creation_error")
                        .response("Une erreur s'est produite lors de la création du ticket. Veuillez réessayer ou créer le ticket manuellement.")
                        .build();
            }
        } catch (Exception e) {
            log.error("Error creating ticket from chat: {}", e.getMessage(), e);
            return baseResponse(sessionId)
                    .intent("ticket_creation_error")
                    .response("Une erreur technique s'est produite: " + e.getMessage())
                    .build();
        }
    }

    private ChatResponse createEscalationTicket(String sessionId, ChatRequest request, ConversationContext context) {
        try {
            String userEmail = request.getUserEmail();
            String lastMessage = context.getLastMessage() != null ? context.getLastMessage() : "demande non comprise";

            String department = routingService.getSuggestedDepartmentName("informatique");
            SuggestedProject suggestedProject = resolveSuggestedProject(department, userEmail);
            Long projectId = suggestedProject.projectId;

            if (projectId == null) {
                return baseResponse(sessionId)
                        .intent("escalation_error")
                        .response("Aucun projet trouvé pour le support informatique. Veuillez contacter le support directement.")
                        .build();
            }

            String escalationDescription = String.format("""
                    === DEMANDE ESCALADÉE VERS LE SUPPORT HUMAIN ===

                    Message initial de l'utilisateur :
                    %s

                    Contexte :
                    - Tentatives infructueuses avec l'assistant IA : %d
                    - Dernier score de confiance : %.2f

                    Ce ticket nécessite une attention humaine prioritaire.
                    [TAG: HELP_NEEDED]
                    """.strip(), lastMessage, context.getFailedAttempts(), context.getLastConfidenceScore());

            TicketRequest ticketRequest = TicketRequest.builder()
                    .title("[ESCALADE] Assistance requise - " + compact(lastMessage).substring(0, Math.min(50, compact(lastMessage).length())))
                    .description(escalationDescription)
                    .category("informatique")
                    .priority(com.suryakn.IssueTracker.entity.Priority.High)
                    .project(projectId)
                    .reporter(userEmail)
                    .build();

            ResponseEntity<?> response = ticketService.addTicket(ticketRequest);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                com.suryakn.IssueTracker.dto.TicketResponse ticketResponse = (com.suryakn.IssueTracker.dto.TicketResponse) response.getBody();
                Long ticketId = ticketResponse.getId();

                context.setPendingDraft(null);
                context.setEscalationRequested(false);

                return baseResponse(sessionId)
                        .intent("escalation_created")
                        .category("informatique")
                        .needsTicketCreation(true)
                        .ticketCreated(true)
                        .ticketId(ticketId)
                        .ticketUrl("/projects/" + projectId + "/tickets/" + ticketId)
                        .response("Votre demande a été escaladée vers un technician du support!\n\n" +
                                  "Ticket #" + ticketId + " créé en priorité haute\n" +
                                  "Un agent de support vous contactera rapidement.\n\n" +
                                  "Vous pouvez suivre votre ticket dans la section Projets.")
                        .build();
            } else {
                return baseResponse(sessionId)
                        .intent("escalation_error")
                        .response("Une erreur s'est produite lors de la création du ticket d'escalade. Veuillez contacter le support directement.")
                        .build();
            }
        } catch (Exception e) {
            log.error("Error creating escalation ticket: {}", e.getMessage(), e);
            return baseResponse(sessionId)
                    .intent("escalation_error")
                    .response("Une erreur technique s'est produite: " + e.getMessage())
                    .build();
        }
    }

    private ChatResponse convertAIChatResponse(AIChatResponse ai, String sessionId) {
        String category = defaultCategory(ai.getCategory());
        String suggestedCategory = category;
        if (ai.getTicketDraft() != null && ai.getTicketDraft().getCategory() != null) {
            suggestedCategory = defaultCategory(ai.getTicketDraft().getCategory());
        }

        String priority = ai.getPriority();
        String suggestedPriority = priority;
        if (ai.getTicketDraft() != null && ai.getTicketDraft().getPriority() != null) {
            suggestedPriority = ai.getTicketDraft().getPriority();
        }

        ChatResponse.ChatResponseBuilder builder = ChatResponse.builder()
                .sessionId(sessionId)
                .response(ai.getResponse())
                .intent(ai.getIntent())
                .category(category)
                .suggestedCategory(suggestedCategory)
                .suggestedPriority(suggestedPriority)
                .suggestedDepartment(ai.getSuggestedDepartment())
                .confidenceScore(ai.getIntentConfidence())
                .needsEscalation(ai.getNeedsEscalation())
                .knowledgeType(ai.getKnowledgeType())
                .knowledgeTitle(ai.getKnowledgeTitle())
                .priority(priority)
                .entities(ai.getEntities());

        if (ai.getSentiment() != null) {
            builder.sentiment(ai.getSentiment().getSentiment());
            builder.urgency(ai.getSentiment().getUrgency());
        }

        if (ai.getTicketDraft() != null) {
            builder.needsTicketCreation(true);
            builder.draftTitle(ai.getTicketDraft().getTitle());
            builder.draftDescription(ai.getTicketDraft().getDescription());
            builder.suggestedProjectId(ai.getTicketDraft().getProjectId());
            builder.suggestedProjectName(ai.getTicketDraft().getProjectName());
        }

        if (ai.getTicketCreated() != null && ai.getTicketCreated()) {
            builder.ticketCreated(true);
            builder.ticketId(ai.getTicketId());
            builder.ticketUrl(ai.getTicketUrl());
        }

        return builder.build();
    }

    @Builder
    @AllArgsConstructor
    private static class KnowledgeHit {
        private String title;
        private String excerpt;
        private String category;
        private int score;
        private double semanticScore;
        private String type;
        private String typeLabel;
    }

    @AllArgsConstructor
    private static class TicketDraft {
        private String title;
        private String description;
        private String category;
        private String priority;
        private String userEmail;
    }

    @AllArgsConstructor
    private static class SuggestedProject {
        private Long projectId;
        private String projectName;
    }

    private static class TFIDFVectorizer {
        private Map<String, Double> idfCache = new HashMap<>();

        double cosineSimilarity(String text1, String text2) {
            if (text1.isBlank() || text2.isBlank()) {
                return 0.0;
            }

            String norm1 = normalizeStatic(text1);
            String norm2 = normalizeStatic(text2);

            Set<String> tokens1 = tokenizeStatic(norm1);
            Set<String> tokens2 = tokenizeStatic(norm2);

            if (tokens1.isEmpty() || tokens2.isEmpty()) {
                return 0.0;
            }

            Map<String, Double> tf1 = computeTF(tokens1);
            Map<String, Double> tf2 = computeTF(tokens2);

            Set<String> allTokens = new HashSet<>(tokens1);
            allTokens.addAll(tokens2);

            if (allTokens.isEmpty()) {
                return 0.0;
            }

            double dotProduct = 0.0;
            double normA = 0.0;
            double normB = 0.0;

            for (String token : allTokens) {
                double val1 = tf1.getOrDefault(token, 0.0);
                double val2 = tf2.getOrDefault(token, 0.0);
                dotProduct += val1 * val2;
                normA += val1 * val1;
                normB += val2 * val2;
            }

            double denominator = Math.sqrt(normA) * Math.sqrt(normB);
            if (denominator == 0.0) {
                return 0.0;
            }

            return dotProduct / denominator;
        }

        private Map<String, Double> computeTF(Set<String> tokens) {
            Map<String, Integer> counts = new HashMap<>();
            for (String token : tokens) {
                counts.merge(token, 1, Integer::sum);
            }

            int maxCount = counts.values().stream().mapToInt(Integer::intValue).max().orElse(1);
            Map<String, Double> tf = new HashMap<>();
            for (Map.Entry<String, Integer> entry : counts.entrySet()) {
                tf.put(entry.getKey(), 0.5 + 0.5 * entry.getValue() / maxCount);
            }
            return tf;
        }

        private static String normalizeStatic(String input) {
            if (input == null) {
                return "";
            }
            String normalized = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "")
                    .toLowerCase(java.util.Locale.ROOT);
            return normalized.replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
        }

        private static Set<String> tokenizeStatic(String text) {
            return java.util.Arrays.stream(text.split("\\s+"))
                    .map(String::trim)
                    .filter(token -> !token.isBlank())
                    .collect(java.util.stream.Collectors.toCollection(java.util.HashSet::new));
        }
    }
}
