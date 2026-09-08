package com.example.backend.repository;

import com.example.backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByApplicationIdOrderBySentAtAsc(Long applicationId);
    List<ChatMessage> findByApplicationIdOrderBySentAtDesc(Long applicationId);
    List<ChatMessage> findByApplicationIdInOrderBySentAtAsc(List<Long> applicationIds);
    List<ChatMessage> findByApplicationIdInOrderBySentAtDesc(List<Long> applicationIds);
    long countByApplicationId(Long applicationId);
    long countByApplicationIdAndSenderRoleAndReadByRecruiter(Long applicationId, String senderRole, Boolean readByRecruiter);
}
