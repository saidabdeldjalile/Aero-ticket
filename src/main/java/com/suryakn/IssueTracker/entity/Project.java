package com.suryakn.IssueTracker.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.lang.NonNull;

import java.util.ArrayList;
import java.util.List;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class Project {

    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    private Long id;
    
    @NonNull
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    @JsonIgnoreProperties({"projects", "users"})
    private Department department;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @JsonIgnoreProperties({"project", "assignedTo", "createdBy", "comments"})
    private List<Ticket> tickets = new ArrayList<>();

    public Project(String name) {
        this.name = name;
    }
}
