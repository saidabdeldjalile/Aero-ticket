package com.suryakn.IssueTracker.controller;

import com.suryakn.IssueTracker.dto.ProjectDto;
import com.suryakn.IssueTracker.dto.ProjectRequest;
import com.suryakn.IssueTracker.dto.TicketResponse;
import com.suryakn.IssueTracker.entity.Project;
import com.suryakn.IssueTracker.entity.Role;
import com.suryakn.IssueTracker.entity.UserEntity;
import com.suryakn.IssueTracker.service.ProjectService;
import com.suryakn.IssueTracker.service.TicketService;
import com.suryakn.IssueTracker.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/projects")
public class ProjectController {
    private final ProjectService projectService;
    private final TicketService ticketService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<ProjectDto>> getALlProject(
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String search) {
        // Get current user from security context
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserEntity) {
            UserEntity currentUser = (UserEntity) authentication.getPrincipal();
            String userRole = currentUser.getRole().name();
            Long userDepartmentId = currentUser.getDepartment() != null ? currentUser.getDepartment().getId() : null;
            
            // If user is ADMIN, filter projects by their department
            if ("ADMIN".equals(userRole) && userDepartmentId != null) {
                return projectService.getProjectsByDepartmentId(userDepartmentId, pageable, search);
            }
        }
        return projectService.getAllProjects(pageable, search);
    }

    @GetMapping("by-department/{departmentId}")
    public ResponseEntity<Page<ProjectDto>> getProjectsByDepartment(
            @PathVariable Long departmentId,
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String search) {
        return projectService.getProjectsByDepartmentId(departmentId, pageable, search);
    }

    @GetMapping("{pid}")
    public ResponseEntity<ProjectDto> getProject(@PathVariable Long pid) {
        return projectService.getProject(pid);
    }

    @DeleteMapping("{pid}")
    public void deleteProject(@PathVariable Long pid) {
        projectService.deleteProject(pid);
    }

    @PostMapping
    public ResponseEntity<Project> createNewProject(@Valid @RequestBody ProjectRequest projectRequest) {
        return projectService.createProject(projectRequest);
    }

    @PutMapping("{pid}")
    public ResponseEntity<ProjectDto> updateProject(@PathVariable Long pid, @Valid @RequestBody ProjectRequest projectRequest) {
        return projectService.updateProject(pid, projectRequest);
    }

    @GetMapping("{pid}/tickets")
    public ResponseEntity<Page<TicketResponse>> ticketsWithProjectId(
            @PathVariable Long pid,
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String search) {
        // Get current user from security context
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserEntity) {
            UserEntity currentUser = (UserEntity) authentication.getPrincipal();
            String userEmail = currentUser.getEmail();
            String userRole = currentUser.getRole().name();
            Long userDepartmentId = currentUser.getDepartment() != null ? currentUser.getDepartment().getId() : null;
            
            // Use the new method that filters tickets based on user role
            return ticketService.getAllTicketByProjectIdForUser(pid, userEmail, userRole, userDepartmentId, pageable, search);
        } else {
            // Fallback to original method if user not authenticated
            return ticketService.getAllTicketByProjectId(pid, pageable, search);
        }
    }

    @GetMapping("{pid}/tickets/{tid}")
    public ResponseEntity<TicketResponse> ticketsWithProjectId(@PathVariable Long pid, @PathVariable Long tid) {
        return ticketService.getTicketByProjectId(pid, tid);
    }
}
