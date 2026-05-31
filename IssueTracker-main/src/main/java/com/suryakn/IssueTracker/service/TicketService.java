package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.dto.*;
import com.suryakn.IssueTracker.duplicate.DuplicateTicketRequest;
import com.suryakn.IssueTracker.duplicate.DuplicateTicketService;
import com.suryakn.IssueTracker.duplicate.PythonResponse;
import com.suryakn.IssueTracker.entity.*;
import com.suryakn.IssueTracker.repository.ProjectRepository;
import com.suryakn.IssueTracker.repository.TicketRepository;
import com.suryakn.IssueTracker.repository.UserRepository;
import com.suryakn.IssueTracker.repository.VectorTableRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final DuplicateTicketService duplicateTicketService;
    private final VectorTableRepository vectorTableRepository;
    private final CommentService commentService;
    private final NotificationService notificationService;
    
    @PersistenceContext
    private EntityManager entityManager;
    
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

    public ResponseEntity<List<TicketResponse>> getAllTickets() {
        List<Ticket> tickets = ticketRepository.findAll();
        List<TicketResponse> ticketResponses = new ArrayList<>();
        for (Ticket ticket : tickets) {
            ticketResponses.add(getTicketResponse(ticket));
        }
        return ResponseEntity.ok(ticketResponses);
    }

    public ResponseEntity<TicketResponse> getTicketById(Long id) {
        Optional<Ticket> optionalTicket = ticketRepository.findById(id);
        if (optionalTicket.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        Ticket ticket = optionalTicket.get();
        return ResponseEntity.ok(getTicketResponse(ticket));
    }

    public ResponseEntity<TicketResponse> addTicket(TicketRequest ticketRequest) {
        // Handle reporter - use provided email or find first user as default
        UserEntity userEntity;
        if (ticketRequest.getReporter() != null && !ticketRequest.getReporter().isEmpty()) {
            userEntity = userRepository.findByEmail(ticketRequest.getReporter()).orElse(null);
        } else {
            userEntity = userRepository.findAll().stream().findFirst().orElse(null);
        }
        
        if (userEntity == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }

        // Handle assignee - optional field
        UserEntity assignee = null;
        if (ticketRequest.getAssignee() != null && !ticketRequest.getAssignee().isEmpty()) {
            assignee = userRepository.findByEmail(ticketRequest.getAssignee()).orElse(null);
        }
        
        // Validate project exists (needed for both assignee logic and ticket creation)
        var project = projectRepository.findById(ticketRequest.getProject()).orElse(null);
        if (project == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }

        // Auto-assign to a manager in the department if no assignee provided
        if (assignee == null && project.getDepartment() != null) {
            List<UserEntity> managers = userRepository.findByDepartmentAndRole(
                project.getDepartment(), 
                Role.SUPPORT
            );
            if (!managers.isEmpty()) {
                assignee = managers.get(0); // Assign to first available manager
            }
        }

        List<Long> ids = new ArrayList<>();
        List<Ticket> similarTicketList = new ArrayList<>();
        PythonResponse pythonResponse = null;
        
        // Try to get duplicate detection results, but don't fail if service is unavailable
        try {
            DuplicateTicketRequest duplicateTicketRequest = DuplicateTicketRequest.builder()
                    .ticketId(2000L)
                    .title(ticketRequest.getTitle())
                    .description(ticketRequest.getDescription())
                    .projectId(ticketRequest.getProject())
                    .build();

            pythonResponse = duplicateTicketService.processTicketEmbedding(duplicateTicketRequest);
            
            if (pythonResponse != null && pythonResponse.getSimilar_ticket_ids() != null) {
                ids = pythonResponse.getSimilar_ticket_ids();
                for (Long id : ids) {
                    Optional<Ticket> ticketOptional = ticketRepository.findById(id);
                    ticketOptional.ifPresent(similarTicketList::add);
                }
            }
        } catch (Exception e) {
            log.warn("Duplicate detection service unavailable, continuing without duplicate check: {}", e.getMessage());
        }

        Ticket ticket = Ticket.builder()
                .title(ticketRequest.getTitle())
                .description(ticketRequest.getDescription())
                .status(ticketRequest.getStatus())
                .priority(ticketRequest.getPriority())
                .category(ticketRequest.getCategory())
                .createdBy(userEntity)
                .assignedTo(assignee)
                .project(project)
                .build();

        if (!ids.isEmpty()) {
            ticket.setTitle("(duplicate #" + Collections.min(ids) + ") " + ticket.getTitle());
            var duplicateTicket = ticketRepository.findById(Collections.min(ids)).orElse(null);
            if (duplicateTicket != null && duplicateTicket.getAssignedTo() != null) {
                var assigneeEmail = duplicateTicket.getAssignedTo().getEmail();
                var newAssignee = userRepository.findByEmail(assigneeEmail).orElse(null);
                if (newAssignee != null) {
                    ticket.setAssignedTo(newAssignee);
                }
            }
        }
        Ticket newTicket = ticketRepository.save(ticket);
        TicketResponse ticketResponse = getTicketResponse(newTicket, similarTicketList);
        
        if (pythonResponse != null && pythonResponse.getVector() != null) {
            addVectorTable(pythonResponse.getVector(), newTicket.getId(), ticketRequest.getProject());
        }
        
        // Notify department users about new ticket
        if (project.getDepartment() != null) {
            notificationService.notifyDepartmentUsers(
                NotificationType.TICKET_CREATED,
                "Nouveau ticket créé",
                "Le ticket '" + ticket.getTitle() + "' a été créé dans le projet " + project.getName(),
                project.getDepartment(),
                newTicket.getId()
            );
            log.info("Notifications sent for new ticket {} in department {}", newTicket.getId(), project.getDepartment().getName());
        }
        
        // Notify assignee if different from creator
        if (assignee != null && !assignee.getId().equals(userEntity.getId())) {
            notificationService.createNotification(
                NotificationType.TICKET_ASSIGNED,
                "Ticket vous a été assigné",
                "Le ticket '" + ticket.getTitle() + "' vous a été assigné",
                assignee,
                project.getDepartment(),
                newTicket.getId()
            );
        }
        
        return new ResponseEntity<>(ticketResponse, HttpStatus.CREATED);
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
            ticketRepository.save(ticket);
            return ResponseEntity.ok(getTicketResponse(ticket));
        }).orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    /**
     * Validates if a status transition is allowed based on business rules
     */
    private boolean isValidStatusTransition(Status currentStatus, Status newStatus, UserEntity modifier, Ticket ticket) {
        // No transition needed
        if (currentStatus == newStatus) {
            return true;
        }
        
        // Get the ticket creator (reporter)
        UserEntity reporter = ticket.getCreatedBy();
        
        switch (currentStatus) {
            case Nouveau:
                // NOUVEAU -> EN COURS: Admin, Support or assigned user can start work
                if (newStatus == Status.EnCours) {
                    return modifier != null && (
                        modifier.getRole() == Role.ADMIN ||
                        modifier.getRole() == Role.SUPPORT ||
                        (ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(modifier.getId()))
                    );
                }
                break;
                
            case EnCours:
                // EN COURS -> EN ATTENTE: Admin, Support or assigned user can pause work
                if (newStatus == Status.EnAttente) {
                    return modifier != null && (
                        modifier.getRole() == Role.ADMIN ||
                        modifier.getRole() == Role.SUPPORT ||
                        (ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(modifier.getId()))
                    );
                }
                // EN COURS -> TERMINE: Admin, Support or assigned user can complete work
                if (newStatus == Status.Termine) {
                    return modifier != null && (
                        modifier.getRole() == Role.ADMIN ||
                        modifier.getRole() == Role.SUPPORT ||
                        (ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(modifier.getId()))
                    );
                }
                break;
                
            case EnAttente:
                // EN ATTENTE -> EN COURS: Admin, Support or assigned user can resume work
                if (newStatus == Status.EnCours) {
                    return modifier != null && (
                        modifier.getRole() == Role.ADMIN ||
                        modifier.getRole() == Role.SUPPORT ||
                        (ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(modifier.getId()))
                    );
                }
                break;
        }
        
        // Any other transition is invalid
        return false;
    }

    public ResponseEntity<TicketResponse> updateTicketPartial(Long id, TicketUpdateRequest updateRequest) {
        Optional<Ticket> optionalTicket = ticketRepository.findById(id);
        return optionalTicket.map(ticket -> {
            Status oldStatus = ticket.getStatus();
            UserEntity oldAssignee = ticket.getAssignedTo();
            
            // Validate status transitions
            if (updateRequest.getStatus() != null) {
                Status newStatus = updateRequest.getStatus();
                Status currentStatus = ticket.getStatus();
                
                // Get modifier information
                UserEntity modifier = null;
                if (updateRequest.getModifierEmail() != null) {
                    modifier = userRepository.findByEmail(updateRequest.getModifierEmail()).orElse(null);
                }
                
                // Validate transition rules
                if (!isValidStatusTransition(currentStatus, newStatus, modifier, ticket)) {
                    return ResponseEntity.badRequest().body(getTicketResponse(ticket));
                }
                
                ticket.setStatus(newStatus);
            }
            
            if (updateRequest.getTitle() != null && !updateRequest.getTitle().isEmpty()) {
                ticket.setTitle(updateRequest.getTitle());
            }
            if (updateRequest.getDescription() != null) {
                ticket.setDescription(updateRequest.getDescription());
            }
            if (updateRequest.getPriority() != null) {
                ticket.setPriority(updateRequest.getPriority());
            }
            if (updateRequest.getCategory() != null) {
                ticket.setCategory(updateRequest.getCategory());
            }
            if (updateRequest.getAssignee() != null && !updateRequest.getAssignee().isEmpty()) {
                Optional<UserEntity> user = userRepository.findByEmail(updateRequest.getAssignee());
                user.ifPresent(ticket::setAssignedTo);
            } else if (updateRequest.getAssignee() != null && updateRequest.getAssignee().isEmpty()) {
                ticket.setAssignedTo(null);
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
        // Logical deletion - change status to Deleted instead of physical deletion
        Optional<Ticket> optionalTicket = ticketRepository.findById(id);
        if (optionalTicket.isPresent()) {
            Ticket ticket = optionalTicket.get();
            UserEntity creator = ticket.getCreatedBy();
            Department department = ticket.getProject() != null ? ticket.getProject().getDepartment() : null;
            
            ticket.setStatus(Status.Deleted);
            ticketRepository.save(ticket);
            
            // Notify ticket creator about deletion
            if (creator != null) {
                notificationService.createNotification(
                    NotificationType.TICKET_DELETED,
                    "Ticket supprimé",
                    "Le ticket '" + ticket.getTitle() + "' a été supprimé",
                    creator,
                    department,
                    id
                );
                log.info("Notification sent to {} about deleted ticket {}", creator.getEmail(), id);
            }
        }
    }

    @Transactional
    public void deleteAllTickets() {
        // Get all active tickets before deletion for notifications
        List<Ticket> activeTickets = ticketRepository.findByStatusNot(Status.Deleted);
        
        if (activeTickets.isEmpty()) {
            log.info("No active tickets found to delete");
            return;
        }
        
        log.info("Deleting {} active tickets", activeTickets.size());
        
        // Mark all tickets as deleted
        for (Ticket ticket : activeTickets) {
            ticket.setStatus(Status.Deleted);
            ticketRepository.save(ticket);
            
            // Notify ticket creator about deletion
            if (ticket.getCreatedBy() != null) {
                notificationService.createNotification(
                    NotificationType.TICKET_DELETED,
                    "Ticket supprimé",
                    "Le ticket '" + ticket.getTitle() + "' a été supprimé",
                    ticket.getCreatedBy(),
                    ticket.getProject() != null ? ticket.getProject().getDepartment() : null,
                    ticket.getId()
                );
            }
        }
        
        // Clean up orphaned comments
        List<Comment> orphanedComments = commentService.getOrphanedComments();
        for (Comment comment : orphanedComments) {
            commentService.deleteComment(comment.getId());
        }
        
        log.info("Successfully deleted {} tickets and {} orphaned comments", 
            activeTickets.size(), orphanedComments.size());
    }

    @Transactional
    public void deleteAllTicketsDirect() {
        // Direct SQL approach for bulk deletion
        entityManager.createNativeQuery("UPDATE ticket SET status = 'Deleted' WHERE status != 'Deleted'").executeUpdate();
        
        // Clean up orphaned comments
        entityManager.createNativeQuery("DELETE FROM comment WHERE ticket_id NOT IN (SELECT id FROM ticket WHERE status != 'Deleted')").executeUpdate();
        
        // Clean up orphaned notifications
        entityManager.createNativeQuery("DELETE FROM notification WHERE ticket_id NOT IN (SELECT id FROM ticket WHERE status != 'Deleted')").executeUpdate();
        
        // Clean up orphaned vector table entries
        entityManager.createNativeQuery("DELETE FROM vector_table WHERE ticket_id NOT IN (SELECT id FROM ticket WHERE status != 'Deleted')").executeUpdate();
        
        log.info("Successfully deleted all tickets and cleaned up related data");
    }

    public void assignTicket(Long ticketId, AssignRequest assignRequest) {
        Optional<Ticket> optionalTicket = ticketRepository.findById(ticketId);
        if (assignRequest.getEmail().isEmpty()) {
            optionalTicket.get().setAssignedTo(null);
            return;
        }
        Optional<UserEntity> user = userRepository.findByEmail(assignRequest.getEmail());
        if (optionalTicket.isEmpty() || user.isEmpty()) {
            return;
        }
        optionalTicket.get().setAssignedTo(user.get());
        ticketRepository.save(optionalTicket.get());
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
                .category(ticket.getCategory())
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

    @Transactional
    public ResponseEntity<List<TicketResponse>> getAllTicketByProjectId(Long pid) {
        List<Ticket> tickets = ticketRepository.findAllByProjectId(pid);
        List<TicketResponse> ticketResponses = new ArrayList<>();
        for (Ticket ticket : tickets) {
            ticketResponses.add(getTicketResponse(ticket));
        }
        return ResponseEntity.ok(ticketResponses);
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
    public ResponseEntity<List<TicketResponse>> getTicketsByUserEmail(String email) {
        List<Ticket> tickets = ticketRepository.findByCreatedByEmailOrAssignedToEmail(email, email);
        List<TicketResponse> ticketResponses = new ArrayList<>();
        for (Ticket ticket : tickets) {
            ticketResponses.add(getTicketResponse(ticket));
        }
        return ResponseEntity.ok(ticketResponses);
    }

    // Get tickets based on user role and department (for role-based visibility)
    public ResponseEntity<List<TicketResponse>> getTicketsForUser(String email, String role, Long departmentId) {
        List<Ticket> tickets;
        
        if ("ADMIN".equals(role)) {
            // Admin sees all tickets
            tickets = ticketRepository.findAll();
        } else if ("SUPPORT".equals(role) && departmentId != null) {
            // Support sees tickets from their department
            // Get all users in the department
            List<UserEntity> departmentUsers = userRepository.findAll().stream()
                .filter(u -> u.getDepartment() != null && u.getDepartment().getId().equals(departmentId))
                .collect(Collectors.toList());
            
            // Get all project IDs for the department
            List<Long> projectIds = projectRepository.findAll().stream()
                .filter(p -> p.getDepartment() != null && p.getDepartment().getId().equals(departmentId))
                .map(p -> p.getId())
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
        
        List<TicketResponse> ticketResponses = new ArrayList<>();
        for (Ticket ticket : tickets) {
            ticketResponses.add(getTicketResponse(ticket));
        }
        return ResponseEntity.ok(ticketResponses);
    }
}
