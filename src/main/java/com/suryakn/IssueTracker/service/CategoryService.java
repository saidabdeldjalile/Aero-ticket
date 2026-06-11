package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.dto.CategoryDTO;
import com.suryakn.IssueTracker.dto.CategoryRequest;
import com.suryakn.IssueTracker.entity.Category;
import com.suryakn.IssueTracker.entity.CategoryIssueType;
import com.suryakn.IssueTracker.repository.CategoryIssueTypeRepository;
import com.suryakn.IssueTracker.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryIssueTypeRepository categoryIssueTypeRepository;

    public ResponseEntity<List<CategoryDTO>> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        List<CategoryDTO> dtos = categories.stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    public ResponseEntity<CategoryDTO> getCategoryById(Long id) {
        return categoryRepository.findById(id)
            .map(cat -> ResponseEntity.ok(toDTO(cat)))
            .orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    public ResponseEntity<CategoryDTO> createCategory(CategoryRequest request) {
        // Validate name uniqueness
        if (categoryRepository.existsByName(request.getName())) {
            return ResponseEntity.badRequest().build();
        }

        // Create category
        Category category = Category.builder()
            .name(request.getName())
            .label(request.getLabel())
            .description(request.getDescription())
            .active(request.isActive())
            .build();
        category = categoryRepository.save(category);

        // Save issue type relations
        saveIssueTypesForCategory(category.getId(), request.getAllowedIssueTypes());

        log.info("Category '{}' created with id: {}", request.getName(), category.getId());
        return new ResponseEntity<>(toDTO(category), HttpStatus.CREATED);
    }

    @Transactional
    public ResponseEntity<CategoryDTO> updateCategory(Long id, CategoryRequest request) {
        var optCat = categoryRepository.findById(id);
        if (optCat.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Category category = optCat.get();
        category.setName(request.getName());
        category.setLabel(request.getLabel());
        category.setDescription(request.getDescription());
        category.setActive(request.isActive());
        categoryRepository.save(category);

        // Replace issue type relations
        categoryIssueTypeRepository.deleteByCategoryId(id);
        saveIssueTypesForCategory(id, request.getAllowedIssueTypes());

        log.info("Category '{}' (id={}) updated", request.getName(), id);
        return ResponseEntity.ok(toDTO(category));
    }

    @Transactional
    public ResponseEntity<Void> deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        // Delete issue type relations first
        categoryIssueTypeRepository.deleteByCategoryId(id);
        categoryRepository.deleteById(id);
        log.info("Category id={} deleted", id);
        return ResponseEntity.noContent().build();
    }

    public ResponseEntity<List<String>> getIssueTypesByCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        List<String> types = categoryIssueTypeRepository.findRawIssueTypesByCategoryId(id);
        return ResponseEntity.ok(types);
    }

    private void saveIssueTypesForCategory(Long categoryId, List<String> issueTypes) {
        if (issueTypes == null || issueTypes.isEmpty()) {
            return;
        }
        List<CategoryIssueType> relations = issueTypes.stream()
            .map(type -> CategoryIssueType.builder()
                .categoryId(categoryId)
                .issueType(type)
                .build())
            .collect(Collectors.toList());
        categoryIssueTypeRepository.saveAll(relations);
    }

    private CategoryDTO toDTO(Category category) {
        List<String> allowedIssueTypes = categoryIssueTypeRepository.findRawIssueTypesByCategoryId(category.getId());
        return CategoryDTO.builder()
            .id(category.getId())
            .name(category.getName())
            .label(category.getLabel())
            .description(category.getDescription())
            .active(category.isActive())
            .allowedIssueTypes(allowedIssueTypes)
            .build();
    }
}