package com.suryakn.IssueTracker.controller;

import com.suryakn.IssueTracker.dto.IssueTypeDTO;
import com.suryakn.IssueTracker.service.IssueTypeDefService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/issue-types")
public class IssueTypeDefController {

    private final IssueTypeDefService issueTypeDefService;

    @GetMapping
    public ResponseEntity<List<IssueTypeDTO>> getAll() {
        return issueTypeDefService.getAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<IssueTypeDTO> getById(@PathVariable Long id) {
        return issueTypeDefService.getById(id);
    }

    @PostMapping
    public ResponseEntity<IssueTypeDTO> create(@RequestBody IssueTypeDTO dto) {
        return issueTypeDefService.create(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<IssueTypeDTO> update(@PathVariable Long id, @RequestBody IssueTypeDTO dto) {
        return issueTypeDefService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return issueTypeDefService.delete(id);
    }
}