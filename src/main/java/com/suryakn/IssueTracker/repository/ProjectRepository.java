package com.suryakn.IssueTracker.repository;

import com.suryakn.IssueTracker.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByDepartmentId(Long departmentId);
    
    // Search methods
    Page<Project> findByNameContainingIgnoreCase(String name, Pageable pageable);
    Page<Project> findByDepartmentIdAndNameContainingIgnoreCase(Long departmentId, String name, Pageable pageable);

    boolean existsByNameIgnoreCase(String name);
}

