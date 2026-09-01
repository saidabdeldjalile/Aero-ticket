package com.suryakn.IssueTracker.controller;

import com.suryakn.IssueTracker.entity.Department;
import com.suryakn.IssueTracker.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/departments")
public class DepartmentController {
    private final DepartmentService departmentService;

    @GetMapping
    public ResponseEntity<Page<Department>> getAllDepartments(
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String search) {
        return departmentService.getAllDepartments(pageable, search);
    }

    @GetMapping("{id}")
    public ResponseEntity<Department> getDepartment(@PathVariable Long id) {
        return departmentService.getDepartment(id);
    }

    @PostMapping
    public ResponseEntity<Department> createDepartment(@Valid @RequestBody Department department) {
        return departmentService.createDepartment(department);
    }

    @PutMapping("{id}")
    public ResponseEntity<Department> updateDepartment(@PathVariable Long id, @Valid @RequestBody Department department) {
        return departmentService.updateDepartment(id, department);
    }

    @DeleteMapping("{id}")
    public void deleteDepartment(@PathVariable Long id) {
        departmentService.deleteDepartment(id);
    }
}
