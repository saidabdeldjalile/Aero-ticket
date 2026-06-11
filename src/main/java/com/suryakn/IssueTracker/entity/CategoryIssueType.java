package com.suryakn.IssueTracker.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "category_issue_type")
@IdClass(CategoryIssueTypeId.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryIssueType {
    @Id
    @Column(name = "category_id")
    private Long categoryId;

    @Id
    @Column(name = "issue_type")
    private String issueType;
}