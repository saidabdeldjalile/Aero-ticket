package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.dto.CreateUserRequest;
import com.suryakn.IssueTracker.dto.UserProjection;
import com.suryakn.IssueTracker.dto.UserUpdateRequest;
import com.suryakn.IssueTracker.entity.Department;
import com.suryakn.IssueTracker.entity.Role;
import com.suryakn.IssueTracker.entity.Ticket;
import com.suryakn.IssueTracker.entity.UserEntity;
import com.suryakn.IssueTracker.repository.DepartmentRepository;
import com.suryakn.IssueTracker.repository.TicketRepository;
import com.suryakn.IssueTracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final TicketRepository ticketRepository;
    private final PasswordEncoder passwordEncoder;

    public ResponseEntity<List<UserProjection>> getAllUsers() {
        List<UserEntity> userList = userRepository.findAll();
        List<UserProjection> userProjectionList = new ArrayList<>();
        for (UserEntity userEntity : userList) {
            userProjectionList.add(new UserProjection(userEntity));
        }
        return ResponseEntity.ok(userProjectionList);
    }

    public ResponseEntity<UserProjection> getUserById(Integer id) {
        Optional<UserEntity> userOptional = userRepository.findById(id);
        if (userOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(new UserProjection(userOptional.get()));
    }

    public ResponseEntity<UserProjection> getUserByEmail(String email) {
        Optional<UserEntity> userOptional = userRepository.findByEmail(email);
        if (userOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(new UserProjection(userOptional.get()));
    }

    public ResponseEntity<UserProjection> createUser(CreateUserRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            log.warn("User with email '{}' already exists (case-insensitive)", request.getEmail());
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        if (request.getRegistrationNumber() != null && !request.getRegistrationNumber().isEmpty()) {
            if (userRepository.existsByRegistrationNumber(request.getRegistrationNumber())) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
        }

        UserEntity user = UserEntity.builder()
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))
            .role(Role.valueOf(request.getRole()))
            .registrationNumber(request.getRegistrationNumber())
            .build();

        if (request.getDepartmentId() != null) {
            Optional<Department> department = departmentRepository.findById(request.getDepartmentId());
            department.ifPresent(user::setDepartment);
        }

        UserEntity savedUser = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(new UserProjection(savedUser));
    }

    public ResponseEntity<UserProjection> updateUser(Integer id, CreateUserRequest request) {
        Optional<UserEntity> userOptional = userRepository.findById(id);
        
        if (userOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        UserEntity existingUser = userOptional.get();
        if (!existingUser.getEmail().equalsIgnoreCase(request.getEmail()) && userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        
        if (request.getRegistrationNumber() != null && !request.getRegistrationNumber().equals(existingUser.getRegistrationNumber())) {
            if (userRepository.existsByRegistrationNumber(request.getRegistrationNumber())) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
        }
        
        existingUser.setFirstName(request.getFirstName());
        existingUser.setLastName(request.getLastName());
        existingUser.setEmail(request.getEmail());
        existingUser.setRegistrationNumber(request.getRegistrationNumber());
        
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            existingUser.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        
        if (request.getRole() != null && !request.getRole().isEmpty()) {
            existingUser.setRole(Role.valueOf(request.getRole()));
        }
        
        if (request.getDepartmentId() != null) {
            Optional<Department> department = departmentRepository.findById(request.getDepartmentId());
            existingUser.setDepartment(department.orElse(null));
        }
        
        UserEntity updatedUser = userRepository.save(existingUser);
        return ResponseEntity.ok(new UserProjection(updatedUser));
    }

    @Transactional
    public ResponseEntity<Void> deleteUser(Integer id) {
        Optional<UserEntity> userOptional = userRepository.findById(id);
        if (userOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        UserEntity user = userOptional.get();
        
        // Clear tickets created by this user
        List<Ticket> createdTickets = ticketRepository.findByCreatedByEmail(user.getEmail());
        for (Ticket ticket : createdTickets) {
            ticket.setCreatedBy(null);
            ticketRepository.save(ticket);
        }
        
        // Clear tickets assigned to this user
        List<Ticket> assignedTickets = ticketRepository.findByAssignedToEmail(user.getEmail());
        for (Ticket ticket : assignedTickets) {
            ticket.setAssignedTo(null);
            ticketRepository.save(ticket);
        }
        
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    public ResponseEntity<UserProjection> updateUserProfile(UserUpdateRequest request) {
        Optional<UserEntity> userOptional = userRepository.findByEmail(request.getEmail());
        
        if (userOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        UserEntity user = userOptional.get();
        
        if (request.getFirstName() != null && !request.getFirstName().isEmpty()) {
            user.setFirstName(request.getFirstName());
        }
        
        if (request.getLastName() != null && !request.getLastName().isEmpty()) {
            user.setLastName(request.getLastName());
        }
        
        // Validate current password if attempting to change password
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            if (request.getCurrentPassword() == null || request.getCurrentPassword().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        
        if (request.getRegistrationNumber() != null) {
            // Check if the new registrationNumber already exists for another user
            if (userRepository.existsByRegistrationNumber(request.getRegistrationNumber())) {
                Optional<UserEntity> existingUser = userRepository.findByRegistrationNumber(request.getRegistrationNumber());
                if (existingUser.isPresent() && !existingUser.get().getId().equals(user.getId())) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).build();
                }
            }
            user.setRegistrationNumber(request.getRegistrationNumber());
        }
        
        UserEntity updatedUser = userRepository.save(user);
        return ResponseEntity.ok(new UserProjection(updatedUser));
    }
}
