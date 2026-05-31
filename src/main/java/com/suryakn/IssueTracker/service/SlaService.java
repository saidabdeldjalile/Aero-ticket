package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.entity.Priority;
import com.suryakn.IssueTracker.entity.Status;
import com.suryakn.IssueTracker.entity.Ticket;
import com.suryakn.IssueTracker.repository.TicketRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SlaService {

    private final TicketRepository ticketRepository;

    @Value("${sla.first-response-critical:1}")
    private int slaFirstResponseCritical;

    @Value("${sla.first-response-high:4}")
    private int slaFirstResponseHigh;

    @Value("${sla.first-response-medium:8}")
    private int slaFirstResponseMedium;

    @Value("${sla.first-response-low:24}")
    private int slaFirstResponseLow;

    @Value("${sla.resolution-critical:8}")
    private int slaResolutionCritical;

    @Value("${sla.resolution-high:24}")
    private int slaResolutionHigh;

    @Value("${sla.resolution-medium:72}")
    private int slaResolutionMedium;

    @Value("${sla.resolution-low:120}")
    private int slaResolutionLow;

    public SlaMetrics getSlaMetrics() {
        List<Ticket> allTickets = ticketRepository.findAll();
        
        int totalTickets = allTickets.size();
        int breachedTickets = 0;
        int atRiskTickets = 0;
        int resolvedOnTime = 0;
        int resolvedLate = 0;
        
        LocalDateTime now = LocalDateTime.now();
        
        for (Ticket ticket : allTickets) {
            // First response SLA
            if (ticket.getFirstResponseDueAt() != null && now.isAfter(ticket.getFirstResponseDueAt())) {
                if (ticket.getStatus() == Status.Nouveau) {
                    breachedTickets++;
                }
            }
            
             // Resolution SLA
             if (ticket.getResolutionDueAt() != null && now.isAfter(ticket.getResolutionDueAt())) {
                 if (ticket.getStatus() != Status.Terminé) {
                     atRiskTickets++;
                 }
             }
            
             // Resolved tickets - check if on time
             if (ticket.getStatus() == Status.Terminé) {
                 if (ticket.getResolutionDueAt() != null && ticket.getModifiedAt() != null) {
                     if (ticket.getModifiedAt().isBefore(ticket.getResolutionDueAt())) {
                         resolvedOnTime++;
                     } else {
                         resolvedLate++;
                     }
                 }
             }
        }
        
        double complianceRate = totalTickets > 0 ? ((double) resolvedOnTime / (resolvedOnTime + resolvedLate)) * 100 : 100.0;
        
        return SlaMetrics.builder()
                .totalTickets(totalTickets)
                .breachedTickets(breachedTickets)
                .atRiskTickets(atRiskTickets)
                .resolvedOnTime(resolvedOnTime)
                .resolvedLate(resolvedLate)
                .complianceRate(complianceRate)
                .build();
    }

    public SlaMetrics getSlaMetricsByPriority(Priority priority) {
        List<Ticket> tickets = ticketRepository.findAll().stream()
                .filter(t -> t.getPriority() == priority)
                .collect(Collectors.toList());
        
        return calculateMetricsForTickets(tickets);
    }

    public SlaMetrics getSlaMetricsByDepartment(Long departmentId) {
        List<Ticket> tickets = ticketRepository.findAll().stream()
                .filter(t -> t.getProject() != null && 
                         t.getProject().getDepartment() != null &&
                         t.getProject().getDepartment().getId().equals(departmentId))
                .collect(Collectors.toList());
        
        return calculateMetricsForTickets(tickets);
    }

    private SlaMetrics calculateMetricsForTickets(List<Ticket> tickets) {
        int totalTickets = tickets.size();
        int breachedTickets = 0;
        int atRiskTickets = 0;
        int resolvedOnTime = 0;
        int resolvedLate = 0;
        
        LocalDateTime now = LocalDateTime.now();
        
        for (Ticket ticket : tickets) {
            if (ticket.getFirstResponseDueAt() != null && now.isAfter(ticket.getFirstResponseDueAt())) {
                if (ticket.getStatus() == Status.Nouveau) {
                    breachedTickets++;
                }
            }
            
             if (ticket.getResolutionDueAt() != null && now.isAfter(ticket.getResolutionDueAt())) {
                 if (ticket.getStatus() != Status.Terminé) {
                     atRiskTickets++;
                 }
             }
            
             if (ticket.getStatus() == Status.Terminé) {
                 if (ticket.getResolutionDueAt() != null && ticket.getModifiedAt() != null) {
                     if (ticket.getModifiedAt().isBefore(ticket.getResolutionDueAt())) {
                         resolvedOnTime++;
                     } else {
                         resolvedLate++;
                     }
                 }
             }
        }
        
        double complianceRate = totalTickets > 0 ? 
            ((double) (resolvedOnTime + resolvedLate) > 0 ? resolvedOnTime : 100) : 100.0;
        
        return SlaMetrics.builder()
                .totalTickets(totalTickets)
                .breachedTickets(breachedTickets)
                .atRiskTickets(atRiskTickets)
                .resolvedOnTime(resolvedOnTime)
                .resolvedLate(resolvedLate)
                .complianceRate(complianceRate)
                .build();
    }

     public List<TicketSlaStatus> getBreachedTickets() {
         List<TicketSlaStatus> breached = new ArrayList<>();
         LocalDateTime now = LocalDateTime.now();
         
         List<Ticket> tickets = ticketRepository.findAll();
         for (Ticket ticket : tickets) {
             if (ticket.getStatus() == Status.Terminé) {
                 continue;
             }
            
            if (ticket.getFirstResponseDueAt() != null && now.isAfter(ticket.getFirstResponseDueAt())) {
                long minutesOverdue = Duration.between(ticket.getFirstResponseDueAt(), now).toMinutes();
                breached.add(TicketSlaStatus.builder()
                        .ticketId(ticket.getId())
                        .ticketTitle(ticket.getTitle())
                        .priority(ticket.getPriority())
                        .slaType("FIRST_RESPONSE")
                        .dueAt(ticket.getFirstResponseDueAt())
                        .minutesOverdue(minutesOverdue)
                        .build());
            }
            
            if (ticket.getResolutionDueAt() != null && now.isAfter(ticket.getResolutionDueAt())) {
                long minutesOverdue = Duration.between(ticket.getResolutionDueAt(), now).toMinutes();
                breached.add(TicketSlaStatus.builder()
                        .ticketId(ticket.getId())
                        .ticketTitle(ticket.getTitle())
                        .priority(ticket.getPriority())
                        .slaType("RESOLUTION")
                        .dueAt(ticket.getResolutionDueAt())
                        .minutesOverdue(minutesOverdue)
                        .build());
            }
        }
        
        return breached.stream()
                .sorted(Comparator.comparingLong(TicketSlaStatus::getMinutesOverdue).reversed())
                .collect(Collectors.toList());
    }

     public List<TicketSlaStatus> getAtRiskTickets() {
         List<TicketSlaStatus> atRisk = new ArrayList<>();
         LocalDateTime now = LocalDateTime.now();
         
         List<Ticket> tickets = ticketRepository.findAll();
         for (Ticket ticket : tickets) {
             if (ticket.getStatus() == Status.Terminé) {
                 continue;
             }
            
            // Check first response risk
            if (ticket.getFirstResponseDueAt() != null && 
                now.plusHours(1).isAfter(ticket.getFirstResponseDueAt())) {
                long minutesRemaining = Duration.between(now, ticket.getFirstResponseDueAt()).toMinutes();
                atRisk.add(TicketSlaStatus.builder()
                        .ticketId(ticket.getId())
                        .ticketTitle(ticket.getTitle())
                        .priority(ticket.getPriority())
                        .slaType("FIRST_RESPONSE")
                        .dueAt(ticket.getFirstResponseDueAt())
                        .minutesRemaining(minutesRemaining)
                        .build());
            }
            
            // Check resolution risk
            if (ticket.getResolutionDueAt() != null && 
                now.plusHours(4).isAfter(ticket.getResolutionDueAt())) {
                long minutesRemaining = Duration.between(now, ticket.getResolutionDueAt()).toMinutes();
                atRisk.add(TicketSlaStatus.builder()
                        .ticketId(ticket.getId())
                        .ticketTitle(ticket.getTitle())
                        .priority(ticket.getPriority())
                        .slaType("RESOLUTION")
                        .dueAt(ticket.getResolutionDueAt())
                        .minutesRemaining(minutesRemaining)
                        .build());
            }
        }
        
        return atRisk.stream()
                .sorted(Comparator.comparingLong(TicketSlaStatus::getMinutesRemaining))
                .collect(Collectors.toList());
    }

    public void checkAndNotifySlaBreach(Ticket ticket) {
        LocalDateTime now = LocalDateTime.now();
        
        // First response breach
        if (ticket.getFirstResponseDueAt() != null && now.isAfter(ticket.getFirstResponseDueAt())) {
            log.warn("SLA BREACH: Ticket #{} first response overdue by {} minutes", 
                    ticket.getId(), 
                    Duration.between(ticket.getFirstResponseDueAt(), now).toMinutes());
        }
        
        // Resolution breach
        if (ticket.getResolutionDueAt() != null && now.isAfter(ticket.getResolutionDueAt())) {
            log.warn("SLA BREACH: Ticket #{} resolution overdue by {} minutes", 
                    ticket.getId(), 
                    Duration.between(ticket.getResolutionDueAt(), now).toMinutes());
        }
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class SlaMetrics {
        private int totalTickets;
        private int breachedTickets;
        private int atRiskTickets;
        private int resolvedOnTime;
        private int resolvedLate;
        private double complianceRate;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class TicketSlaStatus {
        private Long ticketId;
        private String ticketTitle;
        private Priority priority;
        private String slaType;
        private LocalDateTime dueAt;
        private long minutesOverdue;
        private long minutesRemaining;
    }
}