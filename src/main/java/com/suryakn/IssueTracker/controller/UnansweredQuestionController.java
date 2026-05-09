package com.suryakn.IssueTracker.controller;

import com.suryakn.IssueTracker.dto.UnansweredQuestionDto;
import com.suryakn.IssueTracker.entity.UnansweredQuestion;
import com.suryakn.IssueTracker.service.UnansweredQuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/unanswered-questions")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"})
public class UnansweredQuestionController {

    private final UnansweredQuestionService unansweredQuestionService;

    @GetMapping("/pending")
    public ResponseEntity<List<UnansweredQuestion>> getPendingQuestions() {
        return ResponseEntity.ok(unansweredQuestionService.getPendingQuestions());
    }

    @GetMapping("/pending/paged")
    public ResponseEntity<Page<UnansweredQuestion>> getPendingQuestionsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(unansweredQuestionService.getPendingQuestions(PageRequest.of(page, size)));
    }

    @GetMapping("/pending/count")
    public ResponseEntity<Long> getPendingCount() {
        return ResponseEntity.ok(unansweredQuestionService.getPendingCount());
    }


    @PostMapping
    public ResponseEntity<UnansweredQuestion> createQuestion(
            @Valid @RequestBody UnansweredQuestionDto dto) {
        log.info("Creating unanswered question: {}", dto.getQuestion());
        UnansweredQuestion saved = unansweredQuestionService.saveQuestion(
                dto.getQuestion(),
                dto.getContext(),
                dto.getUserEmail(),
                dto.getSuggestedCategory(),
                dto.getSuggestedDepartment(),
                dto.getRelatedTicketId()
        );
        if (saved == null) {
            // Question already exists
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/add-to-faq")
    public ResponseEntity<UnansweredQuestion> addToFaq(
            @PathVariable Long id,
            @Valid @RequestBody UnansweredQuestionDto dto) {
        return unansweredQuestionService.addToFaq(id, dto.getAnswer(), dto.getCategory(), dto.getKeywords())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<UnansweredQuestion> rejectQuestion(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) UnansweredQuestionDto dto) {
        String reason = dto != null ? dto.getRejectionReason() : "Rejeté par admin";
        return unansweredQuestionService.rejectQuestion(id, reason)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/mark-reviewed")
    public ResponseEntity<Void> markAsReviewed(@PathVariable Long id) {
        unansweredQuestionService.markAsReviewed(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Long id) {
        unansweredQuestionService.deleteQuestion(id);
        return ResponseEntity.ok().build();
    }
}