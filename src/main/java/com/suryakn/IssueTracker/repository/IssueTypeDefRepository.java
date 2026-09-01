package com.suryakn.IssueTracker.repository;

import com.suryakn.IssueTracker.entity.IssueTypeDef;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IssueTypeDefRepository extends JpaRepository<IssueTypeDef, Long> {
    Optional<IssueTypeDef> findByName(String name);
    boolean existsByName(String name);
    boolean existsByNameIgnoreCase(String name);
}