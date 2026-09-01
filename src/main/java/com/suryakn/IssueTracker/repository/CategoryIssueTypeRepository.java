package com.suryakn.IssueTracker.repository;

import com.suryakn.IssueTracker.entity.CategoryIssueType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface CategoryIssueTypeRepository extends JpaRepository<CategoryIssueType, Long> {
    @Query(value = "SELECT issue_type FROM category_issue_type WHERE category_id = :categoryId", nativeQuery = true)
    List<String> findRawIssueTypesByCategoryId(@Param("categoryId") Long categoryId);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM category_issue_type WHERE category_id = :categoryId", nativeQuery = true)
    void deleteByCategoryId(@Param("categoryId") Long categoryId);

    boolean existsByCategoryIdAndIssueType(Long categoryId, String issueType);
}
