package com.suryakn.IssueTracker.repository;

import com.suryakn.IssueTracker.entity.Notification;
import com.suryakn.IssueTracker.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    List<Notification> findByUserOrderByCreatedAtDesc(UserEntity user);
    
    List<Notification> findByUserAndIsReadFalse(UserEntity user);
    
    List<Notification> findByUserIdOrderByCreatedAtDesc(Integer userId);
    
    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Integer userId);
    
    Long countByUserIdAndIsReadFalse(Integer userId);

    @Modifying
    void deleteByUserIdIn(List<Integer> userIds);

    @Modifying
    void deleteByDepartmentId(Long departmentId);
}

