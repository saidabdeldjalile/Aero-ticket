package com.suryakn.IssueTracker.repository;

import com.suryakn.IssueTracker.dto.UserProjection;
import com.suryakn.IssueTracker.entity.Department;
import com.suryakn.IssueTracker.entity.Role;
import com.suryakn.IssueTracker.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Integer> {
    List<UserEntity> findAllByEmail(String email);
    
    Optional<UserEntity> findByEmail(String email);
    
    boolean existsByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);

    boolean existsByRegistrationNumber(String registrationNumber);
    
    Optional<UserEntity> findByRegistrationNumber(String registrationNumber);

    List<UserProjection> findAllBy();

    List<UserEntity> findByDepartmentAndRole(Department department, Role role);
    
    List<UserEntity> findAllByRoleAndDepartment(Role role, Department department);
}
