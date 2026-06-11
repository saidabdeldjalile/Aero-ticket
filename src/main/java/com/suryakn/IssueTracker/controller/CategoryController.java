package com.suryakn.IssueTracker.controller;

import com.suryakn.IssueTracker.dto.CategoryDTO;
import com.suryakn.IssueTracker.dto.CategoryRequest;
import com.suryakn.IssueTracker.entity.IssueType;
import com.suryakn.IssueTracker.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/categories")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<List<CategoryDTO>> getAllCategories() {
        return categoryService.getAllCategories();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoryDTO> getCategoryById(@PathVariable Long id) {
        return categoryService.getCategoryById(id);
    }

    @PostMapping
    public ResponseEntity<CategoryDTO> createCategory(@RequestBody CategoryRequest request) {
        return categoryService.createCategory(request);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryDTO> updateCategory(@PathVariable Long id, @RequestBody CategoryRequest request) {
        return categoryService.updateCategory(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        return categoryService.deleteCategory(id);
    }

    @GetMapping("/{id}/issue-types")
    public ResponseEntity<List<String>> getIssueTypesByCategory(@PathVariable Long id) {
        return categoryService.getIssueTypesByCategory(id);
    }

    /**
     * Returns all available IssueType enum values for the frontend to use.
     */
    @GetMapping("/available-issue-types")
    public ResponseEntity<List<Map<String, String>>> getAvailableIssueTypes() {
        List<Map<String, String>> types = Arrays.stream(IssueType.values())
            .map(type -> Map.of(
                "name", type.name(),
                "label", type.name() // Could be enhanced with i18n later
            ))
            .collect(Collectors.toList());
        return ResponseEntity.ok(types);
    }
}