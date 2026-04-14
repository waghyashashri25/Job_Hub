package com.example.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private String provider;

    @Column(nullable = false)
    private String role;

    /**
     * User skills stored as comma-separated string
     * Example: "Java, Spring Boot, React, MySQL"
     */
    @Column(columnDefinition = "TEXT")
    private String skills = "";

    /**
     * Job title or role
     * Example: "Full Stack Developer"
     */
    private String jobTitle = "";

    /**
     * Years of experience
     */
    private Integer experience = 0;
}