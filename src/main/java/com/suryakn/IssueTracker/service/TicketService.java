package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.classification.ClassificationResponse;
import com.suryakn.IssueTracker.classification.ClassificationService;
import com.suryakn.IssueTracker.dto.*;
import com.suryakn.IssueTracker.duplicate.DuplicateTicketRequest;
import com.suryakn.IssueTracker.duplicate.DuplicateTicketService;
import com.suryakn.IssueTracker.duplicate.PythonResponse;
import com.suryakn.IssueTracker.entity.*;
import com.suryakn.IssueTracker.repository.CategoryRepository;
import com.suryakn.IssueTracker.repository.CommentRepository;
import com.suryakn.IssueTracker.repository.CommentScreenshotRepository;
import com.suryakn.IssueTracker.repository.ScreenshotRepository;
import com.suryakn.IssueTracker.repository.ProjectRepository;
import com.suryakn.IssueTracker.repository.TicketRepository;
import com.suryakn.IssueTracker.repository.UserRepository;
import com.suryakn.IssueTracker.repository.VectorTableRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Comparator;
import java.util.stream.Collectors;
import java.io.IOException;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final CategoryRepository categoryRepository;
    private final DuplicateTicketService duplicateTicketService;
    private final ClassificationService classificationService;
    private final RoutingService routingService;
    private final VectorTableRepository vectorTableRepository;
    private final CommentService commentService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final CommentScreenshotRepository commentScreenshotRepository;
    private final ScreenshotRepository screenshotRepository;
    private final CommentRepository commentRepository;
    // private final AttachmentRepository attachmentRepository;
    
    /**
     * Send notification to assigned user when the reporter modifies the ticket.
     */
    private void notifyAssignedOnReporterModification(Ticket ticket, UserEntity reporter, String actionDescription) {
        if (ticket.getAssignedTo() == null) {
            return;
        }
        
        // Don't notify if the reporter is the same as assigned to
        if (ticket.getAssignedTo().getId().equals(reporter.getId())) {
            return;
        }
        
        Department department = ticket.getProject() != null ? ticket.getProject().getDepartment() : null;
        
        notificationService.createNotification(
            NotificationType.TICKET_MODIFIED,
            "Ticket modifié par le reporter",
            "Le ticket '" + ticket.getTitle() + "' a été modifié par " + reporter.getFirstName() + " " + reporter.getLastName() + ": " + actionDescription,
            ticket.getAssignedTo(),
            department,
            ticket.getId()
        );
        
        log.info("Notification sent to {} about ticket {} modification by reporter {}", 
            ticket.getAssignedTo().getEmail(), ticket.getId(), reporter.getEmail());
    }
    
    /**
     * Send notification to admin users and assigned support when a ticket is modified by SUPPORT.
     */
    private void notifyAdminsAndAssignedSupport(Ticket ticket, UserEntity modifier, String actionDescription) {
        Department department = ticket.getProject() != null ? ticket.getProject().getDepartment() : null;
        if (department == null) {
            return;
        }
        
        // Notify all ADMIN users in the department
        List<UserEntity> admins = userRepository.findAllByRoleAndDepartment(Role.ADMIN, department);
        for (UserEntity admin : admins) {
            // Avoid self-notification
            if (!admin.getId().equals(modifier.getId())) {
                notificationService.createNotification(
                    NotificationType.TICKET_MODIFIED,
                    "Ticket modifié",
                    "Le ticket '" + ticket.getTitle() + "' a été modifié par " + modifier.getFirstName() + " " + modifier.getLastName() + ": " + actionDescription,
                    admin,
                    department,
                    ticket.getId()
                );
            }
        }
        
        // Notify assigned SUPPORT (if different from modifier)
        if (ticket.getAssignedTo() != null && 
            ticket.getAssignedTo().getRole() == Role.SUPPORT &&
            !ticket.getAssignedTo().getId().equals(modifier.getId())) {
            notificationService.createNotification(
                NotificationType.TICKET_MODIFIED,
                "Ticket modifié",
                "Le ticket '" + ticket.getTitle() + "' a été modifié par " + modifier.getFirstName() + " " + modifier.getLastName() + ": " + actionDescription,
                ticket.getAssignedTo(),
                department,
                ticket.getId()
            );
        }
    }
    
    /**
     * Send notification to the ticket reporter (creator) when SUPPORT modifies a ticket.
     */
    private void notifyReporterOnSupportModification(Ticket ticket, UserEntity modifier, String actionDescription) {
        // Don't notify if there's no reporter
        if (ticket.getCreatedBy() == null) {
            return;
        }
        
        // Don't notify if the modifier is the reporter themselves
        if (ticket.getCreatedBy().getId().equals(modifier.getId())) {
            return;
        }
        
        Department department = ticket.getProject() != null ? ticket.getProject().getDepartment() : null;
        
        notificationService.createNotification(
            NotificationType.TICKET_MODIFIED,
            "Votre ticket a été modifié",
            "Le ticket '" + ticket.getTitle() + "' a été modifié par le support: " + actionDescription,
            ticket.getCreatedBy(),
            department,
            ticket.getId()
        );
        
        log.info("Notification sent to reporter {} about ticket {} modification by SUPPORT {}", 
            ticket.getCreatedBy().getEmail(), ticket.getId(), modifier.getEmail());
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Page<TicketResponse>> getAllTickets(Pageable pageable, String search) {
        Page<Ticket> ticketPage;
        if (search != null && !search.isBlank()) {
            ticketPage = ticketRepository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(search, search, pageable);
        } else {
            ticketPage = ticketRepository.findAll(pageable);
        }
        List<TicketResponse> ticketResponses = new ArrayList<>();
        for (Ticket ticket : ticketPage.getContent()) {
            ticketResponses.add(getTicketResponse(ticket));
        }
        return ResponseEntity.ok(new PageImpl<>(ticketResponses, pageable, ticketPage.getTotalElements()));
    }

    @Transactional(readOnly = true)
    public ResponseEntity<TicketResponse> getTicketById(Long id) {
        Optional<Ticket> optionalTicket = ticketRepository.findById(id);
        if (optionalTicket.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        Ticket ticket = optionalTicket.get();
        return ResponseEntity.ok(getTicketResponse(ticket));
    }

    @Transactional
    public ResponseEntity<TicketResponse> addTicket(TicketRequest ticketRequest) {
        log.info("Creating ticket. Request: project={}, title={}, reporter={}, assignee={}", 
            ticketRequest.getProject(), ticketRequest.getTitle(), ticketRequest.getReporter(), ticketRequest.getAssignee());
        
        try {
            // Validate required fields
            if (ticketRequest.getTitle() == null || ticketRequest.getTitle().trim().isEmpty()) {
                log.error("Ticket creation failed - Title is required");
                return ResponseEntity.badRequest().build();
            }
            
            // Validate project exists (optional for chatbot-generated tickets)
            Project project = null;
            if (ticketRequest.getProject() != null) {
                var projectOpt = projectRepository.findById(ticketRequest.getProject());
                if (projectOpt.isEmpty()) {
                    log.error("Ticket creation failed - Project not found: {}", ticketRequest.getProject());
                    return ResponseEntity.badRequest().build();
                }
                project = projectOpt.get();
                log.info("Found project: {}", project.getName());
            } else {
                log.info("No project specified - ticket will need admin orientation");
            }
            
            // Handle reporter - use provided email or first user as fallback
            UserEntity userEntity;
            if (ticketRequest.getReporter() != null && !ticketRequest.getReporter().trim().isEmpty()) {
                var userOpt = userRepository.findByEmail(ticketRequest.getReporter());
                if (userOpt.isEmpty()) {
                    log.error("Ticket creation failed - Reporter not found: {}", ticketRequest.getReporter());
                    return ResponseEntity.badRequest().build();
                }
                userEntity = userOpt.get();
            } else {
                // Fallback to first user
                var users = userRepository.findAll();
                if (users.isEmpty()) {
                    log.error("Ticket creation failed - No users found in database");
                    return ResponseEntity.badRequest().build();
                }
                userEntity = users.get(0);
                log.warn("No reporter specified, using first user: {}", userEntity.getEmail());
            }
            log.info("Using reporter: {}", userEntity.getEmail());
            
            // Handle assignee - optional
            UserEntity assignee = null;
            if (ticketRequest.getAssignee() != null && !ticketRequest.getAssignee().trim().isEmpty()) {
                var assigneeOpt = userRepository.findByEmail(ticketRequest.getAssignee());
                if (assigneeOpt.isPresent()) {
                    assignee = assigneeOpt.get();
                } else {
                    log.warn("Assignee not found: {}, skipping", ticketRequest.getAssignee());
                }
            }
            
            // Default values
            Status defaultStatus = ticketRequest.getStatus() != null ? ticketRequest.getStatus() : Status.Nouveau;
            Priority defaultPriority = ticketRequest.getPriority() != null ? ticketRequest.getPriority() : Priority.Medium;
            String defaultCategory = ticketRequest.getCategory() != null ? ticketRequest.getCategory() : "Autre";
            Department routedDepartment = project != null ? project.getDepartment() : null;
            String routingReason = project != null ? "Projet sélectionné par l'utilisateur." : "Ticket généré par chatbot - en attente d'orientation par l'admin.";
            
            // Classification auto - si category non spécifiée
            ClassificationResponse classification = null;
            if (defaultCategory.equals("Autre") || defaultCategory.isEmpty()) {
                try {
                    classification = classificationService.classifyTicket(
                        ticketRequest.getTitle(),
                        ticketRequest.getDescription() != null ? ticketRequest.getDescription() : ""
                    );
                    if (classification != null && classification.getCategory() != null) {
                        defaultCategory = classification.getCategory();
                        if (classification.getSuggestedPriority() != null) {
                            defaultPriority = Priority.valueOf(classification.getSuggestedPriority().toUpperCase());
                        }
                        
                        // Auto-routing: trouver le projet dans le department recommandé
                        if (classification.getSuggestedDepartment() != null) {
                            var suggestedDept = routingService.findDepartmentByClassification(defaultCategory);
                            if (suggestedDept.isPresent()) {
                                Department dept = suggestedDept.get();
                                routedDepartment = dept;
                                routingReason = "Routage IA selon catégorie '" + defaultCategory + "' vers " + dept.getName() + ".";
                            }
                        }
                        
                        // Suggestion automatique de projet basée sur la catégorie
                        // (pour les tickets chatbot créés sans projet)
                        if (project == null) {
                            var suggestedProject = routingService.findSuggestedProjectByCategory(defaultCategory);
                            if (suggestedProject.isPresent()) {
                                project = suggestedProject.get();
                                log.info("Auto-suggestion: ticket routed to project '{}' (id={}) based on category '{}'", 
                                    project.getName(), project.getId(), defaultCategory);
                                routingReason = "Projet suggéré automatiquement selon la catégorie '" + defaultCategory + "'.";
                                // Update routedDepartment to match the project's department
                                if (project.getDepartment() != null) {
                                    routedDepartment = project.getDepartment();
                                }
                            }
                        }
                        
                        log.info("Classification auto: category={}, priority={}, department={}", 
                            defaultCategory, defaultPriority, classification.getSuggestedDepartment());
                    }
                } catch (Exception e) {
                    log.warn("Classification service unavailable: {}", e.getMessage());
                }
            }
            
            // If still no project after classification, try suggestion by final category
            if (project == null) {
                var suggestedProject = routingService.findSuggestedProjectByCategory(defaultCategory);
                if (suggestedProject.isPresent()) {
                    project = suggestedProject.get();
                    log.info("Auto-suggestion (post-classification): ticket routed to project '{}' (id={})", 
                        project.getName(), project.getId());
                    routingReason = "Projet suggéré automatiquement selon la catégorie '" + defaultCategory + "'.";
                    if (routedDepartment == null && project.getDepartment() != null) {
                        routedDepartment = project.getDepartment();
                    }
                }
            }
            
            if (routedDepartment == null) {
                routedDepartment = routingService.findDepartmentByClassification(defaultCategory)
                    .orElse(project != null ? project.getDepartment() : null);
                if (routingReason == null || routingReason.isBlank()) {
                    routingReason = "Routage métier basé sur la catégorie " + defaultCategory + ".";
                }
            }

            if (assignee == null) {
                assignee = selectAssigneeForDepartment(routedDepartment);
                if (assignee != null) {
                    log.info("Auto-assigned by workload to support: {}", assignee.getEmail());
                }
            }

            // Duplicate detection - safe
            PythonResponse pythonResponse = null;
            try {
                DuplicateTicketRequest dupReq = DuplicateTicketRequest.builder()
                    .ticketId(2000L)
                    .title(ticketRequest.getTitle())
                    .description(ticketRequest.getDescription())
                    .projectId(ticketRequest.getProject())
                    .build();
                pythonResponse = duplicateTicketService.processTicketEmbedding(dupReq);
            } catch (Exception e) {
                log.warn("Duplicate service unavailable: {}", e.getMessage());
            }
            
            List<Long> ids = new ArrayList<>();
            List<Ticket> similarTicketList = new ArrayList<>();
            if (pythonResponse != null && pythonResponse.getSimilar_ticket_ids() != null) {
                ids = pythonResponse.getSimilar_ticket_ids();
                for (Long id : ids) {
                    Optional<Ticket> ticketOptional = ticketRepository.findById(id);
                    ticketOptional.ifPresent(similarTicketList::add);
                }
            }
            
            if (!ids.isEmpty()) {
                log.warn("Ticket creation rejected. Similar tickets found in system: {}", ids);
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            
            // Resolve category entity
            Category categoryEntity = null;
            if (ticketRequest.getCategoryId() != null) {
                categoryEntity = categoryRepository.findById(ticketRequest.getCategoryId()).orElse(null);
            } else if (defaultCategory != null && !defaultCategory.isEmpty()) {
                categoryEntity = categoryRepository.findByName(defaultCategory).orElse(null);
            }
            
            // Create and save ticket
            Ticket ticket = Ticket.builder()
                .title(ticketRequest.getTitle())
                .description(ticketRequest.getDescription())
                .status(defaultStatus)
                .priority(defaultPriority)
                .category(defaultCategory)
                .categoryEntity(categoryEntity)
                .issueType(ticketRequest.getIssueType())
                .routedDepartmentName(routedDepartment != null ? routedDepartment.getName() : null)
                .routingReason(routingReason)
                .workflowStage(determineWorkflowStage(defaultStatus))
                .firstResponseDueAt(calculateFirstResponseDueAt(defaultPriority))
                .resolutionDueAt(calculateResolutionDueAt(defaultPriority))
                .createdBy(userEntity)
                .assignedTo(assignee)
                .project(project)
                .build();
            
            
            try {
                Ticket newTicket = ticketRepository.save(ticket);
                log.info("Ticket created successfully with ID: {}", newTicket.getId());
                TicketResponse ticketResponse = getTicketResponse(newTicket, similarTicketList);
                
                // Vector storage - safe
                if (pythonResponse != null && pythonResponse.getVector() != null) {
                    addVectorTable(pythonResponse.getVector(), newTicket.getId(), ticketRequest.getProject());
                }
                
                // Notifications - safe
                try {
                    if (project != null && project.getDepartment() != null) {
                        notificationService.notifyDepartmentUsers(
                            NotificationType.TICKET_CREATED,
                            "Nouveau ticket créé",
                            "Le ticket '" + newTicket.getTitle() + "' a été créé dans le projet " + project.getName(),
                            project.getDepartment(),
                            newTicket.getId()
                        );
                    }
                    
                    if (assignee != null && !assignee.getId().equals(userEntity.getId())) {
                        notificationService.createNotification(
                            NotificationType.TICKET_ASSIGNED,
                            "Ticket vous a été assigné",
                            "Le ticket '" + newTicket.getTitle() + "' vous a été assigné",
                            assignee,
                            project != null ? project.getDepartment() : null,
                            newTicket.getId()
                        );
                    }
                 } catch (Exception e) {
                     log.error("Error sending notifications for ticket {}: {}", newTicket.getId(), e.getMessage());
                 }
                 
                 // Send email notifications - safe
                 try {
                     // Email to reporter (ticket creator)
                     if (userEntity != null) {
                         emailService.sendTicketCreatedNotification(newTicket, userEntity);
                     }
                     
                     // Email to assignee if different from reporter
                     if (assignee != null && !assignee.getId().equals(userEntity != null ? userEntity.getId() : null)) {
                         emailService.sendTicketAssignedNotification(newTicket, assignee);
                     }
                 } catch (Exception e) {
                     log.error("Error sending email notifications for ticket {}: {}", newTicket.getId(), e.getMessage());
                 }
                 
                 return new ResponseEntity<>(ticketResponse, HttpStatus.CREATED);
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                log.error("Database constraint violation creating ticket: project={}, reporter={}. Error: {}", 
                    ticketRequest.getProject(), ticketRequest.getReporter(), e.getMessage());
                return ResponseEntity.badRequest().build();
            } catch (Exception e) {
                log.error("Unexpected error saving ticket: {}", e.getMessage(), e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }
        } catch (Exception e) {
            log.error("Unexpected error creating ticket: project={}, reporter={}, error={}", 
                ticketRequest.getProject(), ticketRequest.getReporter(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body((TicketResponse) null);
        }
    }

    public void addVectorTable(String vector, Long ticketId, Long projectId) {
        vectorTableRepository
                .save(VectorTable.builder().vector(vector).ticketId(ticketId).projectId(projectId).build());
    }

    public ResponseEntity<TicketResponse> updateTicket(TicketRequest ticketRequest, Long id) {
        Optional<Ticket> optionalTicket = ticketRepository.findById(id);
        return optionalTicket.map(ticket -> {
            if (ticketRequest.getTitle() != null) {
                ticket.setTitle(ticketRequest.getTitle());
            }
            if (ticketRequest.getDescription() != null) {
                ticket.setDescription(ticketRequest.getDescription());
            }
            if (ticketRequest.getStatus() != null) {
                ticket.setStatus(ticketRequest.getStatus());
            }
            if (ticketRequest.getPriority() != null) {
                ticket.setPriority(ticketRequest.getPriority());
            }
            if (ticketRequest.getCategory() != null) {
                ticket.setCategory(ticketRequest.getCategory());
            }
            if (ticketRequest.getIssueType() != null) {
                ticket.setIssueType(ticketRequest.getIssueType());
            }
            ticketRepository.save(ticket);
            return ResponseEntity.ok(getTicketResponse(ticket));
        }).orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    public ResponseEntity<TicketResponse> updateTicketPartial(Long id, TicketUpdateRequest updateRequest) {
        Optional<Ticket> optionalTicket = ticketRepository.findById(id);
        return optionalTicket.map(ticket -> {
            Status oldStatus = ticket.getStatus();
            UserEntity oldAssignee = ticket.getAssignedTo();
            
            if (updateRequest.getTitle() != null && !updateRequest.getTitle().isEmpty()) {
                ticket.setTitle(updateRequest.getTitle());
            }
            if (updateRequest.getDescription() != null) {
                ticket.setDescription(updateRequest.getDescription());
            }
            if (updateRequest.getStatus() != null) {
                ticket.setStatus(updateRequest.getStatus());
            }
            if (updateRequest.getPriority() != null) {
                ticket.setPriority(updateRequest.getPriority());
            }
            if (updateRequest.getCategory() != null) {
                ticket.setCategory(updateRequest.getCategory());
            }
            if (updateRequest.getIssueType() != null) {
                ticket.setIssueType(updateRequest.getIssueType());
            }
            if (updateRequest.getAssignee() != null && !updateRequest.getAssignee().isEmpty()) {
                Optional<UserEntity> user = userRepository.findByEmail(updateRequest.getAssignee());
                user.ifPresent(ticket::setAssignedTo);
            } else if (updateRequest.getAssignee() != null && updateRequest.getAssignee().isEmpty()) {
                ticket.setAssignedTo(null);
            }
            if (updateRequest.getStatus() != null) {
                ticket.setWorkflowStage(determineWorkflowStage(updateRequest.getStatus()));
            }
            if (updateRequest.getPriority() != null) {
                ticket.setFirstResponseDueAt(calculateFirstResponseDueAt(updateRequest.getPriority()));
                ticket.setResolutionDueAt(calculateResolutionDueAt(updateRequest.getPriority()));
            }
            if (ticket.getAssignedTo() != null && ticket.getRoutedDepartmentName() == null && ticket.getAssignedTo().getDepartment() != null) {
                ticket.setRoutedDepartmentName(ticket.getAssignedTo().getDepartment().getName());
            }
            
            // Handle project assignment (admin orientation of chatbot tickets)
            // If projectId is provided in the request (even if null), we update the project accordingly.
            // We assume that the frontend always sends the projectId field in the PATCH request for project changes.
            if (updateRequest.getProjectId() != null) {
                // projectId is provided and not null
                if (updateRequest.getProjectId() == 0) {
                    // Remove project
                    ticket.setProject(null);
                    ticket.setRoutedDepartmentName(null);
                    ticket.setRoutingReason("Projet retiré par l'admin");
                    log.info("Project removed from ticket {} by admin", id);
                } else {
                    var projectOpt = projectRepository.findById(updateRequest.getProjectId());
                    if (projectOpt.isPresent()) {
                        Project newProject = projectOpt.get();
                        ticket.setProject(newProject);
                        ticket.setRoutedDepartmentName(newProject.getDepartment() != null ? newProject.getDepartment().getName() : null);
                        ticket.setRoutingReason("Projet assigné par l'admin: " + newProject.getName());
                        log.info("Ticket {} assigned to project '{}' by admin", id, newProject.getName());
                    } else {
                        log.warn("Cannot assign project to ticket {}: project {} not found", id, updateRequest.getProjectId());
                    }
                }
            } else {
                // projectId is null (explicitly set to null) -> remove project
                ticket.setProject(null);
                ticket.setRoutedDepartmentName(null);
                ticket.setRoutingReason("Projet retiré par l'admin");
                log.info("Project removed from ticket {} by admin (null projectId)", id);
            }
            
            ticketRepository.save(ticket);
            
            // Notify about status change
            if (updateRequest.getStatus() != null && !updateRequest.getStatus().equals(oldStatus)) {
                if (ticket.getCreatedBy() != null) {
                    notificationService.createNotification(
                        NotificationType.TICKET_STATUS_CHANGED,
                        "Statut du ticket modifié",
                        "Le ticket '" + ticket.getTitle() + "' a été déplacé vers " + updateRequest.getStatus(),
                        ticket.getCreatedBy(),
                        ticket.getProject() != null ? ticket.getProject().getDepartment() : null,
                        ticket.getId()
                    );
                }
            }
            
             // Notify about assignment
             if (ticket.getAssignedTo() != null && !ticket.getAssignedTo().equals(oldAssignee)) {
                 notificationService.createNotification(
                     NotificationType.TICKET_ASSIGNED,
                     "Ticket vous a été assigné",
                     "Le ticket '" + ticket.getTitle() + "' vous a été assigné",
                     ticket.getAssignedTo(),
                     ticket.getProject() != null ? ticket.getProject().getDepartment() : null,
                     ticket.getId()
                 );
                 
                 // Also send email notification
                 try {
                     emailService.sendTicketAssignedNotification(ticket, ticket.getAssignedTo());
                 } catch (Exception e) {
                     log.error("Error sending assignment email for ticket {}: {}", ticket.getId(), e.getMessage());
                 }
             }
            
            // If modifier is SUPPORT, notify admins and assigned support AND the reporter
            if (updateRequest.getModifierEmail() != null && "SUPPORT".equals(updateRequest.getModifierRole())) {
                UserEntity modifier = userRepository.findByEmail(updateRequest.getModifierEmail()).orElse(null);
                if (modifier != null && modifier.getRole() == Role.SUPPORT) {
                    // Build action description
                    StringBuilder actionDescription = new StringBuilder();
                    if (updateRequest.getStatus() != null && !updateRequest.getStatus().equals(oldStatus)) {
                        actionDescription.append("Statut changé: ").append(updateRequest.getStatus());
                    }
                    if (updateRequest.getPriority() != null) {
                        if (actionDescription.length() > 0) actionDescription.append(", ");
                        actionDescription.append("Priorité: ").append(updateRequest.getPriority());
                    }
                    if (updateRequest.getDescription() != null) {
                        if (actionDescription.length() > 0) actionDescription.append(", ");
                        actionDescription.append("Description modifiée");
                    }
                    if (actionDescription.length() == 0) {
                        actionDescription.append("Modifications générales");
                    }
                    
                    // Notify admins and assigned support
                    notifyAdminsAndAssignedSupport(ticket, modifier, actionDescription.toString());
                    
                    // Notify the reporter (ticket creator) about the modification
                    notifyReporterOnSupportModification(ticket, modifier, actionDescription.toString());
                }
            }
            
            // If modifier is the REPORTER (createdBy), notify assigned user
            if (updateRequest.getModifierEmail() != null && ticket.getCreatedBy() != null) {
                String reporterEmail = ticket.getCreatedBy().getEmail();
                if (reporterEmail != null && reporterEmail.equals(updateRequest.getModifierEmail())) {
                    // Build action description
                    StringBuilder actionDescription = new StringBuilder();
                    if (updateRequest.getStatus() != null && !updateRequest.getStatus().equals(oldStatus)) {
                        actionDescription.append("Statut changé: ").append(updateRequest.getStatus());
                    }
                    if (updateRequest.getPriority() != null) {
                        if (actionDescription.length() > 0) actionDescription.append(", ");
                        actionDescription.append("Priorité: ").append(updateRequest.getPriority());
                    }
                    if (updateRequest.getDescription() != null) {
                        if (actionDescription.length() > 0) actionDescription.append(", ");
                        actionDescription.append("Description modifiée");
                    }
                    if (updateRequest.getTitle() != null && !updateRequest.getTitle().isEmpty()) {
                        if (actionDescription.length() > 0) actionDescription.append(", ");
                        actionDescription.append("Titre modifié");
                    }
                    if (actionDescription.length() == 0) {
                        actionDescription.append("Modifications générales");
                    }
                    
                    notifyAssignedOnReporterModification(ticket, ticket.getCreatedBy(), actionDescription.toString());
                }
            }
            
            return ResponseEntity.ok(getTicketResponse(ticket));
        }).orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @Transactional
    public void deleteTicket(Long id) {
        Optional<Ticket> ticketOpt = ticketRepository.findById(id);
        if (ticketOpt.isEmpty()) {
            return;
        }

        List<Long> commentIds = commentRepository.findByTicket_Id(id).stream()
            .map(Comment::getId)
            .collect(Collectors.toList());

        if (!commentIds.isEmpty()) {
            List<CommentScreenshot> commentScreenshots = commentScreenshotRepository.findByCommentIdIn(commentIds);
            for (CommentScreenshot cs : commentScreenshots) {
                deleteFile(cs.getImageUrl());
            }
            commentScreenshotRepository.deleteByCommentIdIn(commentIds);
        }

        List<Screenshot> screenshots = screenshotRepository.findByTicketId(id);
        for (Screenshot screenshot : screenshots) {
            deleteFile(screenshot.getImageUrl());
        }
        screenshotRepository.deleteByTicketId(id);

        commentRepository.deleteByTicketId(id);
        vectorTableRepository.deleteByTicketId(id);

        ticketRepository.deleteByIdNative(id);
        log.info("Ticket {} permanently deleted (children removed explicitly)", id);
    }

    private void deleteFile(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith("/api/screenshots/")) {
            return;
        }
        try {
            String fileName = imageUrl.substring("/api/screenshots/".length());
            Path filePath = Paths.get("uploads/screenshots").resolve(fileName);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("Deleted file: {}", fileName);
            }
        } catch (IOException e) {
            log.error("Error deleting file {}: {}", imageUrl, e.getMessage());
        }
    }

    public void assignTicket(Long ticketId, AssignRequest assignRequest) {
        Optional<Ticket> optionalTicket = ticketRepository.findById(ticketId);
        if (optionalTicket.isEmpty()) {
            return;
        }
        Ticket ticket = optionalTicket.get();
        UserEntity oldAssignee = ticket.getAssignedTo();
        
        if (assignRequest.getEmail().isEmpty()) {
            ticket.setAssignedTo(null);
            ticketRepository.save(ticket);
            return;
        }
        Optional<UserEntity> user = userRepository.findByEmail(assignRequest.getEmail());
        if (user.isEmpty()) {
            return;
        }
        
        UserEntity newAssignee = user.get();
        ticket.setAssignedTo(newAssignee);
        ticketRepository.save(ticket);
        
        // Send email notification to new assignee
        try {
            emailService.sendTicketAssignedNotification(ticket, newAssignee);
        } catch (Exception e) {
            log.error("Error sending assignment email for ticket {}: {}", ticketId, e.getMessage());
        }
        
        // Send notification through in-app system too
        if (ticket.getProject() != null && ticket.getProject().getDepartment() != null) {
            notificationService.createNotification(
                NotificationType.TICKET_ASSIGNED,
                "Ticket vous a été assigné",
                "Le ticket '" + ticket.getTitle() + "' vous a été assigné",
                newAssignee,
                ticket.getProject().getDepartment(),
                ticket.getId()
            );
        }
    }

    private TicketResponse getTicketResponse(Ticket ticket, List<Ticket> ticketList) {
        List<SimilarTickets> similarTicketList = new ArrayList<>();
        if (ticketList != null) {
            for (Ticket ticket1 : ticketList) {
                similarTicketList.add(SimilarTickets.builder()
                        .id(ticket1.getId())
                        .title(ticket1.getTitle()).build());
            }
        }
        
        CreatedByDto assignedTo = null;
        if (ticket.getAssignedTo() != null) {
            assignedTo = CreatedByDto.builder()
                    .firstName(ticket.getAssignedTo().getFirstName())
                    .lastName(ticket.getAssignedTo().getLastName())
                    .email(ticket.getAssignedTo().getEmail())
                    .build();
        }
        
        List<CommentDto> commentDtos = null;
        if (ticket.getComments() != null) {
            commentDtos = commentService.commentList(ticket.getComments());
        }
        
        // Attachments removed
        
        // Handle null createdBy (or use project as fallback)
        CreatedByDto createdBy = null;
        if (ticket.getCreatedBy() != null) {
            createdBy = CreatedByDto.builder()
                    .firstName(ticket.getCreatedBy().getFirstName())
                    .lastName(ticket.getCreatedBy().getLastName())
                    .email(ticket.getCreatedBy().getEmail())
                    .build();
        } else if (ticket.getProject() != null) {
            // Fallback: use project info if no creator
            createdBy = CreatedByDto.builder()
                    .firstName("Unknown")
                    .lastName("")
                    .email("")
                    .build();
        }
        
        return TicketResponse.builder()
                .id(ticket.getId())
                .title(ticket.getTitle())
                .description(ticket.getDescription())
                .status(ticket.getStatus())
                .priority(ticket.getPriority())
                .issueType(ticket.getIssueType())
                .category(ticket.getCategory())
                .categoryId(ticket.getCategoryEntity() != null ? ticket.getCategoryEntity().getId() : null)
                .routedDepartmentName(ticket.getRoutedDepartmentName())
                .routingReason(ticket.getRoutingReason())
                .workflowStage(ticket.getWorkflowStage())
                .firstResponseDueAt(ticket.getFirstResponseDueAt())
                .resolutionDueAt(ticket.getResolutionDueAt())
                .createdAt(ticket.getCreatedAt())
                .modifiedAt(ticket.getModifiedAt())
                .comments(commentDtos)
                .created(createdBy)
                .assigned(assignedTo)
                .project(new ProjectDto(ticket.getProject()))
                .similarTickets(similarTicketList)
                .build();
    }

    private TicketResponse getTicketResponse(Ticket ticket) {
        return getTicketResponse(ticket, null);
    }

    private UserEntity selectAssigneeForDepartment(Department department) {
        if (department == null) {
            return null;
        }

        return userRepository.findByDepartmentAndRole(department, Role.SUPPORT).stream()
                .min(Comparator.comparingInt(this::countOpenAssignments))
                .orElse(null);
    }

    private int countOpenAssignments(UserEntity user) {
        if (user.getAssignedTickets() == null) {
            return 0;
        }
        return (int) user.getAssignedTickets().stream()
                .filter(ticket -> ticket.getStatus() != Status.Terminé)
                .count();
    }

     private String determineWorkflowStage(Status status) {
         if (status == null) {
             return "TRIAGE";
         }
         return switch (status) {
             case Nouveau -> "TRIAGE";
             case EnCours -> "IN_PROGRESS";
             case EnAttente -> "WAITING_FOR_USER";
             case Terminé -> "CLOSED";
         };
     }

    private LocalDateTime calculateFirstResponseDueAt(Priority priority) {
        LocalDateTime now = LocalDateTime.now();
        if (priority == null) {
            return now.plusHours(8);
        }
        return switch (priority) {
            case Critical -> now.plusHours(1);
            case High -> now.plusHours(4);
            case Medium -> now.plusHours(8);
            case Low -> now.plusHours(24);
        };
    }

    private LocalDateTime calculateResolutionDueAt(Priority priority) {
        LocalDateTime now = LocalDateTime.now();
        if (priority == null) {
            return now.plusDays(3);
        }
        return switch (priority) {
            case Critical -> now.plusHours(8);
            case High -> now.plusDays(1);
            case Medium -> now.plusDays(3);
            case Low -> now.plusDays(5);
        };
    }
    
    // mapAttachmentToDto removed - attachments functionality removed

    @Transactional
    public ResponseEntity<Page<TicketResponse>> getAllTicketByProjectId(Long pid, Pageable pageable, String search) {
        List<TicketResponse> ticketResponses;
        long totalElements;
        
        if (search != null && !search.isBlank()) {
            // Use search method from repository
            Page<Ticket> searchPage = ticketRepository.findByProjectIdAndTitleContainingIgnoreCase(pid, search, pageable);
            ticketResponses = new ArrayList<>();
            for (Ticket ticket : searchPage.getContent()) {
                ticketResponses.add(getTicketResponse(ticket));
            }
            return ResponseEntity.ok(new PageImpl<>(ticketResponses, pageable, searchPage.getTotalElements()));
        } else {
            List<Ticket> tickets = ticketRepository.findAllByProjectId(pid);
            totalElements = tickets.size();
            
            // Apply pagination manually since we're working with a list
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), tickets.size());
            List<Ticket> paginatedTickets;
            if (start >= tickets.size()) {
                paginatedTickets = new ArrayList<>();
            } else {
                paginatedTickets = tickets.subList(start, end);
            }
            
            ticketResponses = new ArrayList<>();
            for (Ticket ticket : paginatedTickets) {
                ticketResponses.add(getTicketResponse(ticket));
            }
        }
        return ResponseEntity.ok(new PageImpl<>(ticketResponses, pageable, totalElements));
    }

    @Transactional
    public ResponseEntity<Page<TicketResponse>> getAllTicketByProjectIdForUser(Long pid, String userEmail, String userRole, Long userDepartmentId, Pageable pageable, String search) {
        List<Ticket> tickets;
        
        if ("ADMIN".equals(userRole)) {
            // Admin sees all tickets in the project
            // If admin has no department, they see all tickets in the project regardless of department
            tickets = ticketRepository.findAllByProjectId(pid);
            // Only filter by department if the admin has a department assigned
            if (userDepartmentId != null) {
                tickets = tickets.stream()
                    .filter(t -> t.getProject() != null && 
                                 t.getProject().getDepartment() != null && 
                                 t.getProject().getDepartment().getId().equals(userDepartmentId))
                    .collect(Collectors.toList());
            }
        } else if ("SUPPORT".equals(userRole)) {
            // Support sees only tickets assigned to them or created by them within the project
            tickets = ticketRepository.findAllByProjectId(pid);
            List<Ticket> filteredTickets = new ArrayList<>();
            for (Ticket ticket : tickets) {
                // Check if ticket is assigned to user or created by user
                boolean isAssignedToUser = ticket.getAssignedTo() != null && ticket.getAssignedTo().getEmail().equals(userEmail);
                boolean isCreatedByUser = ticket.getCreatedBy() != null && ticket.getCreatedBy().getEmail().equals(userEmail);
                
                if (isAssignedToUser || isCreatedByUser) {
                    filteredTickets.add(ticket);
                }
            }
            tickets = filteredTickets;
        } else {
            // Regular user sees only their own tickets (created or assigned) within the project
            tickets = ticketRepository.findAllByProjectId(pid);
            List<Ticket> filteredTickets = new ArrayList<>();
            for (Ticket ticket : tickets) {
                boolean isAssignedToUser = ticket.getAssignedTo() != null && ticket.getAssignedTo().getEmail().equals(userEmail);
                boolean isCreatedByUser = ticket.getCreatedBy() != null && ticket.getCreatedBy().getEmail().equals(userEmail);
                
                if (isAssignedToUser || isCreatedByUser) {
                    filteredTickets.add(ticket);
                }
            }
            tickets = filteredTickets;
        }
        
        // Filter by search term if provided
        if (search != null && !search.isBlank()) {
            final String searchLower = search.toLowerCase();
            tickets = tickets.stream()
                .filter(t -> (t.getTitle() != null && t.getTitle().toLowerCase().contains(searchLower)) ||
                             (t.getDescription() != null && t.getDescription().toLowerCase().contains(searchLower)))
                .collect(Collectors.toList());
        }
        
        // Apply pagination manually since we're working with a list
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), tickets.size());
        List<Ticket> paginatedTickets;
        if (start >= tickets.size()) {
            paginatedTickets = new ArrayList<>();
        } else {
            paginatedTickets = tickets.subList(start, end);
        }
        
        List<TicketResponse> ticketResponses = new ArrayList<>();
        for (Ticket ticket : paginatedTickets) {
            ticketResponses.add(getTicketResponse(ticket));
        }
        return ResponseEntity.ok(new PageImpl<>(ticketResponses, pageable, tickets.size()));
    }

    public ResponseEntity<TicketResponse> getTicketByProjectId(Long pid, Long tid) {
        Optional<Ticket> optionalTicket = ticketRepository.findByProjectIdAndId(pid, tid);
        if (optionalTicket.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        Ticket ticket = optionalTicket.get();
        return ResponseEntity.ok(getTicketResponse(ticket));
    }

    // Get all tickets for a specific user (created by or assigned to)
    public ResponseEntity<Page<TicketResponse>> getTicketsByUserEmail(String email, Pageable pageable, String search) {
        List<Ticket> tickets = ticketRepository.findByCreatedByEmailOrAssignedToEmail(email, email);
        
        // Filter by search term if provided
        if (search != null && !search.isBlank()) {
            final String searchLower = search.toLowerCase();
            tickets = tickets.stream()
                .filter(t -> (t.getTitle() != null && t.getTitle().toLowerCase().contains(searchLower)) ||
                             (t.getDescription() != null && t.getDescription().toLowerCase().contains(searchLower)))
                .collect(Collectors.toList());
        }
        
        // Apply pagination manually since we're working with a list
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), tickets.size());
        List<Ticket> paginatedTickets;
        if (start >= tickets.size()) {
            paginatedTickets = new ArrayList<>();
        } else {
            paginatedTickets = tickets.subList(start, end);
        }
        
        List<TicketResponse> ticketResponses = new ArrayList<>();
        for (Ticket ticket : paginatedTickets) {
            ticketResponses.add(getTicketResponse(ticket));
        }
        return ResponseEntity.ok(new PageImpl<>(ticketResponses, pageable, tickets.size()));
    }

    // Get tickets based on user role and department (for role-based visibility)
    public ResponseEntity<Page<TicketResponse>> getTicketsForUser(String email, String role, Long departmentId, Pageable pageable, String search) {
        List<Ticket> tickets;
        
        if ("ADMIN".equals(role)) {
            if (departmentId == null) {
                // Admin without department sees ALL tickets
                tickets = ticketRepository.findAll();
            } else {
                // Admin with department sees tickets from their department only
                tickets = ticketRepository.findByProjectDepartmentId(departmentId);
            }
        } else if ("SUPPORT".equals(role) && departmentId != null) {
            // Support sees tickets from their department
            // Get all users in the department
            List<UserEntity> departmentUsers = userRepository.findAll().stream()
                .filter(u -> u.getDepartment() != null && u.getDepartment().getId().equals(departmentId))
                .collect(Collectors.toList());
            
            // Get all project IDs for the department
            List<Long> projectIds = projectRepository.findAll().stream()
                .filter(p -> p.getDepartment() != null && p.getDepartment().getId().equals(departmentId))
                .map(Project::getId)
                .collect(Collectors.toList());
            
            // Get tickets from these projects
            List<Ticket> projectTickets = new ArrayList<>();
            for (Long projectId : projectIds) {
                projectTickets.addAll(ticketRepository.findAllByProjectId(projectId));
            }
            
            // Get tickets created by or assigned to users in this department
            List<Ticket> userTickets = new ArrayList<>();
            for (UserEntity user : departmentUsers) {
                userTickets.addAll(ticketRepository.findByCreatedByEmailOrAssignedToEmail(user.getEmail(), user.getEmail()));
            }
            
            // Combine and deduplicate
            tickets = new ArrayList<>();
            tickets.addAll(projectTickets);
            for (Ticket t : userTickets) {
                if (!tickets.contains(t)) {
                    tickets.add(t);
                }
            }
        } else {
            // Regular user sees only their own tickets (created or assigned)
            tickets = ticketRepository.findByCreatedByEmailOrAssignedToEmail(email, email);
        }
        
        // Filter by search term if provided
        if (search != null && !search.isBlank()) {
            final String searchLower = search.toLowerCase();
            tickets = tickets.stream()
                .filter(t -> (t.getTitle() != null && t.getTitle().toLowerCase().contains(searchLower)) ||
                             (t.getDescription() != null && t.getDescription().toLowerCase().contains(searchLower)))
                .collect(Collectors.toList());
        }
        
        // Apply pagination manually since we're working with a list
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), tickets.size());
        List<Ticket> paginatedTickets;
        if (start >= tickets.size()) {
            paginatedTickets = new ArrayList<>();
        } else {
            paginatedTickets = tickets.subList(start, end);
        }
        
        List<TicketResponse> ticketResponses = new ArrayList<>();
        for (Ticket ticket : paginatedTickets) {
            ticketResponses.add(getTicketResponse(ticket));
        }
        return ResponseEntity.ok(new PageImpl<>(ticketResponses, pageable, tickets.size()));
    }

    // ==================== ADVANCED SEARCH ====================

    public ResponseEntity<Page<TicketResponse>> searchTickets(
            Pageable pageable,
            String search,
            List<Status> statuses,
            List<Priority> priorities,
            LocalDateTime startDate,
            LocalDateTime endDate,
            Long departmentId,
            Long projectId,
            String category) {
        
        List<Ticket> tickets = ticketRepository.findAll();
        
        // Filter by search term
        if (search != null && !search.isBlank()) {
            final String searchLower = search.toLowerCase();
            tickets = tickets.stream()
                .filter(t -> (t.getTitle() != null && t.getTitle().toLowerCase().contains(searchLower)) ||
                             (t.getDescription() != null && t.getDescription().toLowerCase().contains(searchLower)))
                .collect(Collectors.toList());
        }
        
        // Filter by statuses
        if (statuses != null && !statuses.isEmpty()) {
            tickets = tickets.stream()
                .filter(t -> statuses.contains(t.getStatus()))
                .collect(Collectors.toList());
        }
        
        // Filter by priorities
        if (priorities != null && !priorities.isEmpty()) {
            tickets = tickets.stream()
                .filter(t -> priorities.contains(t.getPriority()))
                .collect(Collectors.toList());
        }
        
        // Filter by date range
        if (startDate != null && endDate != null) {
            tickets = tickets.stream()
                .filter(t -> !t.getCreatedAt().isBefore(startDate) && !t.getCreatedAt().isAfter(endDate))
                .collect(Collectors.toList());
        } else if (startDate != null) {
            tickets = tickets.stream()
                .filter(t -> !t.getCreatedAt().isBefore(startDate))
                .collect(Collectors.toList());
        } else if (endDate != null) {
            tickets = tickets.stream()
                .filter(t -> !t.getCreatedAt().isAfter(endDate))
                .collect(Collectors.toList());
        }
        
        // Filter by department
        if (departmentId != null) {
            tickets = tickets.stream()
                .filter(t -> t.getProject() != null && 
                             t.getProject().getDepartment() != null && 
                             t.getProject().getDepartment().getId().equals(departmentId))
                .collect(Collectors.toList());
        }
        
        // Filter by project
        if (projectId != null) {
            tickets = tickets.stream()
                .filter(t -> t.getProject() != null && t.getProject().getId().equals(projectId))
                .collect(Collectors.toList());
        }
        
        // Filter by category
        if (category != null && !category.isBlank()) {
            tickets = tickets.stream()
                .filter(t -> category.equalsIgnoreCase(t.getCategory()))
                .collect(Collectors.toList());
        }
        
        // Apply pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), tickets.size());
        List<Ticket> paginatedTickets;
        if (start >= tickets.size()) {
            paginatedTickets = new ArrayList<>();
        } else {
            paginatedTickets = tickets.subList(start, end);
        }
        
        List<TicketResponse> ticketResponses = new ArrayList<>();
        for (Ticket ticket : paginatedTickets) {
            ticketResponses.add(getTicketResponse(ticket));
        }
        return ResponseEntity.ok(new PageImpl<>(ticketResponses, pageable, tickets.size()));
    }

    // ==================== UNASSIGNED TICKETS (ADMIN ORIENTATION) ====================

    public ResponseEntity<List<TicketResponse>> getUnassignedTickets() {
        List<Ticket> tickets = ticketRepository.findByProjectIsNull();
        List<TicketResponse> responses = tickets.stream()
            .map(this::getTicketResponse)
            .collect(Collectors.toList());
        log.info("Found {} tickets without project assignment", responses.size());
        return ResponseEntity.ok(responses);
    }

    // ==================== BULK ACTIONS ====================

    @Transactional
    public void bulkDeleteTickets(List<Long> ticketIds) {
        if (ticketIds == null || ticketIds.isEmpty()) {
            return;
        }
        // Explicitly delete all child records for each ticket before deleting the tickets
        for (Long ticketId : ticketIds) {
            deleteTicket(ticketId);
        }
        log.info("Permanently deleted {} tickets via bulk delete", ticketIds.size());
    }

    @Transactional
    public void bulkAssignTickets(List<Long> ticketIds, String assigneeEmail) {
        if (ticketIds == null || ticketIds.isEmpty() || assigneeEmail == null || assigneeEmail.isBlank()) {
            return;
        }
        // Verify user exists
        if (userRepository.findByEmail(assigneeEmail).isEmpty()) {
            throw new IllegalArgumentException("User not found with email: " + assigneeEmail);
        }
        ticketRepository.assignByIdIn(ticketIds, assigneeEmail);
        log.info("Bulk assigned {} tickets to {}", ticketIds.size(), assigneeEmail);
    }

    // ==================== KANBAN VIEW ====================

    public ResponseEntity<?> getKanbanTickets(Long projectId, Long departmentId) {
        List<Ticket> tickets = ticketRepository.findAll();
        
        // Filter by project if specified
        if (projectId != null) {
            tickets = tickets.stream()
                .filter(t -> t.getProject() != null && t.getProject().getId().equals(projectId))
                .collect(Collectors.toList());
        }
        
        // Filter by department if specified
        if (departmentId != null) {
            tickets = tickets.stream()
                .filter(t -> t.getProject() != null && 
                             t.getProject().getDepartment() != null && 
                             t.getProject().getDepartment().getId().equals(departmentId))
                .collect(Collectors.toList());
        }
        
        
        // Group by status
        Map<Status, List<Ticket>> groupedTickets = tickets.stream()
            .collect(Collectors.groupingBy(Ticket::getStatus));
        
        // Create response with columns for each status
        Map<String, Object> response = new HashMap<>();
        for (Status status : Status.values()) {
            List<Ticket> statusTickets = groupedTickets.getOrDefault(status, new ArrayList<>());
            List<TicketResponse> ticketResponses = statusTickets.stream()
                .map(this::getTicketResponse)
                .collect(Collectors.toList());
            response.put(status.name(), ticketResponses);
        }
        
        return ResponseEntity.ok(response);
    }
}
