package com.suryakn.IssueTracker.repository;

import com.suryakn.IssueTracker.entity.VectorTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;

public interface VectorTableRepository extends JpaRepository<VectorTable, Long> {

    List<VectorTable> findAllByProjectId(Long projectId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteByTicketId(Long id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteByProjectId(Long projectId);
}
