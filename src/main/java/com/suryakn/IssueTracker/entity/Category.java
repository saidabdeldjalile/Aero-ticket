package com.suryakn.IssueTracker.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Entity
@Table(name = "category")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "active")
    @Builder.Default
    private boolean active = true;

    @ElementCollection(targetClass = IssueType.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "category_issue_type", joinColumns = @JoinColumn(name = "category_id"))
    @Column(name = "issue_type", length = 50)
    private Set<IssueType> allowedIssueTypes;
}