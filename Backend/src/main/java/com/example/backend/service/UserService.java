package com.example.backend.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(User user) {
        return registerWithRole(user, "USER");
    }

    public User registerAdmin(User user) {
        return registerWithRole(user, "ADMIN");
    }

    private User registerWithRole(User user, String defaultRole) {
        Optional<User> existingUser = userRepository.findByEmail(user.getEmail());
        if (existingUser.isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));

        if (user.getProvider() == null || user.getProvider().isBlank()) {
            user.setProvider("LOCAL");
        }

        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole(defaultRole);
        } else {
            user.setRole(user.getRole().toUpperCase());
        }

        // Initialize skills with default values
        if (user.getSkills() == null || user.getSkills().isBlank()) {
            user.setSkills("");
        }
        if (user.getJobTitle() == null) {
            user.setJobTitle("");
        }
        if (user.getExperience() == null) {
            user.setExperience(0);
        }

        User savedUser = userRepository.save(user);
        return sanitizeUser(savedUser);
    }

    public User login(String email, String password) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Email and password are required");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        return sanitizeUser(user);
    }

    /**
     * Find user by email
     */
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * Update user profile (skills, job title, experience)
     */
    public User updateUser(User user) {
        User existingUser = userRepository.findByEmail(user.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getSkills() != null) {
            existingUser.setSkills(user.getSkills());
        }
        if (user.getJobTitle() != null) {
            existingUser.setJobTitle(user.getJobTitle());
        }
        if (user.getExperience() != null) {
            existingUser.setExperience(user.getExperience());
        }

        User updatedUser = userRepository.save(existingUser);
        return sanitizeUser(updatedUser);
    }

    private User sanitizeUser(User user) {
        User safeUser = new User();
        safeUser.setId(user.getId());
        safeUser.setName(user.getName());
        safeUser.setEmail(user.getEmail());
        safeUser.setProvider(user.getProvider());
        safeUser.setRole(user.getRole());
        safeUser.setSkills(user.getSkills());
        safeUser.setJobTitle(user.getJobTitle());
        safeUser.setExperience(user.getExperience());
        safeUser.setPassword(null);
        return safeUser;
    }
}