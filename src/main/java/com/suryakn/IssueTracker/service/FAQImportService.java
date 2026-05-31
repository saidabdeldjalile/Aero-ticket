package com.suryakn.IssueTracker.service;

import com.suryakn.IssueTracker.entity.FAQ;
import com.suryakn.IssueTracker.entity.Ticket;
import com.suryakn.IssueTracker.entity.Status;
import com.suryakn.IssueTracker.repository.FAQRepository;
import com.suryakn.IssueTracker.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FAQImportService {

    private final FAQRepository faqRepository;
    private final TicketRepository ticketRepository;

    @Transactional
    public int importSolutionsFromTickets() {
        log.info("Starting FAQ import from existing tickets...");
        
        List<Ticket> allTickets = ticketRepository.findAll();
        List<FAQ> existingFAQs = faqRepository.findByActiveTrue();
        
        int imported = 0;
        
         for (Ticket ticket : allTickets) {
            if (ticket.getStatus() != Status.Terminé) {
                 continue;
             }
            
            if (ticket.getTitle() == null || ticket.getTitle().isEmpty()) {
                continue;
            }
            
            // Skip if FAQ already exists
            String titlePreview = ticket.getTitle().substring(0, Math.min(20, ticket.getTitle().length())).toLowerCase();
            boolean exists = existingFAQs.stream()
                .anyMatch(faq -> faq.getQuestion() != null && 
                    faq.getQuestion().toLowerCase().contains(titlePreview));
            
            if (exists) continue;
            
            // Extract solution from description
            String solution = extractSolution(ticket);
            
            FAQ faq = FAQ.builder()
                .question(ticket.getTitle())
                .answer(solution)
                .category(ticket.getCategory() != null ? ticket.getCategory().toLowerCase() : "autres")
                .active(true)
                .build();
            
            faqRepository.save(faq);
            imported++;
            log.info("Imported FAQ from ticket #{} - {}", ticket.getId(), ticket.getTitle());
        }
        
        log.info("FAQ import completed. Total imported: {}", imported);
        return imported;
    }
    
    private String extractSolution(Ticket ticket) {
        if (ticket.getDescription() != null && ticket.getDescription().length() > 20) {
            String desc = ticket.getDescription();
            if (desc.length() > 500) desc = desc.substring(0, 500);
            return "Statut: " + ticket.getStatus() + "\n\nDescription: " + desc;
        }
        return "Statut: " + ticket.getStatus();
    }
    
     public int getResolvedTicketsCount() {
         return (int) ticketRepository.findAll().stream()
             .filter(t -> t.getStatus() == Status.Terminé)
             .count();
     }
    
    public int getFAQCount() {
        return faqRepository.findByActiveTrue().size();
    }
}