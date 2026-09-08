package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "application_messages")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "sender_email", nullable = false)
    private String senderEmail;

    @Column(name = "sender_name", nullable = false)
    private String senderName;

    @Column(name = "sender_role", nullable = false)
    private String senderRole; // RECRUITER, ADMIN, USER

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(name = "read_by_recruiter")
    @Builder.Default
    private Boolean readByRecruiter = false;

    @PrePersist
    public void prePersist() {
        if (this.sentAt == null) {
            this.sentAt = LocalDateTime.now();
        }
        if (this.readByRecruiter == null) {
            this.readByRecruiter = "RECRUITER".equalsIgnoreCase(this.senderRole) || "ADMIN".equalsIgnoreCase(this.senderRole);
        }
    }
}
