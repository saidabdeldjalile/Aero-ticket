package com.suryakn.IssueTracker.repository;

import com.suryakn.IssueTracker.entity.CommentScreenshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentScreenshotRepository extends JpaRepository<CommentScreenshot, Long> {
    List<CommentScreenshot> findByCommentId(Long commentId);
    List<CommentScreenshot> findByCommentIdIn(List<Long> commentIds);
    
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteByCommentIdIn(List<Long> commentIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM CommentScreenshot cs WHERE cs.comment.id IN (SELECT c.id FROM Comment c WHERE c.ticket.id = :ticketId)")
    void deleteByTicketId(@Param("ticketId") Long ticketId);
}
