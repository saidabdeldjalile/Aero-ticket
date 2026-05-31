package com.suryakn.IssueTracker.repository;

import com.suryakn.IssueTracker.entity.Priority;
import com.suryakn.IssueTracker.entity.Status;
import com.suryakn.IssueTracker.entity.Ticket;
import com.suryakn.IssueTracker.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {
    List<Ticket> findAllByProjectId(Long pid);

    Optional<Ticket> findByProjectIdAndId(Long pid, Long tid);

    // Find tickets created by a specific user
    List<Ticket> findByCreatedByEmail(String email);

    // Find tickets created by a specific user (by UserEntity)
    List<Ticket> findByCreatedBy(UserEntity user);

    // Find tickets assigned to a specific user
    List<Ticket> findByAssignedToEmail(String email);

    // Find tickets where user is either creator or assignee
    List<Ticket> findByCreatedByEmailOrAssignedToEmail(String createdByEmail, String assignedToEmail);

    // Find tickets by project department ID (via project)
    List<Ticket> findByProjectDepartmentId(Long departmentId);

    // Find tickets created by or assigned to users in a specific department
    List<Ticket> findByCreatedByDepartmentIdOrAssignedToDepartmentId(Long createdByDepartmentId, Long assignedToDepartmentId);

    // Find all tickets excluding deleted ones
    List<Ticket> findByStatusNot(com.suryakn.IssueTracker.entity.Status status);

    // Count tickets by status
    long countByStatus(Status status);

    // Search methods
    Page<Ticket> findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
        String title, String description, Pageable pageable);
    
    Page<Ticket> findByProjectIdAndTitleContainingIgnoreCase(
        Long projectId, String title, Pageable pageable);

    // Find tickets by ID in list (for bulk actions)
    List<Ticket> findByIdIn(List<Long> ids);

    // Delete tickets by ID in list (for bulk delete)
    @Modifying
    @Query("UPDATE Ticket t SET t.status = :status WHERE t.id IN :ids")
    void updateStatusByIdIn(@Param("ids") List<Long> ids, @Param("status") Status status);

    // Hard delete - permanently delete tickets
    void deleteByIdIn(List<Long> ids);

    // Assign tickets by ID in list (for bulk assign)
    @Modifying
    @Query("UPDATE Ticket t SET t.assignedTo = (SELECT u FROM UserEntity u WHERE u.email = :email) WHERE t.id IN :ids")
    void assignByIdIn(@Param("ids") List<Long> ids, @Param("email") String email);

    // Advanced filter methods
    Page<Ticket> findByStatusIn(List<Status> statuses, Pageable pageable);
    
    Page<Ticket> findByPriorityIn(List<Priority> priorities, Pageable pageable);
    
    Page<Ticket> findByStatusInAndPriorityIn(
        List<Status> statuses, List<Priority> priorities, Pageable pageable);
    
    Page<Ticket> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
    
    Page<Ticket> findByStatusInAndCreatedAtBetween(
        List<Status> statuses, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
    
    Page<Ticket> findByProjectDepartmentIdAndStatusIn(
        Long departmentId, List<Status> statuses, Pageable pageable);
    
    Page<Ticket> findByProjectDepartmentIdAndPriorityIn(
        Long departmentId, List<Priority> priorities, Pageable pageable);
    
    Page<Ticket> findByProjectDepartmentIdAndStatusInAndPriorityIn(
        Long departmentId, List<Status> statuses, List<Priority> priorities, Pageable pageable);
    
    Page<Ticket> findByProjectIdAndStatusIn(
        Long projectId, List<Status> statuses, Pageable pageable);
    
    Page<Ticket> findByProjectIdAndPriorityIn(
        Long projectId, List<Priority> priorities, Pageable pageable);
    
    Page<Ticket> findByProjectIdAndStatusInAndPriorityIn(
        Long projectId, List<Status> statuses, List<Priority> priorities, Pageable pageable);

    // Find tickets without a project (for admin orientation)
    List<Ticket> findByProjectIsNull();
}
