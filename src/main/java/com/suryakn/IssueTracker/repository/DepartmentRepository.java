package com.suryakn.IssueTracker.repository;

import com.suryakn.IssueTracker.entity.Department;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {
    Optional<Department> findByName(String name);
    
    boolean existsByNameIgnoreCase(String name);
    
    // Search methods
    Page<Department> findByNameContainingIgnoreCase(String name, Pageable pageable);
}

