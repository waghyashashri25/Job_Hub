package com.example.backend.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;

import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    // Minimum 8 characters, at least 1 number, at least 1 special symbol
    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
            "^(?=.*[0-9])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$"
    );

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public void validatePasswordPolicy(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long.");
        }
        if (!password.matches(".*[0-9].*")) {
            throw new IllegalArgumentException("Password must contain at least one number.");
        }
        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?].*")) {
            throw new IllegalArgumentException("Password must contain at least one special symbol (!@#$%^&*...).");
        }
    }

    public boolean isEmailRegistered(String email) {
        if (email == null || email.isBlank()) return false;
        return userRepository.existsByEmail(email.trim().toLowerCase());
    }

    public boolean isPhoneRegistered(String phone) {
        if (phone == null || phone.isBlank()) return false;
        return userRepository.existsByPhone(phone.trim());
    }

    public User register(User user) {
        String targetRole = "RECRUITER".equalsIgnoreCase(user.getRole()) ? "RECRUITER" : "USER";
        return registerWithRole(user, targetRole);
    }

    public User registerAdmin(User user) {
        return registerWithRole(user, "ADMIN");
    }

    private User registerWithRole(User user, String defaultRole) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email address is required");
        }

        String cleanEmail = user.getEmail().trim().toLowerCase();
        user.setEmail(cleanEmail);

        if (userRepository.existsByEmail(cleanEmail)) {
            throw new RuntimeException("User already exists with this email address");
        }

        if (user.getPhone() != null && !user.getPhone().isBlank()) {
            String cleanPhone = user.getPhone().trim();
            user.setPhone(cleanPhone);
            if (userRepository.existsByPhone(cleanPhone)) {
                throw new RuntimeException("User already exists with this phone number");
            }
        }

        validatePasswordPolicy(user.getPassword());
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        if (user.getProvider() == null || user.getProvider().isBlank()) {
            user.setProvider("LOCAL");
        }

        if ("RECRUITER".equalsIgnoreCase(user.getRole()) || "RECRUITER".equalsIgnoreCase(defaultRole)) {
            user.setRole("RECRUITER");
        } else if ("ADMIN".equalsIgnoreCase(defaultRole)) {
            user.setRole("ADMIN");
        } else {
            user.setRole("USER");
        }

        if (user.getSkills() == null || user.getSkills().isBlank()) {
            user.setSkills("");
        }
        if (user.getJobTitle() == null) {
            user.setJobTitle("");
        }
        if (user.getExperience() == null) {
            user.setExperience(0);
        }
        if (user.getEmailVerified() == null) {
            user.setEmailVerified(true);
        }
        if (user.getPhoneVerified() == null) {
            user.setPhoneVerified(true);
        }

        User savedUser = userRepository.save(user);

        // Send real confirmation email
        try {
            emailService.sendRegistrationSuccessEmail(savedUser.getEmail(), savedUser.getName());
        } catch (Exception ex) {
            // Non-blocking for registration completion
        }

        return sanitizeUser(savedUser);
    }

    public User login(String email, String password) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Email and password are required");
        }

        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        return sanitizeUser(user);
    }

    /**
     * Find user by email or phone
     */
    public User findByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("Email or phone is required");
        }
        String clean = identifier.trim();
        if (clean.contains("@")) {
            return userRepository.findByEmail(clean.toLowerCase())
                    .orElseThrow(() -> new RuntimeException("No user found with email: " + clean));
        } else {
            return userRepository.findByPhone(clean)
                    .orElseThrow(() -> new RuntimeException("No user found with phone: " + clean));
        }
    }

    /**
     * Reset user password
     */
    public void resetPassword(String identifier, String newPassword) {
        validatePasswordPolicy(newPassword);

        User user = findByIdentifier(identifier);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Send confirmation email
        try {
            emailService.sendPasswordResetSuccessEmail(user.getEmail(), user.getName());
        } catch (Exception ex) {
            // Non-blocking
        }
    }

    /**
     * Find user by email
     */
    public User findByEmail(String email) {
        return userRepository.findByEmail(email.trim().toLowerCase())
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
        if (user.getPhone() != null && !user.getPhone().isBlank()) {
            existingUser.setPhone(user.getPhone());
        }
        if (user.getCountryCode() != null && !user.getCountryCode().isBlank()) {
            existingUser.setCountryCode(user.getCountryCode());
        }
        if (user.getJobAlertsEnabled() != null) {
            existingUser.setJobAlertsEnabled(user.getJobAlertsEnabled());
        }

        User updatedUser = userRepository.save(existingUser);
        return sanitizeUser(updatedUser);
    }

    public User sanitizeUser(User user) {
        User safeUser = new User();
        safeUser.setId(user.getId());
        safeUser.setName(user.getName());
        safeUser.setEmail(user.getEmail());
        safeUser.setPhone(user.getPhone());
        safeUser.setCountryCode(user.getCountryCode());
        safeUser.setProvider(user.getProvider());
        safeUser.setRole(user.getRole());
        safeUser.setEmailVerified(user.getEmailVerified());
        safeUser.setPhoneVerified(user.getPhoneVerified());
        safeUser.setJobAlertsEnabled(user.getJobAlertsEnabled());
        safeUser.setSkills(user.getSkills());
        safeUser.setJobTitle(user.getJobTitle());
        safeUser.setExperience(user.getExperience());
        safeUser.setPassword(null);
        return safeUser;
    }
}