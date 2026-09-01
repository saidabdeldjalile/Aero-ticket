package com.suryakn.IssueTracker;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import org.springframework.beans.factory.annotation.Autowired;
import com.suryakn.IssueTracker.entity.*;
import com.suryakn.IssueTracker.repository.*;
import com.suryakn.IssueTracker.service.TicketService;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class IssueTrackerApplicationTests {

	@Autowired
	private TicketRepository ticketRepository;

	@Autowired
	private CommentRepository commentRepository;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private ProjectRepository projectRepository;

	@Autowired
	private DepartmentRepository departmentRepository;

	@Autowired
	private TicketService ticketService;

	@Test
	void contextLoads() {
	}

	@Test
	void testDeleteTicketWithComments() {
		// Clean up database if needed or create unique entities
		Department dept = departmentRepository.save(Department.builder().name("Test Delete Dept").build());
		Project proj = projectRepository.save(Project.builder().name("Test Delete Proj").department(dept).build());
		UserEntity user = userRepository.save(UserEntity.builder()
				.firstName("Test")
				.lastName("User")
				.email("test.delete@example.com")
				.password("pass")
				.role(Role.USER)
				.registrationNumber("REG12345")
				.department(dept)
				.build());

		Ticket ticket = ticketRepository.save(Ticket.builder()
				.title("Ticket to delete")
				.description("Desc")
				.status(Status.Nouveau)
				.priority(Priority.Low)
				.createdBy(user)
				.project(proj)
				.build());

		Comment comment = commentRepository.save(Comment.builder()
				.comment("Comment on ticket")
				.ticket(ticket)
				.createdBy(user)
				.build());

		// Ensure saved
		assertNotNull(ticket.getId());
		assertNotNull(comment.getId());

		// Execute deletion
		assertDoesNotThrow(() -> {
			ticketService.deleteTicket(ticket.getId());
		});

		// Verify deletion
		assertFalse(ticketRepository.findById(ticket.getId()).isPresent());
		assertFalse(commentRepository.findById(comment.getId()).isPresent());
	}

}
