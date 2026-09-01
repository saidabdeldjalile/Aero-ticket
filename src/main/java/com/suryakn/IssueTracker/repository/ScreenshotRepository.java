package com.suryakn.IssueTracker.repository;

import com.suryakn.IssueTracker.entity.Screenshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScreenshotRepository extends JpaRepository<Screenshot, Long> {
    List<Screenshot> findByTicketId(Long ticketId);
    
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteByTicketId(Long ticketId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Screenshot s WHERE s.ticket.id = :ticketId")
    void deleteByTicketIdNative(@Param("ticketId") Long ticketId);
}
