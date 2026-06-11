package com.suryakn.IssueTracker.auth.dtos;

import com.suryakn.IssueTracker.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthenticationResponse {
    private String token;
    private Role role;
    private Long departmentId;
    private String firstName;
    private String lastName;
}