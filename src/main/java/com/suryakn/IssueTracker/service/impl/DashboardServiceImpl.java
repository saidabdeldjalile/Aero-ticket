package com.suryakn.IssueTracker.service.impl;

import com.suryakn.IssueTracker.dto.DashboardData;
import com.suryakn.IssueTracker.dto.TimeRangeFilter;
import com.suryakn.IssueTracker.dto.dashboard.DashboardStats;
import com.suryakn.IssueTracker.dto.dashboard.DepartmentStats;
import com.suryakn.IssueTracker.dto.dashboard.TicketStatusDistribution;
import com.suryakn.IssueTracker.dto.dashboard.UserStats;
import com.suryakn.IssueTracker.entity.Department;
import com.suryakn.IssueTracker.entity.Project;
import com.suryakn.IssueTracker.entity.Role;
import com.suryakn.IssueTracker.entity.Status;
import com.suryakn.IssueTracker.entity.Ticket;
import com.suryakn.IssueTracker.entity.UserEntity;
import com.suryakn.IssueTracker.repository.DepartmentRepository;
import com.suryakn.IssueTracker.repository.ProjectRepository;
import com.suryakn.IssueTracker.repository.TicketRepository;
import com.suryakn.IssueTracker.repository.UserRepository;
import com.suryakn.IssueTracker.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardServiceImpl implements DashboardService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final DepartmentRepository departmentRepository;

    @Override
    public ResponseEntity<DashboardData> getStats() {
        try {
            DashboardData dashboardData = new DashboardData();
            dashboardData.setStats(getStatsData(null));
            return ResponseEntity.ok(dashboardData);
        } catch (Exception e) {
            log.error("Error getting stats: ", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @Override
    public ResponseEntity<DashboardData> getDashboardData(TimeRangeFilter filters) {
        try {
            DashboardData dashboardData = new DashboardData();
            
            // Get stats
            dashboardData.setStats(getStatsData(filters));
            
            // Get distributions
            dashboardData.setStatusDistribution(getStatusDistribution(filters).getBody());
            dashboardData.setDepartmentStats(getDepartmentStats(filters).getBody());
            dashboardData.setUserStats(getUserStats(filters).getBody());
            
            // Set time range
            dashboardData.setTimeRange(filters);
            
            return ResponseEntity.ok(dashboardData);
        } catch (Exception e) {
            log.error("Error getting dashboard data: ", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @Override
    public ResponseEntity<List<TicketStatusDistribution>> getStatusDistribution(TimeRangeFilter filters) {
        try {
            List<TicketStatusDistribution> distribution = new ArrayList<>();
            
            List<Ticket> tickets = getFilteredTickets(filters);
            
            java.util.Map<Status, Long> statusCount = tickets.stream()
                .collect(Collectors.groupingBy(Ticket::getStatus, Collectors.counting()));
            
            long totalTickets = tickets.size();
            
            for (Status status : Status.values()) {
                long count = statusCount.getOrDefault(status, 0L);
                double percentage = totalTickets > 0 ? (count * 100.0 / totalTickets) : 0.0;
                
                TicketStatusDistribution statusData = new TicketStatusDistribution();
                statusData.setStatus(status.name());
                statusData.setCount(count);
                statusData.setPercentage(Math.round(percentage * 100.0) / 100.0);
                distribution.add(statusData);
            }
            
            return ResponseEntity.ok(distribution);
        } catch (Exception e) {
            log.error("Error getting status distribution: ", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @Override
    public ResponseEntity<List<DepartmentStats>> getDepartmentStats(TimeRangeFilter filters) {
        try {
            List<DepartmentStats> deptStats = new ArrayList<>();
            
            List<Department> departments = departmentRepository.findAll();
            List<Ticket> tickets = getFilteredTickets(filters);
            
            for (Department dept : departments) {
                List<Ticket> deptTickets = tickets.stream()
                    .filter(t -> t.getProject() != null && t.getProject().getDepartment() != null && 
                                 t.getProject().getDepartment().getId().equals(dept.getId()))
                    .collect(Collectors.toList());
                
                long total = deptTickets.size();
                long open = deptTickets.stream().filter(t -> t.getStatus() == Status.Nouveau).count();
                long closed = deptTickets.stream().filter(t -> t.getStatus() == Status.Terminé).count();
                
                double avgResolutionTime = calculateAverageResolutionTime(deptTickets);
                
                DepartmentStats deptData = new DepartmentStats();
                deptData.setDepartmentId(dept.getId());
                deptData.setDepartmentName(dept.getName());
                deptData.setTicketCount(total);
                deptData.setOpenCount(open);
                deptData.setClosedCount(closed);
                deptData.setAverageResolutionTime(Math.round(avgResolutionTime * 100.0) / 100.0);
                
                deptStats.add(deptData);
            }
            
            return ResponseEntity.ok(deptStats);
        } catch (Exception e) {
            log.error("Error getting department stats: ", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @Override
    public ResponseEntity<List<UserStats>> getUserStats(TimeRangeFilter filters) {
        try {
            List<UserStats> userStats = new ArrayList<>();
            
            List<UserEntity> users = userRepository.findAll();
            List<Ticket> tickets = getFilteredTickets(filters);
            
            for (UserEntity user : users) {
                List<Ticket> userTickets = tickets.stream()
                    .filter(t -> t.getCreatedBy() != null && t.getCreatedBy().getId().equals(user.getId()))
                    .collect(Collectors.toList());
                
                List<Ticket> assignedTickets = tickets.stream()
                    .filter(t -> t.getAssignedTo() != null && t.getAssignedTo().getId().equals(user.getId()))
                    .collect(Collectors.toList());
                
                List<Ticket> resolvedTickets = assignedTickets.stream()
                    .filter(t -> t.getStatus() == Status.Terminé)
                    .collect(Collectors.toList());
                
                long total = userTickets.size();
                long assigned = assignedTickets.size();
                long resolved = resolvedTickets.size();
                
                double avgResolutionTime = calculateAverageResolutionTime(resolvedTickets);
                
                UserStats userData = new UserStats();
                userData.setUserId(user.getId().longValue());
                userData.setUserName(user.getFirstName() + " " + user.getLastName());
                userData.setTicketCount(total);
                userData.setAssignedCount(assigned);
                userData.setResolvedCount(resolved);
                userData.setAverageResolutionTime(Math.round(avgResolutionTime * 100.0) / 100.0);
                
                userStats.add(userData);
            }
            
            return ResponseEntity.ok(userStats);
        } catch (Exception e) {
            log.error("Error getting user stats: ", e);
            return ResponseEntity.badRequest().build();
        }
    }

    private DashboardStats getStatsData(TimeRangeFilter filters) {
        DashboardStats stats = new DashboardStats();
        
        List<Ticket> tickets = getFilteredTickets(filters);
        
        stats.setTotalTickets((long) tickets.size());
        stats.setOpenTickets(tickets.stream().filter(t -> t.getStatus() == Status.Nouveau).count());
        stats.setClosedTickets(tickets.stream().filter(t -> t.getStatus() == Status.Terminé).count());
        stats.setInProgressTickets(tickets.stream().filter(t -> t.getStatus() == Status.EnCours).count());
        stats.setTotalProjects((long) projectRepository.findAll().size());
        stats.setTotalUsers((long) userRepository.findAll().size());
        stats.setTotalDepartments((long) departmentRepository.findAll().size());
        stats.setAverageResolutionTime(calculateAverageResolutionTime(tickets));
        
        return stats;
    }

    private List<Ticket> getFilteredTickets(TimeRangeFilter filters) {
        List<Ticket> tickets = ticketRepository.findAll();
        
        // Get current user's department for ADMIN role-based filtering
        Long userDepartmentId = getCurrentUserDepartmentId();
        String userRole = getCurrentUserRole();
        
        // If user is ADMIN
        if ("ADMIN".equals(userRole)) {
            // If admin has no department, they see ALL tickets (no filtering)
            if (userDepartmentId == null && (filters == null || filters.getDepartmentId() == null)) {
                // Admin without department sees all tickets - no filtering needed
            } else if (userDepartmentId != null && (filters == null || filters.getDepartmentId() == null)) {
                // Admin with department sees only tickets from their department
                tickets = tickets.stream()
                    .filter(t -> t.getProject() != null && 
                                t.getProject().getDepartment() != null &&
                                t.getProject().getDepartment().getId().equals(userDepartmentId))
                    .collect(Collectors.toList());
            }
        }
        
        if (filters != null) {
            // Filter by date range
            if (filters.getStartDate() != null || filters.getEndDate() != null) {
                LocalDate start = null;
                LocalDate end = null;
                
                if (filters.getStartDate() != null && !filters.getStartDate().isBlank()) {
                    try {
                        start = LocalDate.parse(filters.getStartDate());
                    } catch (Exception e) {
                        throw new IllegalArgumentException("Format de date de début de filtre invalide (attendu yyyy-MM-dd)");
                    }
                }
                
                if (filters.getEndDate() != null && !filters.getEndDate().isBlank()) {
                    try {
                        end = LocalDate.parse(filters.getEndDate());
                    } catch (Exception e) {
                        throw new IllegalArgumentException("Format de date de fin de filtre invalide (attendu yyyy-MM-dd)");
                    }
                }
                
                if (start != null && end != null && start.isAfter(end)) {
                    throw new IllegalArgumentException("La date de début doit être inférieure ou égale à la date de fin");
                }
                
                final LocalDate finalStart = start;
                final LocalDate finalEnd = end;
                
                tickets = tickets.stream()
                    .filter(t -> {
                        if (t.getCreatedAt() == null) return false;
                        LocalDate ticketDate = t.getCreatedAt().toLocalDate();
                        if (finalStart != null && ticketDate.isBefore(finalStart)) return false;
                        if (finalEnd != null && ticketDate.isAfter(finalEnd)) return false;
                        return true;
                    })
                    .collect(Collectors.toList());
            }
            
            // Filter by department (only if not already filtered by user's department)
            if (filters.getDepartmentId() != null && (userDepartmentId == null || !userDepartmentId.equals(filters.getDepartmentId()))) {
                tickets = tickets.stream()
                    .filter(t -> t.getProject() != null && 
                                t.getProject().getDepartment() != null &&
                                t.getProject().getDepartment().getId().equals(filters.getDepartmentId()))
                    .collect(Collectors.toList());
            }
            
            // Filter by project
            if (filters.getProjectId() != null) {
                tickets = tickets.stream()
                    .filter(t -> t.getProject() != null && 
                                t.getProject().getId().equals(filters.getProjectId()))
                    .collect(Collectors.toList());
            }
        }
        
        return tickets;
    }
    
    private Long getCurrentUserDepartmentId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated() && authentication.getName() != null) {
                String email = authentication.getName();
                UserEntity user = userRepository.findByEmail(email).orElse(null);
                if (user != null && user.getDepartment() != null) {
                    return user.getDepartment().getId();
                }
            }
        } catch (Exception e) {
            log.warn("Error getting current user department: {}", e.getMessage());
        }
        return null;
    }
    
    private String getCurrentUserRole() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated() && authentication.getName() != null) {
                String email = authentication.getName();
                UserEntity user = userRepository.findByEmail(email).orElse(null);
                if (user != null && user.getRole() != null) {
                    return user.getRole().name();
                }
            }
        } catch (Exception e) {
            log.warn("Error getting current user role: {}", e.getMessage());
        }
        return null;
    }

    private double calculateAverageResolutionTime(List<Ticket> tickets) {
        if (tickets.isEmpty()) {
            return 0.0;
        }
        
        double totalTime = 0.0;
        long resolvedCount = 0;
        
        for (Ticket ticket : tickets) {
            if (ticket.getStatus() == Status.Terminé && ticket.getCreatedAt() != null && ticket.getModifiedAt() != null) {
                long days = ChronoUnit.DAYS.between(ticket.getCreatedAt(), ticket.getModifiedAt());
                totalTime += days;
                resolvedCount++;
            }
        }
        
        return resolvedCount > 0 ? totalTime / resolvedCount : 0.0;
    }

    @Override
    public ResponseEntity<byte[]> exportData(String format, TimeRangeFilter filters) {
        try {
            // This is a placeholder for export functionality
            // In a real implementation, you would generate CSV or Excel files
            return ResponseEntity.ok("Export functionality not yet implemented".getBytes());
        } catch (Exception e) {
            log.error("Error exporting dashboard data: ", e);
            return ResponseEntity.badRequest().build();
        }
    }
}