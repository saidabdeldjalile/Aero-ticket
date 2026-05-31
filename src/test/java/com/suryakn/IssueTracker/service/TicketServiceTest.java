package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.dto.AssignRequest;
import com.suryakn.IssueTracker.dto.TicketRequest;
import com.suryakn.IssueTracker.dto.TicketResponse;
import com.suryakn.IssueTracker.dto.TicketUpdateRequest;
import com.suryakn.IssueTracker.duplicate.DuplicateTicketService;
import com.suryakn.IssueTracker.entity.*;
import com.suryakn.IssueTracker.repository.ProjectRepository;
import com.suryakn.IssueTracker.repository.TicketRepository;
import com.suryakn.IssueTracker.repository.UserRepository;
import com.suryakn.IssueTracker.repository.VectorTableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private VectorTableRepository vectorTableRepository;

    @Mock
    private CommentService commentService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private DuplicateTicketService duplicateTicketService;

    @InjectMocks
    private TicketService ticketService;

    private Ticket testTicket;
    private UserEntity testUser;
    private Project testProject;
    private Department testDepartment;

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
                .role(Role.USER)
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
                .priority(Priority.High)
                .category("Bug")
                .createdBy(testUser)
                .project(testProject)
                .build();
    }

    @Test
    void testGetTicketById_WhenExists_ShouldReturnTicket() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));
        ResponseEntity<TicketResponse> response = ticketService.getTicketById(1L);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Test Ticket", response.getBody().getTitle());
        verify(ticketRepository, times(1)).findById(1L);
    }

    @Test
    void testGetTicketById_WhenNotExists_ShouldReturnNotFound() {
        when(ticketRepository.findById(999L)).thenReturn(Optional.empty());
        ResponseEntity<TicketResponse> response = ticketService.getTicketById(999L);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody());
    }

    @Test
    void testGetAllTickets_WithoutSearch_ShouldReturnAllTickets() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(testTicket);
        Page<Ticket> ticketPage = new PageImpl<>(tickets);
        when(ticketRepository.findAll(any(Pageable.class))).thenReturn(ticketPage);

        ResponseEntity<Page<TicketResponse>> response = ticketService.getAllTickets(
            PageRequest.of(0, 10), null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getContent().size());
    }

    @Test
    void testGetAllTickets_WithSearch_ShouldReturnFilteredTickets() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(testTicket);
        Page<Ticket> ticketPage = new PageImpl<>(tickets);
        when(ticketRepository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
            anyString(), anyString(), any(Pageable.class))).thenReturn(ticketPage);

        ResponseEntity<Page<TicketResponse>> response = ticketService.getAllTickets(
            PageRequest.of(0, 10), "Test");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(ticketRepository, times(1)).findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
            "Test", "Test", PageRequest.of(0, 10));
    }

    @Test
    void testDeleteTicket_WhenExists_ShouldDeletePermanently() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));
        ticketService.deleteTicket(1L);

        verify(ticketRepository, times(1)).findById(1L);
        verify(ticketRepository, times(1)).delete((Ticket) testTicket);
        verify(ticketRepository, never()).save(any());
    }

    @Test
    void testDeleteTicket_WhenNotExists_ShouldDoNothing() {
        when(ticketRepository.findById(999L)).thenReturn(Optional.empty());
        ticketService.deleteTicket(999L);

        verify(ticketRepository, times(1)).findById(999L);
        verify(ticketRepository, never()).save(any());
        verify(ticketRepository, never()).delete((Ticket) any());
    }

    @Test
    void testAssignTicket_WithValidData_ShouldAssignUser() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(UserEntity.builder()
                .id(2)
                .email("jane@example.com")
                .build()));

        ticketService.assignTicket(1L, new AssignRequest("jane@example.com"));

        verify(ticketRepository, times(1)).findById(1L);
        verify(userRepository, times(1)).findByEmail("jane@example.com");
        verify(ticketRepository, times(1)).save(testTicket);
        assertNotNull(testTicket.getAssignedTo());
    }

    @Test
    void testAssignTicket_WithEmptyEmail_ShouldRemoveAssignment() {
        testTicket.setAssignedTo(testUser);
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));

        ticketService.assignTicket(1L, new AssignRequest(""));

        verify(ticketRepository, times(1)).save(testTicket);
        assertNull(testTicket.getAssignedTo());
    }

    @Test
    void testUpdateTicket_WithValidData_ShouldUpdateTicket() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));
        
        TicketRequest updateRequest = TicketRequest.builder()
                .title("Updated Title")
                .description("Updated Description")
                 .status(Status.EnCours)
                .priority(Priority.Critical)
                .category("Feature")
                .build();

        ResponseEntity<TicketResponse> response = ticketService.updateTicket(updateRequest, 1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Updated Title", response.getBody().getTitle());
        assertEquals(Priority.Critical, response.getBody().getPriority());
    }

    @Test
    void testUpdateTicket_WhenNotExists_ShouldReturnNotFound() {
        when(ticketRepository.findById(999L)).thenReturn(Optional.empty());
        
        TicketRequest updateRequest = TicketRequest.builder()
                .title("Updated Title")
                .build();

        ResponseEntity<TicketResponse> response = ticketService.updateTicket(updateRequest, 999L);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void testUpdateTicketPartial_WithStatusChange_ShouldUpdateAndNotify() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));
        
        TicketUpdateRequest updateRequest = TicketUpdateRequest.builder()
                 .status(Status.Terminé)
                .build();

        ResponseEntity<TicketResponse> response = ticketService.updateTicketPartial(1L, updateRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
         assertEquals(Status.Terminé, response.getBody().getStatus());
        verify(notificationService, times(1)).createNotification(
            eq(NotificationType.TICKET_STATUS_CHANGED), anyString(), anyString(), any(), any(), anyLong()
        );
    }

    @Test
    void testGetTicketByProjectId_WhenExists_ShouldReturnTicket() {
        when(ticketRepository.findByProjectIdAndId(1L, 1L)).thenReturn(Optional.of(testTicket));

        ResponseEntity<TicketResponse> response = ticketService.getTicketByProjectId(1L, 1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    void testGetAllTicketByProjectId_WithoutSearch_ShouldReturnProjectTickets() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(testTicket);
        when(ticketRepository.findAllByProjectId(1L)).thenReturn(tickets);

        ResponseEntity<Page<TicketResponse>> response = ticketService.getAllTicketByProjectId(
            1L, PageRequest.of(0, 10), null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getContent().size());
    }

    @Test
    void testGetTicketsByUserEmail_WithValidEmail_ShouldReturnUserTickets() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(testTicket);
        when(ticketRepository.findByCreatedByEmailOrAssignedToEmail("john.doe@example.com", "john.doe@example.com"))
            .thenReturn(tickets);

        ResponseEntity<Page<TicketResponse>> response = ticketService.getTicketsByUserEmail(
            "john.doe@example.com", PageRequest.of(0, 10), null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    void testGetTicketsForUser_WhenAdmin_ShouldReturnAllTickets() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(testTicket);
        when(ticketRepository.findAll()).thenReturn(tickets);

        ResponseEntity<Page<TicketResponse>> response = ticketService.getTicketsForUser(
            "admin@example.com", "ADMIN", null, PageRequest.of(0, 10), null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    void testGetTicketsForUser_WhenRegularUser_ShouldReturnOwnTickets() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(testTicket);
        when(ticketRepository.findByCreatedByEmailOrAssignedToEmail("user@example.com", "user@example.com"))
            .thenReturn(tickets);

        ResponseEntity<Page<TicketResponse>> response = ticketService.getTicketsForUser(
            "user@example.com", "USER", null, PageRequest.of(0, 10), null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }
}