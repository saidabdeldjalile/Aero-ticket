package com.suryakn.IssueTracker.auth;

import com.suryakn.IssueTracker.auth.dtos.AuthenticateRequest;
import com.suryakn.IssueTracker.auth.dtos.AuthenticationResponse;
import com.suryakn.IssueTracker.auth.dtos.RegisterRequest;
import com.suryakn.IssueTracker.config.JwtService;
import com.suryakn.IssueTracker.entity.Role;
import com.suryakn.IssueTracker.entity.UserEntity;
import com.suryakn.IssueTracker.repository.DepartmentRepository;
import com.suryakn.IssueTracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthenticateServiceTest {

    @Mock
    private UserRepository repository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private PasswordEncoder encoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthenticateService authenticateService;

    private UserEntity testUser;

    @BeforeEach
    void setUp() {
        testUser = UserEntity.builder()
                .id(1)
                .firstName("John")
                .lastName("Doe")
                .email("john.doe@example.com")
                .password("encodedPassword")
                .role(Role.USER)
                .registrationNumber("UNKNOWN-0001")
                .build();
    }

    @Test
    void testRegister_WithValidData_ShouldReturnToken() {
        RegisterRequest request = RegisterRequest.builder()
                .firstName("Jane")
                .lastName("Smith")
                .email("jane.smith@example.com")
                .password("password123")
                .role("USER")
                .build();

        when(repository.findAllByEmail(request.getEmail())).thenReturn(new ArrayList<>());
        when(repository.existsByRegistrationNumber(anyString())).thenReturn(false);
        when(encoder.encode(request.getPassword())).thenReturn("encodedPassword");
        when(jwtService.generateToken(any(UserEntity.class))).thenReturn("jwtToken123");

        AuthenticationResponse response = authenticateService.register(request);

        assertNotNull(response);
        assertEquals("jwtToken123", response.getToken());
        verify(repository, times(1)).save(any(UserEntity.class));
    }

    @Test
    void testRegister_WithDuplicateEmail_ShouldThrowException() {
        RegisterRequest request = RegisterRequest.builder()
                .firstName("Jane")
                .lastName("Smith")
                .email("john.doe@example.com")
                .password("password123")
                .role("USER")
                .build();

        when(repository.findAllByEmail(request.getEmail())).thenReturn(List.of(testUser));

        assertThrows(IllegalStateException.class, () -> authenticateService.register(request));
        verify(repository, never()).save(any());
    }

    @Test
    void testAuthenticate_WithValidCredentials_ShouldReturnToken() {
        AuthenticateRequest request = AuthenticateRequest.builder()
                .email("john.doe@example.com")
                .password("password123")
                .build();

        when(repository.findAllByEmail(request.getEmail())).thenReturn(List.of(testUser));
        when(encoder.matches(request.getPassword(), testUser.getPassword())).thenReturn(true);
        when(jwtService.generateToken(testUser)).thenReturn("jwtToken123");

        AuthenticationResponse response = authenticateService.authenticate(request);

        assertNotNull(response);
        assertEquals("jwtToken123", response.getToken());
        assertEquals(Role.USER, response.getRole());
    }

    @Test
    void testAuthenticate_WithNonExistentEmail_ShouldThrowException() {
        AuthenticateRequest request = AuthenticateRequest.builder()
                .email("unknown@example.com")
                .password("password123")
                .build();

        when(repository.findAllByEmail(request.getEmail())).thenReturn(new ArrayList<>());

        assertThrows(BadCredentialsException.class, () -> authenticateService.authenticate(request));
    }

    @Test
    void testAuthenticate_WithWrongPassword_ShouldThrowException() {
        AuthenticateRequest request = AuthenticateRequest.builder()
                .email("john.doe@example.com")
                .password("wrongPassword")
                .build();

        when(repository.findAllByEmail(request.getEmail())).thenReturn(List.of(testUser));
        when(encoder.matches(request.getPassword(), testUser.getPassword())).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> authenticateService.authenticate(request));
    }

    @Test
    void testAuthenticate_WithMultipleUsersSameEmail_ShouldThrowException() {
        AuthenticateRequest request = AuthenticateRequest.builder()
                .email("john.doe@example.com")
                .password("password123")
                .build();

        when(repository.findAllByEmail(request.getEmail())).thenReturn(List.of(testUser, testUser));

        assertThrows(BadCredentialsException.class, () -> authenticateService.authenticate(request));
    }

    @Test
    void testAuthenticate_WithDepartment_ShouldReturnDepartmentId() {
        com.suryakn.IssueTracker.entity.Department department = com.suryakn.IssueTracker.entity.Department.builder()
                .id(1L)
                .name("IT")
                .build();
        testUser.setDepartment(department);

        AuthenticateRequest request = AuthenticateRequest.builder()
                .email("john.doe@example.com")
                .password("password123")
                .build();

        when(repository.findAllByEmail(request.getEmail())).thenReturn(List.of(testUser));
        when(encoder.matches(request.getPassword(), testUser.getPassword())).thenReturn(true);
        when(jwtService.generateToken(testUser)).thenReturn("jwtToken123");

        AuthenticationResponse response = authenticateService.authenticate(request);

        assertNotNull(response);
        assertEquals("jwtToken123", response.getToken());
        assertEquals(1L, response.getDepartmentId());
    }
}