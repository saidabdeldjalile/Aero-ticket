package com.suryakn.IssueTracker.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "issue_type_def")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueTypeDef {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 255)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "active")
    @Builder.Default
    private boolean active = true;
}