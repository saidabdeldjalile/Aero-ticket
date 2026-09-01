package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.dto.ProjectDto;
import com.suryakn.IssueTracker.dto.ProjectRequest;
import com.suryakn.IssueTracker.entity.Department;
import com.suryakn.IssueTracker.entity.NotificationType;
import com.suryakn.IssueTracker.entity.Project;
import com.suryakn.IssueTracker.repository.DepartmentRepository;
import com.suryakn.IssueTracker.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final DepartmentRepository departmentRepository;
    private final NotificationService notificationService;

    public ResponseEntity<Page<ProjectDto>> getAllProjects(Pageable pageable, String search) {
        Page<Project> projectPage;
        if (search != null && !search.isBlank()) {
            projectPage = projectRepository.findByNameContainingIgnoreCase(search, pageable);
        } else {
            projectPage = projectRepository.findAll(pageable);
        }
        List<ProjectDto> projectDtoList = new ArrayList<>();
        for (Project project : projectPage.getContent()) {
            projectDtoList.add(new ProjectDto(project));
        }
        return ResponseEntity.ok(new PageImpl<>(projectDtoList, pageable, projectPage.getTotalElements()));
    }

    public ResponseEntity<Page<ProjectDto>> getProjectsByDepartmentId(Long departmentId, Pageable pageable, String search) {
        List<Project> projectList;
        long totalElements;
        
        if (search != null && !search.isBlank()) {
            // Use the search method from repository
            Page<Project> searchPage = projectRepository.findByDepartmentIdAndNameContainingIgnoreCase(departmentId, search, pageable);
            List<ProjectDto> projectDtoList = new ArrayList<>();
            for (Project project : searchPage.getContent()) {
                projectDtoList.add(new ProjectDto(project));
            }
            return ResponseEntity.ok(new PageImpl<>(projectDtoList, pageable, searchPage.getTotalElements()));
        } else {
            projectList = projectRepository.findByDepartmentId(departmentId);
            totalElements = projectList.size();
        }
        
        // Apply pagination manually since we're working with a list
        int start = (int) Math.min(pageable.getOffset(), projectList.size());
        int end = Math.min((start + pageable.getPageSize()), projectList.size());
        List<Project> paginatedProjects;
        if (start >= projectList.size()) {
            paginatedProjects = new ArrayList<>();
        } else {
            paginatedProjects = projectList.subList(start, end);
        }
        
        List<ProjectDto> projectDtoList = new ArrayList<>();
        for (Project project : paginatedProjects) {
            projectDtoList.add(new ProjectDto(project));
        }
        return ResponseEntity.ok(new PageImpl<>(projectDtoList, pageable, totalElements));
    }

    public ResponseEntity<Project> createProject(ProjectRequest projectRequest) {
        if (projectRequest.getName() != null && projectRepository.existsByNameIgnoreCase(projectRequest.getName())) {
            log.warn("Project with name '{}' already exists", projectRequest.getName());
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        Department department = null;
        if (projectRequest.getDepartmentId() != null) {
            department = departmentRepository.findById(projectRequest.getDepartmentId()).orElse(null);
        }
        Project project = Project.builder()
                .name(projectRequest.getName())
                .department(department)
                .build();
        Project savedProject = projectRepository.save(project);
        
        // Notify all users in the department about the new project
        if (department != null) {
            notificationService.notifyDepartmentUsers(
                NotificationType.PROJECT_CREATED,
                "Nouveau projet ajouté",
                "Le projet '" + savedProject.getName() + "' a été ajouté au département " + department.getName(),
                department,
                savedProject.getId()
            );
            log.info("Notifications sent to department {} for new project {}", department.getName(), savedProject.getName());
        }
        
        return ResponseEntity.ok(savedProject);
    }

    public ResponseEntity<ProjectDto> getProject(Long pid) {
        return ResponseEntity.ok(new ProjectDto(projectRepository.findById(pid).orElseThrow()));
    }

    @Transactional
    public ResponseEntity<ProjectDto> updateProject(Long pid, ProjectRequest projectRequest) {
        var optProject = projectRepository.findById(pid);
        if (optProject.isEmpty()) {
            log.warn("Project with id {} not found", pid);
            return ResponseEntity.notFound().build();
        }

        Project project = optProject.get();
        
        // Check if new name would create a duplicate (only if name is changing)
        if (projectRequest.getName() != null && !projectRequest.getName().equalsIgnoreCase(project.getName()) && 
            projectRepository.existsByNameIgnoreCase(projectRequest.getName())) {
            log.warn("Project with name '{}' already exists", projectRequest.getName());
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        // Update project name
        if (projectRequest.getName() != null) {
            project.setName(projectRequest.getName());
        }

        // Update department if provided
        if (projectRequest.getDepartmentId() != null) {
            Department department = departmentRepository.findById(projectRequest.getDepartmentId()).orElse(null);
            project.setDepartment(department);
        }

        Project updatedProject = projectRepository.save(project);
        log.info("Project '{}' (id={}) updated", updatedProject.getName(), pid);
        
        return ResponseEntity.ok(new ProjectDto(updatedProject));
    }

    public void deleteProject(Long pid) {
        Project project = projectRepository.findById(pid).orElse(null);
        Department department = project != null ? project.getDepartment() : null;
        
        projectRepository.deleteById(pid);
        
        // Notify all users in the department about the deleted project
        if (department != null) {
            notificationService.notifyDepartmentUsers(
                NotificationType.PROJECT_DELETED,
                "Projet supprimé",
                "Le projet '" + (project != null ? project.getName() : "") + "' a été supprimé du département " + department.getName(),
                department,
                pid
            );
            log.info("Notifications sent to department {} for deleted project {}", department.getName(), pid);
        }
    }
}
