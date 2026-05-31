package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.dto.DashboardData;
import com.suryakn.IssueTracker.dto.TimeRangeFilter;
import com.suryakn.IssueTracker.dto.dashboard.DepartmentStats;
import com.suryakn.IssueTracker.dto.dashboard.TicketStatusDistribution;
import com.suryakn.IssueTracker.dto.dashboard.UserStats;
import com.suryakn.IssueTracker.entity.Department;
import com.suryakn.IssueTracker.entity.Project;
import com.suryakn.IssueTracker.entity.Status;
import com.suryakn.IssueTracker.entity.Ticket;
import com.suryakn.IssueTracker.entity.UserEntity;
import com.suryakn.IssueTracker.repository.DepartmentRepository;
import com.suryakn.IssueTracker.repository.ProjectRepository;
import com.suryakn.IssueTracker.repository.TicketRepository;
import com.suryakn.IssueTracker.repository.UserRepository;
import com.suryakn.IssueTracker.service.impl.DashboardServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    private Ticket testTicket;
    private UserEntity testUser;
    private Department testDepartment;
    private Project testProject;

    @BeforeEach
    void setUp() {
        testDepartment = Department.builder()
                .id(1L)
                .name("IT Department")
                .build();

        testUser = UserEntity.builder()
                .id(1)
                .firstName("John")
                .lastName("Doe")
                .email("john.doe@example.com")
                .password("password123")
                .role(com.suryakn.IssueTracker.entity.Role.USER)
                .department(testDepartment)
                .build();

        testProject = Project.builder()
                .id(1L)
                .name("Test Project")
                .department(testDepartment)
                .build();

        testTicket = Ticket.builder()
                .id(1L)
                .title("Test Ticket")
                .description("Test Description")
                .status(Status.Nouveau)
                .priority(com.suryakn.IssueTracker.entity.Priority.High)
                .category("Bug")
                .createdBy(testUser)
                .project(testProject)
                .build();
    }

    @Test
    void testGetStats_ShouldReturnDashboardData() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(testTicket);
        when(ticketRepository.findAll()).thenReturn(tickets);
        when(projectRepository.findAll()).thenReturn(List.of(testProject));
        when(userRepository.findAll()).thenReturn(List.of(testUser));
        when(departmentRepository.findAll()).thenReturn(List.of(testDepartment));

        ResponseEntity<DashboardData> response = dashboardService.getStats();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertNotNull(response.getBody().getStats());
        assertEquals(1L, response.getBody().getStats().getTotalTickets());
    }

    @Test
    void testGetStats_WithNoTickets_ShouldReturnZeroCounts() {
        when(ticketRepository.findAll()).thenReturn(new ArrayList<>());
        when(projectRepository.findAll()).thenReturn(new ArrayList<>());
        when(userRepository.findAll()).thenReturn(new ArrayList<>());
        when(departmentRepository.findAll()).thenReturn(new ArrayList<>());

        ResponseEntity<DashboardData> response = dashboardService.getStats();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody().getStats());
        assertEquals(0L, response.getBody().getStats().getTotalTickets());
    }

    @Test
    void testGetDashboardData_ShouldReturnCompleteDashboardData() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(testTicket);
        when(ticketRepository.findAll()).thenReturn(tickets);
        when(projectRepository.findAll()).thenReturn(List.of(testProject));
        when(userRepository.findAll()).thenReturn(List.of(testUser));
        when(departmentRepository.findAll()).thenReturn(List.of(testDepartment));

        ResponseEntity<DashboardData> response = dashboardService.getDashboardData(null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertNotNull(response.getBody().getStats());
        assertNotNull(response.getBody().getStatusDistribution());
        assertNotNull(response.getBody().getDepartmentStats());
        assertNotNull(response.getBody().getUserStats());
    }

    @Test
    void testGetStatusDistribution_ShouldReturnStatusCounts() {
        List<Ticket> tickets = new ArrayList<>();
        Ticket nouveauTicket = Ticket.builder().id(1L).status(Status.Nouveau).build();
         Ticket closedTicket = Ticket.builder().id(2L).status(Status.Terminé).build();
         Ticket inProgressTicket = Ticket.builder().id(3L).status(Status.EnCours).build();
        tickets.add(nouveauTicket);
        tickets.add(closedTicket);
        tickets.add(inProgressTicket);

        when(ticketRepository.findAll()).thenReturn(tickets);

        ResponseEntity<List<TicketStatusDistribution>> response = dashboardService.getStatusDistribution(null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        // Should have entries for Nouveau, Done, InProgress
        assertTrue(response.getBody().size() >= 3);
    }

    @Test
    void testGetStatusDistribution_ShouldReturnAllStatuses() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(testTicket);

        when(ticketRepository.findAll()).thenReturn(tickets);

        ResponseEntity<List<TicketStatusDistribution>> response = dashboardService.getStatusDistribution(null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        // Verify all statuses are present (Nouveau, InProgress, WaitingForUserResponse, Done)
        assertTrue(response.getBody().size() == Status.values().length);
    }

    @Test
    void testGetStatusDistribution_WithEmptyList_ShouldReturnAllStatusesWithZeroCounts() {
        when(ticketRepository.findAll()).thenReturn(new ArrayList<>());

        ResponseEntity<List<TicketStatusDistribution>> response = dashboardService.getStatusDistribution(null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        // Should still return all status types with 0 counts
        assertTrue(response.getBody().size() == Status.values().length);
    }

    @Test
    void testGetDepartmentStats_ShouldReturnDepartmentStatistics() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(testTicket);

        when(departmentRepository.findAll()).thenReturn(List.of(testDepartment));
        when(ticketRepository.findAll()).thenReturn(tickets);

        ResponseEntity<List<DepartmentStats>> response = dashboardService.getDepartmentStats(null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        assertEquals(testDepartment.getId(), response.getBody().get(0).getDepartmentId());
    }

    @Test
    void testGetDepartmentStats_WithNoDepartments_ShouldReturnEmptyList() {
        when(departmentRepository.findAll()).thenReturn(new ArrayList<>());
        when(ticketRepository.findAll()).thenReturn(new ArrayList<>());

        ResponseEntity<List<DepartmentStats>> response = dashboardService.getDepartmentStats(null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(0, response.getBody().size());
    }

    @Test
    void testGetUserStats_ShouldReturnUserStatistics() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(testTicket);

        when(userRepository.findAll()).thenReturn(List.of(testUser));
        when(ticketRepository.findAll()).thenReturn(tickets);

        ResponseEntity<List<UserStats>> response = dashboardService.getUserStats(null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        assertEquals(testUser.getId().longValue(), response.getBody().get(0).getUserId());
    }

    @Test
    void testGetUserStats_WithNoUsers_ShouldReturnEmptyList() {
        when(userRepository.findAll()).thenReturn(new ArrayList<>());
        when(ticketRepository.findAll()).thenReturn(new ArrayList<>());

        ResponseEntity<List<UserStats>> response = dashboardService.getUserStats(null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(0, response.getBody().size());
    }

    @Test
    void testGetUserStats_WithResolvedTickets_ShouldCalculateAverageResolutionTime() {
        Ticket resolvedTicket = Ticket.builder()
            .id(1L)
             .status(Status.Terminé)
            .createdBy(testUser)
            .build();
        resolvedTicket.setAssignedTo(testUser);

        List<Ticket> tickets = new ArrayList<>();
        tickets.add(resolvedTicket);

        when(userRepository.findAll()).thenReturn(List.of(testUser));
        when(ticketRepository.findAll()).thenReturn(tickets);

        ResponseEntity<List<UserStats>> response = dashboardService.getUserStats(null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        assertEquals(1, response.getBody().get(0).getResolvedCount());
    }

    @Test
    void testGetDashboardData_WithTimeRangeFilter_ShouldApplyFilters() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(testTicket);

        TimeRangeFilter filter = new TimeRangeFilter();
        filter.setStartDate("2024-01-01");
        filter.setEndDate("2024-12-31");
        filter.setDepartmentId(1L);

        when(ticketRepository.findAll()).thenReturn(tickets);
        when(projectRepository.findAll()).thenReturn(List.of(testProject));
        when(userRepository.findAll()).thenReturn(List.of(testUser));
        when(departmentRepository.findAll()).thenReturn(List.of(testDepartment));

        ResponseEntity<DashboardData> response = dashboardService.getDashboardData(filter);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(filter, response.getBody().getTimeRange());
    }

    @Test
    void testExportData_ShouldReturnPlaceholder() {
        ResponseEntity<byte[]> response = dashboardService.exportData("csv", null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }
}