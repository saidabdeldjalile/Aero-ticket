package com.suryakn.IssueTracker.duplicate;

import com.suryakn.IssueTracker.entity.VectorTable;
import com.suryakn.IssueTracker.repository.VectorTableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Service for detecting duplicate tickets using the Python duplicate detection service.
 * Includes proper error handling and null safety.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DuplicateTicketService {

    private static final double SIMILARITY_THRESHOLD = 0.76;
    private static final int MAX_SIMILAR_TICKETS = 10;

    private final VectorTableRepository ticketRepository;
    private final RestTemplate restTemplate;

    @Value("${duplicateservice.url}")
    private String duplicateServiceUrl;

    /**
     * Process a ticket to find potential duplicates.
     *
     * @param duplicateTicketRequest the ticket request containing title, description, and project ID
     * @return PythonResponse containing similar ticket IDs and the vector, or null if service unavailable
     */
    public PythonResponse processTicketEmbedding(DuplicateTicketRequest duplicateTicketRequest) {
        // Validate input
        if (duplicateTicketRequest == null) {
            log.warn("DuplicateTicketRequest is null, returning empty response");
            return createEmptyResponse();
        }

        if (duplicateTicketRequest.getTitle() == null || duplicateTicketRequest.getTitle().isBlank()) {
            log.warn("Ticket title is null or blank for request: {}", duplicateTicketRequest);
            return createEmptyResponse();
        }

        if (duplicateTicketRequest.getDescription() == null) {
            duplicateTicketRequest.setDescription("");
        }

        try {
            String text = duplicateTicketRequest.getTitle() + " " + duplicateTicketRequest.getDescription();

            List<VectorTable> ticketList = ticketRepository.findAll();

            // Handle null ticket list
            if (ticketList == null) {
                ticketList = Collections.emptyList();
            }

            List<TicketEmbeddingDTO> ticketEmbeddingDTOS = new ArrayList<>();
            for (VectorTable ticket : ticketList) {
                if (ticket == null || (duplicateTicketRequest.getTicketId() != null && duplicateTicketRequest.getTicketId().equals(ticket.getTicketId()))) {
                    continue;
                }
                // Create DTO and validate it
                TicketEmbeddingDTO dto = TicketEmbeddingDTO.builder()
                        .ticketId(ticket.getTicketId())
                        .vector(ticket.getVector())
                        .build();
                
                // Only add tickets with valid DTOs
                if (dto.isValid()) {
                    ticketEmbeddingDTOS.add(dto);
                } else {
                    log.debug("Skipping ticket {} due to invalid embedding data", ticket.getTicketId());
                }
            }

            log.debug("Prepared {} ticket embeddings for duplicate detection", ticketEmbeddingDTOS.size());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            PythonDTO pythonDTO = PythonDTO.builder()
                    .text(text)
                    .ticketEmbeddingDTOS(ticketEmbeddingDTOS)
                    .build();

            HttpEntity<PythonDTO> request = new HttpEntity<>(pythonDTO, headers);

            String url = duplicateServiceUrl + "/process_ticket";
            log.debug("Calling duplicate service at: {}", url);

            PythonResponse response = restTemplate.postForObject(url, request, PythonResponse.class);

            if (response == null) {
                log.warn("Duplicate service returned null response");
                return createEmptyResponse();
            }

            log.info("Duplicate detection completed. Found {} similar tickets",
                    response.getSimilar_ticket_ids() != null ? response.getSimilar_ticket_ids().size() : 0);

            return response;

        } catch (RestClientException e) {
            log.error("Failed to connect to duplicate detection service: {}", e.getMessage());
            return createEmptyResponse();
        } catch (IllegalArgumentException e) {
            log.error("Invalid argument when calling duplicate detection service: {}", e.getMessage());
            return createEmptyResponse();
        } catch (Exception e) {
            log.error("Unexpected error in duplicate ticket processing: {}", e.getMessage(), e);
            return createEmptyResponse();
        }
    }

    /**
     * Creates an empty response for error cases.
     */
    private PythonResponse createEmptyResponse() {
        return PythonResponse.builder()
                .similar_ticket_ids(Collections.emptyList())
                .vector(null)
                .build();
    }
}
