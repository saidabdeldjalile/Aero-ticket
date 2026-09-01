package com.suryakn.IssueTracker.controller;

import com.suryakn.IssueTracker.dto.AssignRequest;
import com.suryakn.IssueTracker.dto.BulkActionRequest;
import com.suryakn.IssueTracker.dto.TicketFilter;
import com.suryakn.IssueTracker.dto.TicketRequest;
import com.suryakn.IssueTracker.dto.TicketResponse;
import com.suryakn.IssueTracker.dto.TicketUpdateRequest;
import com.suryakn.IssueTracker.entity.Priority;
import com.suryakn.IssueTracker.entity.Status;
import com.suryakn.IssueTracker.entity.UserEntity;
import com.suryakn.IssueTracker.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
@Slf4j
public class TicketController {

    private final TicketService ticketService;

    // Get all tickets for the authenticated user - MUST come before /{id}
    @GetMapping("/my-tickets")
    public ResponseEntity<Page<TicketResponse>> getMyTickets(
            @RequestParam String email,
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String search) {
        return ticketService.getTicketsByUserEmail(email, pageable, search);
    }

    // Get tickets based on user role and department - MUST come before /{id}
    @GetMapping("/tickets-for-user")
    public ResponseEntity<Page<TicketResponse>> getTicketsForUser(
            @RequestParam String email,
            @RequestParam String role,
            @RequestParam(required = false) Long departmentId,
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String search) {
        log.info("getTicketsForUser called with email: {}, role: {}, departmentId: {}, search: {}", email, role, departmentId, search);
        try {
            return ticketService.getTicketsForUser(email, role, departmentId, pageable, search);
        } catch (Exception e) {
            log.error("Error in getTicketsForUser: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public ResponseEntity<Page<TicketResponse>> all(
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String search) {
        return ticketService.getAllTickets(pageable, search);
    }

    @GetMapping("{id}")
    public ResponseEntity<TicketResponse> ticketWithId(@PathVariable Long id) {
        return ticketService.getTicketById(id);
    }

    @PostMapping
    public ResponseEntity<TicketResponse> addTicket(@Valid @RequestBody TicketRequest newTicket) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && authentication.getPrincipal() instanceof UserEntity) {
            UserEntity currentUser = (UserEntity) authentication.getPrincipal();
            // For normal USER role: force creator to be the authenticated user and auto-assign to department support
            if ("USER".equals(currentUser.getRole().name())) {
                newTicket.setReporter(currentUser.getEmail());
                newTicket.setAssignee(null);
            }
        }
        return ticketService.addTicket(newTicket);
    }

    @PostMapping("{id}")
    public ResponseEntity<TicketResponse> replaceTicket(@Valid @RequestBody TicketRequest ticketRequest, @PathVariable Long id) {
        return ticketService.updateTicket(ticketRequest, id);
    }

    // PATCH endpoint for partial updates (status, priority, etc.)
    @PatchMapping("{id}")
    public ResponseEntity<TicketResponse> updateTicketPartial(@PathVariable Long id, @Valid @RequestBody TicketUpdateRequest updateRequest) {
        return ticketService.updateTicketPartial(id, updateRequest);
    }

    @PostMapping("{ticketId}/assign")
    public void assignTicket(@PathVariable Long ticketId, @Valid @RequestBody AssignRequest assignRequest) {
        ticketService.assignTicket(ticketId, assignRequest);
    }

    @DeleteMapping("{id}")
    public void deleteTicket(@PathVariable Long id) {
        ticketService.deleteTicket(id);
    }

    // ==================== ADVANCED FILTERS ====================

    /**
     * Advanced search with multiple filters
     */
    @GetMapping("/search")
    public ResponseEntity<Page<TicketResponse>> searchTickets(
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<Status> status,
            @RequestParam(required = false) List<Priority> priority,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String category) {
        
        // Parse date strings to LocalDateTime
        LocalDateTime startDateTime = null;
        LocalDateTime endDateTime = null;
        
        if (startDate != null && !startDate.isBlank()) {
            try {
                startDateTime = parseIsoDateTime(startDate);
            } catch (Exception e) {
                log.warn("Failed to parse startDate: {}. Error: {}", startDate, e.getMessage());
                throw new IllegalArgumentException("Format de date de début invalide (ISO-8601 attendu, ex: yyyy-MM-dd'T'HH:mm:ss)");
            }
        }
        
        if (endDate != null && !endDate.isBlank()) {
            try {
                endDateTime = parseIsoDateTime(endDate);
            } catch (Exception e) {
                log.warn("Failed to parse endDate: {}. Error: {}", endDate, e.getMessage());
                throw new IllegalArgumentException("Format de date de fin invalide (ISO-8601 attendu, ex: yyyy-MM-dd'T'HH:mm:ss)");
            }
        }

        if (startDateTime != null && endDateTime != null && startDateTime.isAfter(endDateTime)) {
            throw new IllegalArgumentException("La date de début doit être inférieure ou égale à la date de fin");
        }
        
        log.info("Advanced search called with: search={}, status={}, priority={}, startDate={}, endDate={}, departmentId={}, projectId={}, category={}",
                search, status, priority, startDate, endDate, departmentId, projectId, category);
        return ticketService.searchTickets(pageable, search, status, priority, startDateTime, endDateTime, departmentId, projectId, category);
    }

    /**
     * Parse ISO 8601 date-time string to LocalDateTime.
     * Handles formats like: 2026-03-05T00:00:00.000Z, 2026-03-05T00:00:00Z, 2026-03-05T00:00:00
     */
    private LocalDateTime parseIsoDateTime(String dateTimeStr) {
        // Trim whitespace
        String cleaned = dateTimeStr.trim();
        
        // Remove trailing 'Z' (UTC indicator)
        if (cleaned.endsWith("Z")) {
            cleaned = cleaned.substring(0, cleaned.length() - 1);
        }
        
        // Replace 'T' with space
        cleaned = cleaned.replace("T", " ");
        
        // Remove milliseconds if present
        if (cleaned.contains(".")) {
            cleaned = cleaned.substring(0, cleaned.indexOf("."));
        }
        
        // Handle case where we only have date (yyyy-MM-dd)
        if (cleaned.length() == 10) {
            cleaned = cleaned + " 00:00:00";
        }
        
        return LocalDateTime.parse(cleaned, java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    // ==================== BULK ACTIONS ====================

    /**
     * Bulk delete tickets (permanent deletion from database)
     */
    @PostMapping("/bulk/delete")
    public ResponseEntity<Void> bulkDeleteTickets(@Valid @RequestBody BulkActionRequest request) {
        log.info("Bulk delete called for {} tickets", request.getTicketIds().size());
        ticketService.bulkDeleteTickets(request.getTicketIds());
        return ResponseEntity.ok().build();
    }

    /**
     * Bulk assign tickets to a user
     */
    @PostMapping("/bulk/assign")
    public ResponseEntity<Void> bulkAssignTickets(@Valid @RequestBody BulkActionRequest request) {
        log.info("Bulk assign called for {} tickets to {}", request.getTicketIds().size(), request.getAssigneeEmail());
        ticketService.bulkAssignTickets(request.getTicketIds(), request.getAssigneeEmail());
        return ResponseEntity.ok().build();
    }

    // ==================== KANBAN VIEW ====================

    /**
     * Get tickets without a project (for admin orientation)
     */
    @GetMapping("/unassigned")
    public ResponseEntity<List<TicketResponse>> getUnassignedTickets() {
        log.info("Fetching tickets without project assignment");
        return ticketService.getUnassignedTickets();
    }

    /**
     * Get tickets grouped by status for Kanban board
     */
    @GetMapping("/kanban")
    public ResponseEntity<?> getKanbanTickets(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long departmentId) {
        log.info("Kanban view requested for projectId={}, departmentId={}", projectId, departmentId);
        return ticketService.getKanbanTickets(projectId, departmentId);
    }
}
