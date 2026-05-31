package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.dto.CommentDto;
import com.suryakn.IssueTracker.entity.*;
import com.suryakn.IssueTracker.repository.CommentRepository;
import com.suryakn.IssueTracker.repository.CommentScreenshotRepository;
import com.suryakn.IssueTracker.repository.TicketRepository;
import com.suryakn.IssueTracker.repository.UserRepository;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private CommentScreenshotRepository commentScreenshotRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private CommentService commentService;

    private Ticket testTicket;
    private Comment testComment;
    private UserEntity testUser;
    private UserEntity testSupportUser;
    private UserEntity testAdminUser;
    private Department testDepartment;
    private Project testProject;

    @BeforeEach
    void setUp() {
        testDepartment = Department.builder()
                .id(1L)
                .name("IT Department")
                .build();

        testProject = Project.builder()
                .id(1L)
                .name("Test Project")
                .department(testDepartment)
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

        testSupportUser = UserEntity.builder()
                .id(2)
                .firstName("Jane")
                .lastName("Support")
                .email("jane.support@example.com")
                .password("password123")
                .role(Role.SUPPORT)
                .department(testDepartment)
                .build();

        testAdminUser = UserEntity.builder()
                .id(3)
                .firstName("Admin")
                .lastName("User")
                .email("admin@example.com")
                .password("password123")
                .role(Role.ADMIN)
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

        testComment = Comment.builder()
                .id(1L)
                .comment("Test comment")
                .ticket(testTicket)
                .createdBy(testUser)
                .build();
    }

    @Test
    void testAddComment_WithValidData_ShouldReturnCreatedComment() {
        CommentDto commentDto = CommentDto.builder()
                .comment("New comment")
                .email(testUser.getEmail())
                .build();

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(commentRepository.save(any(Comment.class))).thenReturn(testComment);

        ResponseEntity<CommentDto> response = commentService.addComment(1L, commentDto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(commentRepository, times(1)).save(any(Comment.class));
    }

    @Test
    void testAddComment_WhenTicketNotFound_ShouldReturnNotFound() {
        CommentDto commentDto = CommentDto.builder()
                .comment("New comment")
                .email(testUser.getEmail())
                .build();

        when(ticketRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseEntity<CommentDto> response = commentService.addComment(1L, commentDto);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(commentRepository, never()).save(any());
    }

    @Test
    void testAddComment_WhenUserNotFound_ShouldThrowException() {
        CommentDto commentDto = CommentDto.builder()
                .comment("New comment")
                .email("unknown@example.com")
                .build();

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThrows(Exception.class, () -> commentService.addComment(1L, commentDto));
    }

    @Test
    void testAddComment_WhenSupportUser_ShouldNotifyAdminsAndReporter() {
        testTicket.setAssignedTo(testSupportUser);

        CommentDto commentDto = CommentDto.builder()
                .comment("Support response")
                .email(testSupportUser.getEmail())
                .build();

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));
        when(userRepository.findByEmail(testSupportUser.getEmail())).thenReturn(Optional.of(testSupportUser));
        when(commentRepository.save(any(Comment.class))).thenReturn(testComment);
        when(userRepository.findAllByRoleAndDepartment(Role.ADMIN, testDepartment)).thenReturn(List.of(testAdminUser));

        ResponseEntity<CommentDto> response = commentService.addComment(1L, commentDto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(notificationService, times(1)).createNotification(
            eq(NotificationType.COMMENT_ADDED), anyString(), anyString(), eq(testAdminUser), eq(testDepartment), eq(1L)
        );
    }

    @Test
    void testAddComment_WhenSupportUser_ShouldNotSelfNotify() {
        testTicket.setAssignedTo(testSupportUser);

        CommentDto commentDto = CommentDto.builder()
                .comment("Support response")
                .email(testSupportUser.getEmail())
                .build();

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));
        when(userRepository.findByEmail(testSupportUser.getEmail())).thenReturn(Optional.of(testSupportUser));
        when(commentRepository.save(any(Comment.class))).thenReturn(testComment);
        when(userRepository.findAllByRoleAndDepartment(Role.ADMIN, testDepartment)).thenReturn(List.of(testSupportUser));

        ResponseEntity<CommentDto> response = commentService.addComment(1L, commentDto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        // Should not notify if admin is the same as commenter
        verify(notificationService, never()).createNotification(
            eq(NotificationType.COMMENT_ADDED), anyString(), anyString(), eq(testSupportUser), eq(testDepartment), eq(1L)
        );
    }

    @Test
    void testAddComment_WhenUserComment_ShouldNotifyAssignedSupport() {
        testTicket.setAssignedTo(testSupportUser);

        CommentDto commentDto = CommentDto.builder()
                .comment("User question")
                .email(testUser.getEmail())
                .build();

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(commentRepository.save(any(Comment.class))).thenReturn(testComment);

        ResponseEntity<CommentDto> response = commentService.addComment(1L, commentDto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(notificationService, times(1)).createNotification(
            eq(NotificationType.COMMENT_ADDED), anyString(), anyString(), eq(testSupportUser), eq(testDepartment), eq(1L)
        );
    }

    @Test
    void testAddComment_WhenUserComment_NoAssignedSupport_ShouldNotNotify() {
        CommentDto commentDto = CommentDto.builder()
                .comment("User question")
                .email(testUser.getEmail())
                .build();

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(commentRepository.save(any(Comment.class))).thenReturn(testComment);

        ResponseEntity<CommentDto> response = commentService.addComment(1L, commentDto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(notificationService, never()).createNotification(
            any(), anyString(), anyString(), any(), any(), anyLong()
        );
    }

    @Test
    void testGetAllComments_WhenTicketExists_ShouldReturnComments() {
        List<Comment> comments = new ArrayList<>();
        comments.add(testComment);

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(testTicket));
        when(commentRepository.findByTicket_Id(1L)).thenReturn(comments);

        ResponseEntity<List<CommentDto>> response = commentService.getAllComments(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void testGetAllComments_WhenTicketNotFound_ShouldReturnNotFound() {
        when(ticketRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseEntity<List<CommentDto>> response = commentService.getAllComments(1L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(commentRepository, never()).findByTicket_Id(anyLong());
    }

    @Test
    void testDeleteComment_WhenAuthor_ShouldDeleteComment() {
        when(commentRepository.findById(1L)).thenReturn(Optional.of(testComment));
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(commentScreenshotRepository.findByCommentId(1L)).thenReturn(List.of());

        ResponseEntity<String> response = commentService.deleteComment(1L, testUser.getEmail());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Comment deleted successfully", response.getBody());
        verify(commentRepository, times(1)).delete(testComment);
    }

    @Test
    void testDeleteComment_WhenAdmin_ShouldDeleteComment() {
        when(commentRepository.findById(1L)).thenReturn(Optional.of(testComment));
        when(userRepository.findByEmail(testAdminUser.getEmail())).thenReturn(Optional.of(testAdminUser));
        when(commentScreenshotRepository.findByCommentId(1L)).thenReturn(List.of());

        ResponseEntity<String> response = commentService.deleteComment(1L, testAdminUser.getEmail());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Comment deleted successfully", response.getBody());
        verify(commentRepository, times(1)).delete(testComment);
    }

    @Test
    void testDeleteComment_WhenSupport_ShouldDeleteComment() {
        when(commentRepository.findById(1L)).thenReturn(Optional.of(testComment));
        when(userRepository.findByEmail(testSupportUser.getEmail())).thenReturn(Optional.of(testSupportUser));
        when(commentScreenshotRepository.findByCommentId(1L)).thenReturn(List.of());

        ResponseEntity<String> response = commentService.deleteComment(1L, testSupportUser.getEmail());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Comment deleted successfully", response.getBody());
        verify(commentRepository, times(1)).delete(testComment);
    }

    @Test
    void testDeleteComment_WhenOtherUser_ShouldReturnForbidden() {
        when(commentRepository.findById(1L)).thenReturn(Optional.of(testComment));
        String otherEmail = "other.user@example.com";
        UserEntity otherUser = UserEntity.builder()
                .id(4)
                .firstName("Other")
                .lastName("User")
                .email(otherEmail)
                .password("password123")
                .role(Role.USER)
                .department(testDepartment)
                .build();
        when(userRepository.findByEmail(otherEmail)).thenReturn(Optional.of(otherUser));

        ResponseEntity<String> response = commentService.deleteComment(1L, otherEmail);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(commentRepository, never()).delete((Comment) any());
    }

    @Test
    void testDeleteComment_WhenNotExists_ShouldReturnNotFound() {
        when(commentRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseEntity<String> response = commentService.deleteComment(1L, testUser.getEmail());

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("Comment not found", response.getBody());
        verify(commentRepository, never()).delete((Comment) any());
    }

    @Test
    void testCommentList_ShouldConvertCommentsToDtos() {
        List<Comment> comments = new ArrayList<>();
        comments.add(testComment);

        List<CommentDto> result = commentService.commentList(comments);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(testComment.getComment(), result.get(0).getComment());
        assertEquals(testUser.getEmail(), result.get(0).getEmail());
        assertEquals(testUser.getFirstName() + " " + testUser.getLastName(), result.get(0).getUsername());
    }

    @Test
    void testCommentList_WithEmptyList_ShouldReturnEmptyList() {
        List<Comment> comments = new ArrayList<>();

        List<CommentDto> result = commentService.commentList(comments);

        assertNotNull(result);
        assertEquals(0, result.size());
    }
}