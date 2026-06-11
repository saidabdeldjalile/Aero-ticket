package com.suryakn.IssueTracker.entity;

import java.io.Serializable;
import java.util.Objects;

public class CategoryIssueTypeId implements Serializable {
    private Long categoryId;
    private String issueType;

    public CategoryIssueTypeId() {}

    public CategoryIssueTypeId(Long categoryId, String issueType) {
        this.categoryId = categoryId;
        this.issueType = issueType;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CategoryIssueTypeId that)) return false;
        return Objects.equals(categoryId, that.categoryId) && Objects.equals(issueType, that.issueType);
    }

    @Override
    public int hashCode() {
        return Objects.hash(categoryId, issueType);
    }
}