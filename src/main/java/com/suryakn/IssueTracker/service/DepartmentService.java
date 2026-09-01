package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.entity.Comment;
import com.suryakn.IssueTracker.entity.Department;
import com.suryakn.IssueTracker.entity.Ticket;
import com.suryakn.IssueTracker.entity.UserEntity;
import com.suryakn.IssueTracker.repository.CommentRepository;
import com.suryakn.IssueTracker.repository.CommentScreenshotRepository;
import com.suryakn.IssueTracker.repository.DepartmentRepository;
import com.suryakn.IssueTracker.repository.NotificationRepository;
import com.suryakn.IssueTracker.repository.ProjectRepository;
import com.suryakn.IssueTracker.repository.ScreenshotRepository;
import com.suryakn.IssueTracker.repository.TicketRepository;
import com.suryakn.IssueTracker.repository.UserRepository;
import com.suryakn.IssueTracker.repository.VectorTableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final ProjectRepository projectRepository;
    private final TicketRepository ticketRepository;
    private final VectorTableRepository vectorTableRepository;
    private final CommentRepository commentRepository;
    private final CommentScreenshotRepository commentScreenshotRepository;
    private final ScreenshotRepository screenshotRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ResponseEntity<Page<Department>> getAllDepartments(Pageable pageable, String search) {
        try {
            Page<Department> departmentPage;
            if (search != null && !search.isBlank()) {
                departmentPage = departmentRepository.findByNameContainingIgnoreCase(search, pageable);
            } else {
                departmentPage = departmentRepository.findAll(pageable);
            }
            return ResponseEntity.ok(departmentPage);
        } catch (Exception e) {
            log.error("Error fetching all departments: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Department> getDepartment(Long id) {
        try {
            return departmentRepository.findById(id)
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> {
                        log.warn("Department not found with id: {}", id);
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
                    });
        } catch (Exception e) {
            log.error("Error fetching department with id {}: ", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Transactional
    public ResponseEntity<Department> createDepartment(Department department) {
        try {
            if (department.getName() != null && departmentRepository.existsByNameIgnoreCase(department.getName())) {
                log.warn("Department with name '{}' already exists", department.getName());
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            return ResponseEntity.ok(departmentRepository.save(department));
        } catch (Exception e) {
            log.error("Error creating department: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Transactional
    public ResponseEntity<Department> updateDepartment(Long id, Department updatedDepartment) {
        try {
            var optDept = departmentRepository.findById(id);
            if (optDept.isEmpty()) {
                log.warn("Department with id {} not found", id);
                return ResponseEntity.notFound().build();
            }

            Department department = optDept.get();

            // Check if new name would create a duplicate (only if name is changing)
            if (updatedDepartment.getName() != null
                    && !updatedDepartment.getName().equalsIgnoreCase(department.getName())
                    && departmentRepository.existsByNameIgnoreCase(updatedDepartment.getName())) {
                log.warn("Department with name '{}' already exists", updatedDepartment.getName());
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }

            if (updatedDepartment.getName() != null) {
                department.setName(updatedDepartment.getName());
            }
            if (updatedDepartment.getDescription() != null) {
                department.setDescription(updatedDepartment.getDescription());
            }

            Department savedDepartment = departmentRepository.save(department);
            log.info("Department '{}' (id={}) updated", savedDepartment.getName(), id);
            return ResponseEntity.ok(savedDepartment);
        } catch (Exception e) {
            log.error("Error updating department with id {}: ", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Deletes a department and ALL its children in FK-safe order:
     *  1. CommentScreenshots  (child of Comment)
     *  2. Screenshots         (child of Ticket)
     *  3. Comments            (child of Ticket)
     *  4. VectorTable entries (child of Ticket / Project)
     *  5. Tickets             (child of Project)
     *  6. Projects            (child of Department)
     *  7. Notifications       (linked to Department / Users)
     *  8. Users               (members of Department)
     *  9. Department          (root)
     */
    @Transactional
    public void deleteDepartment(Long id) {
        try {
            var optDept = departmentRepository.findById(id);
            if (optDept.isEmpty()) {
                log.warn("Department with id {} not found", id);
                return;
            }
            Department department = optDept.get();

            // ── Step 1: collect all tickets from every project of this department ──
            List<Ticket> allTickets = new ArrayList<>();
            for (var project : department.getProjects()) {
                allTickets.addAll(project.getTickets());
            }

            // ── Step 2: delete comment screenshots, screenshots, comments, vectors ──
            for (Ticket ticket : allTickets) {
                Long ticketId = ticket.getId();

                List<Long> commentIds = commentRepository.findByTicket_Id(ticketId)
                        .stream().map(Comment::getId).collect(Collectors.toList());

                if (!commentIds.isEmpty()) {
                    commentScreenshotRepository.deleteByCommentIdIn(commentIds);
                }
                screenshotRepository.deleteByTicketId(ticketId);
                commentRepository.deleteByTicketId(ticketId);
                vectorTableRepository.deleteByTicketId(ticketId);
                log.debug("Cleaned up children of ticket {}", ticketId);
            }

            // ── Step 3: delete all tickets ──
            if (!allTickets.isEmpty()) {
                ticketRepository.deleteAll(allTickets);
                log.info("Deleted {} ticket(s) from department '{}'", allTickets.size(), department.getName());
            }

            // ── Step 4: delete vector entries keyed by project ──
            for (var project : department.getProjects()) {
                vectorTableRepository.deleteByProjectId(project.getId());
            }

            // ── Step 5: delete all projects ──
            int projectCount = department.getProjects().size();
            projectRepository.deleteAll(department.getProjects());
            log.info("Deleted {} project(s) from department '{}'", projectCount, department.getName());

            // ── Step 6: collect users of this department ──
            List<UserEntity> departmentUsers = userRepository.findAll().stream()
                    .filter(u -> u.getDepartment() != null && u.getDepartment().getId().equals(id))
                    .collect(Collectors.toList());
            List<Integer> userIds = departmentUsers.stream()
                    .map(UserEntity::getId)
                    .collect(Collectors.toList());

            // ── Step 7: delete notifications (by department and by user) ──
            notificationRepository.deleteByDepartmentId(id);
            if (!userIds.isEmpty()) {
                notificationRepository.deleteByUserIdIn(userIds);
            }
            log.info("Cleaned up notifications for department '{}' and {} user(s)",
                    department.getName(), userIds.size());

            // ── Step 8: delete users ──
            if (!departmentUsers.isEmpty()) {
                userRepository.deleteAll(departmentUsers);
                log.info("Deleted {} user(s) from department '{}'", departmentUsers.size(), department.getName());
            }

            // ── Step 9: delete the department itself ──
            departmentRepository.deleteById(id);
            log.info("Department '{}' (id={}) fully deleted — {} project(s), {} ticket(s), {} user(s)",
                    department.getName(), id, projectCount, allTickets.size(), departmentUsers.size());

        } catch (Exception e) {
            log.error("Error deleting department with id {}: ", id, e);
            throw new RuntimeException("Failed to delete department", e);
        }
    }
}
