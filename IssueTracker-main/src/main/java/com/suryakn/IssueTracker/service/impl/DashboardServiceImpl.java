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
            dashboardData.setStats(getStatsData(filters));
            dashboardData.setStatusDistribution(getStatusDistribution(filters).getBody());
            dashboardData.setDepartmentStats(getDepartmentStats(filters).getBody());
            dashboardData.setUserStats(getUserStats(filters).getBody());
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
                long inProgress = deptTickets.stream().filter(t -> t.getStatus() == Status.EnCours).count();
                long waiting = deptTickets.stream().filter(t -> t.getStatus() == Status.EnAttente).count();
                long closed = deptTickets.stream().filter(t -> t.getStatus() == Status.Termine).count();
                double avgResolutionTime = calculateAverageResolutionTime(deptTickets);
                DepartmentStats deptData = new DepartmentStats();
                deptData.setDepartmentId(dept.getId());
                deptData.setDepartmentName(dept.getName());
                deptData.setTicketCount(total);
                deptData.setOpenCount(open + inProgress + waiting);
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
                    .filter(t -> t.getStatus() == Status.Termine)
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
        stats.setClosedTickets(tickets.stream().filter(t -> t.getStatus() == Status.Termine).count());
        stats.setInProgressTickets(tickets.stream().filter(t -> t.getStatus() == Status.EnCours || t.getStatus() == Status.EnAttente).count());
        stats.setTotalProjects((long) projectRepository.findAll().size());
        stats.setTotalUsers((long) userRepository.findAll().size());
        stats.setTotalDepartments((long) departmentRepository.findAll().size());
        stats.setAverageResolutionTime(calculateAverageResolutionTime(tickets));
        return stats;
    }

    private List<Ticket> getFilteredTickets(TimeRangeFilter filters) {
        List<Ticket> tickets = ticketRepository.findAll();
        // Additional filtering logic can be added here if needed
        return tickets;
    }

    private double calculateAverageResolutionTime(List<Ticket> tickets) {
        if (tickets.isEmpty()) return 0.0;
        double totalTime = 0.0;
        long resolvedCount = 0;
        for (Ticket ticket : tickets) {
            if (ticket.getStatus() == Status.Termine && ticket.getCreatedAt() != null && ticket.getModifiedAt() != null) {
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
            return ResponseEntity.ok("Export functionality not yet implemented".getBytes());
        } catch (Exception e) {
            log.error("Error exporting dashboard data: ", e);
            return ResponseEntity.badRequest().build();
        }
    }
}
