package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.dto.IssueTypeDTO;
import com.suryakn.IssueTracker.entity.IssueTypeDef;
import com.suryakn.IssueTracker.repository.IssueTypeDefRepository;
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
public class IssueTypeDefService {

    private final IssueTypeDefRepository issueTypeDefRepository;

    public ResponseEntity<List<IssueTypeDTO>> getAll() {
        List<IssueTypeDTO> dtos = issueTypeDefRepository.findAll().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    public ResponseEntity<IssueTypeDTO> getById(Long id) {
        return issueTypeDefRepository.findById(id)
            .map(type -> ResponseEntity.ok(toDTO(type)))
            .orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    public ResponseEntity<IssueTypeDTO> create(IssueTypeDTO dto) {
        if (issueTypeDefRepository.existsByNameIgnoreCase(dto.getName())) {
            log.warn("IssueType with name '{}' already exists (case-insensitive)", dto.getName());
            return ResponseEntity.badRequest().build();
        }
        IssueTypeDef entity = IssueTypeDef.builder()
            .name(dto.getName())
            .label(dto.getLabel())
            .description(dto.getDescription())
            .active(dto.isActive())
            .build();
        entity = issueTypeDefRepository.save(entity);
        log.info("IssueType '{}' (id={}) created", entity.getName(), entity.getId());
        return new ResponseEntity<>(toDTO(entity), HttpStatus.CREATED);
    }

    @Transactional
    public ResponseEntity<IssueTypeDTO> update(Long id, IssueTypeDTO dto) {
        return issueTypeDefRepository.findById(id)
            .map(entity -> {
                if (dto.getName() != null && !dto.getName().equalsIgnoreCase(entity.getName()) && issueTypeDefRepository.existsByNameIgnoreCase(dto.getName())) {
                    log.warn("IssueType with name '{}' already exists", dto.getName());
                    return ResponseEntity.badRequest().<IssueTypeDTO>build();
                }
                entity.setName(dto.getName());
                entity.setLabel(dto.getLabel());
                entity.setDescription(dto.getDescription());
                entity.setActive(dto.isActive());
                issueTypeDefRepository.save(entity);
                log.info("IssueType '{}' (id={}) updated", entity.getName(), id);
                return ResponseEntity.ok(toDTO(entity));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    public ResponseEntity<Void> delete(Long id) {
        if (!issueTypeDefRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        issueTypeDefRepository.deleteById(id);
        log.info("IssueType id={} deleted", id);
        return ResponseEntity.noContent().build();
    }

    private IssueTypeDTO toDTO(IssueTypeDef entity) {
        return IssueTypeDTO.builder()
            .id(entity.getId())
            .name(entity.getName())
            .label(entity.getLabel())
            .description(entity.getDescription())
            .active(entity.isActive())
            .build();
    }
}