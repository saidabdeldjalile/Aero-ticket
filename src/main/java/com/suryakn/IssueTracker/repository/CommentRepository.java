package com.suryakn.IssueTracker.repository;

import com.suryakn.IssueTracker.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByTicket_Id(Long ticket_id);

    void deleteAllByTicket_Id(Long ticket_id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Comment c WHERE c.ticket.id = :ticketId")
    void deleteByTicketId(@Param("ticketId") Long ticketId);
}
