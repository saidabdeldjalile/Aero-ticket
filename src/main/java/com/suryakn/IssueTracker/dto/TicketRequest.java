package com.suryakn.IssueTracker.dto;

import com.suryakn.IssueTracker.entity.IssueType;
import com.suryakn.IssueTracker.entity.Priority;
import com.suryakn.IssueTracker.entity.Status;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketRequest {
    @NotBlank(message = "Title is required")
    @Size(min = 1, max = 200, message = "Title must be between 1 and 200 characters")
    private String title;

    @NotBlank(message = "Description is required")
    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    private Status status;

    private Priority priority;

    @Size(max = 100, message = "Category must not exceed 100 characters")
    private String category;

    @Email(message = "Reporter email must be valid")
    private String reporter;

    @Email(message = "Assignee email must be valid")
    private String assignee;

    private IssueType issueType;

    private Long project;

    private List<String> tags;

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public void setPriority(String priorityStr) {
        if (priorityStr == null || priorityStr.isEmpty()) {
            this.priority = null;
        } else {
            try {
                this.priority = Priority.valueOf(priorityStr);
            } catch (IllegalArgumentException e) {
                this.priority = null;
            }
        }
    }
}
