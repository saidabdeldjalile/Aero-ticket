package com.suryakn.IssueTracker.dto;

import com.suryakn.IssueTracker.entity.IssueType;
import com.suryakn.IssueTracker.entity.Priority;
import com.suryakn.IssueTracker.entity.Status;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketUpdateRequest {
    @Size(min = 1, max = 200, message = "Title must be between 1 and 200 characters")
    private String title;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    private Status status;
    private Priority priority;

    @Size(max = 100, message = "Category must not exceed 100 characters")
    private String category;

    private IssueType issueType;

    @Email(message = "Assignee email must be valid")
    private String assignee;

    private String modifierEmail;
    private String modifierRole;
    private Long projectId;
}
