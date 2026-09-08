package com.example.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.backend.model.Job;
import com.example.backend.model.User;
import com.example.backend.service.CareerIntelligenceService;
import com.example.backend.service.EmailService;
import com.example.backend.service.OtpService;
import com.example.backend.service.UserService;
import com.example.backend.config.JwtUtil;
import com.example.backend.repository.JobRepository;

import java.util.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;
    private final EmailService emailService;
    private final JobRepository jobRepository;
    private final CareerIntelligenceService careerIntelligenceService;

    public UserController(UserService userService,
                          JwtUtil jwtUtil,
                          OtpService otpService,
                          EmailService emailService,
                          JobRepository jobRepository,
                          CareerIntelligenceService careerIntelligenceService) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.otpService = otpService;
        this.emailService = emailService;
        this.jobRepository = jobRepository;
        this.careerIntelligenceService = careerIntelligenceService;
    }

    // ==========================================
    // 1. DUPLICATE USER CHECK
    // ==========================================
    @PostMapping("/check-duplicate")
    public ResponseEntity<?> checkDuplicate(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String phone = payload.get("phone");

        if (email != null && !email.isBlank() && userService.isEmailRegistered(email)) {
            return ResponseEntity.ok(Map.of(
                    "exists", true,
                    "field", "email",
                    "message", "An account with this email address already exists. Please sign in or use Forgot Password."
            ));
        }

        if (phone != null && !phone.isBlank() && userService.isPhoneRegistered(phone)) {
            return ResponseEntity.ok(Map.of(
                    "exists", true,
                    "field", "phone",
                    "message", "An account with this phone number already exists. Please sign in or use another number."
            ));
        }

        return ResponseEntity.ok(Map.of("exists", false));
    }

    // ==========================================
    // 2. SEND OTP (EMAIL / SMS)
    // ==========================================
    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> payload) {
        String identifier = payload.get("identifier");
        String phone = payload.get("phone");
        String purpose = payload.getOrDefault("purpose", "REGISTRATION");
        String userName = payload.getOrDefault("name", "User");

        if (identifier == null || identifier.trim().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email or phone number is required to send verification code"));
        }

        try {
            String code = otpService.generateAndSendOtp(identifier, purpose, userName);
            if (phone != null && !phone.isBlank() && !phone.equalsIgnoreCase(identifier)) {
                otpService.generateAndSendOtp(phone, purpose, userName, code);
            }

            String destText = maskIdentifier(identifier);
            if (phone != null && !phone.isBlank() && !phone.equalsIgnoreCase(identifier)) {
                destText += " and " + maskIdentifier(phone);
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("message", "Verification code sent successfully to " + destText);
            return ResponseEntity.ok(resp);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // ==========================================
    // 3. VERIFY OTP
    // ==========================================
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> payload) {
        String identifier = payload.get("identifier");
        String phone = payload.get("phone");
        String purpose = payload.getOrDefault("purpose", "REGISTRATION");
        String otpCode = payload.get("otpCode");

        if (identifier == null || otpCode == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Identifier and verification code are required"));
        }

        try {
            boolean valid = otpService.verifyOtp(identifier, purpose, otpCode);
            if (!valid && phone != null && !phone.isBlank()) {
                valid = otpService.verifyOtp(phone, purpose, otpCode);
            }

            if (valid) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Mobile number & email verified successfully"));
            } else {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Verification failed: Incorrect or expired verification code. You are not allowed to proceed until your mobile number and email are verified."
                ));
            }
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // ==========================================
    // 4. SIGNUP
    // ==========================================
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        try {
            User savedUser = userService.register(user);
            return ResponseEntity.ok(savedUser);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/create-admin")
    public ResponseEntity<User> createAdmin(@RequestBody User user) {
        User savedAdmin = userService.registerAdmin(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedAdmin);
    }

    // ==========================================
    // 5. LOGIN STEP 1: INITIAL CREDENTIAL CHECK & OTP DISPATCH
    // ==========================================
    @PostMapping("/login-init")
    public ResponseEntity<?> loginInit(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");

        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required"));
        }

        try {
            // Verify user credentials first
            User user = userService.login(email, password);

            // Generate and dispatch real OTP to email (and phone if registered)
            String code = otpService.generateAndSendOtp(user.getEmail(), "LOGIN", user.getName());
            if (user.getPhone() != null && !user.getPhone().isBlank()) {
                otpService.generateAndSendOtp(user.getPhone(), "LOGIN", user.getName(), code);
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("otpRequired", true);
            resp.put("email", maskIdentifier(user.getEmail()));
            resp.put("phone", user.getPhone() != null && !user.getPhone().isBlank() ? maskIdentifier(user.getPhone()) : "");
            resp.put("message", "Verification code sent to your registered email and phone.");
            return ResponseEntity.ok(resp);
        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password. Please check your credentials."));
        }
    }

    // ==========================================
    // 6. LOGIN STEP 2: VERIFY OTP AND ISSUE JWT
    // ==========================================
    @PostMapping("/login-verify")
    public ResponseEntity<?> loginVerify(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otpCode = payload.get("otpCode");

        if (email == null || otpCode == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and OTP code are required"));
        }

        try {
            boolean valid = otpService.verifyOtp(email, "LOGIN", otpCode);
            if (!valid) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired verification code."));
            }

            User user = userService.findByEmail(email);
            String token = jwtUtil.generateToken(user.getEmail(), user.getRole());

            // Send real login notification alert email
            try {
                emailService.sendLoginAlertEmail(user.getEmail(), user.getName());
            } catch (Exception ex) {
                // Non-blocking
            }

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "user", userService.sanitizeUser(user)
            ));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // Direct Login endpoint (with welcome email dispatch)
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User user) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()
                || user.getPassword() == null || user.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Email and password are required");
        }

        try {
            User authenticatedUser = userService.login(user.getEmail(), user.getPassword());
            String token = jwtUtil.generateToken(authenticatedUser.getEmail(), authenticatedUser.getRole());

            try {
                emailService.sendLoginAlertEmail(authenticatedUser.getEmail(), authenticatedUser.getName());
            } catch (Exception ex) {
                // Non-blocking
            }

            return ResponseEntity.ok(token);
        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid email or password");
        }
    }

    // ==========================================
    // 7. FORGOT PASSWORD FLOW
    // ==========================================
    @PostMapping("/forgot-password/request")
    public ResponseEntity<?> forgotPasswordRequest(@RequestBody Map<String, String> payload) {
        String identifier = payload.get("identifier");
        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email or phone number is required"));
        }

        try {
            User user = userService.findByIdentifier(identifier);
            String code = otpService.generateAndSendOtp(identifier, "FORGOT_PASSWORD", user.getName());

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("destination", maskIdentifier(identifier));
            resp.put("message", "Password reset verification code dispatched successfully.");
            return ResponseEntity.ok(resp);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "No account registered with this email or phone number."));
        }
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<?> forgotPasswordReset(@RequestBody Map<String, String> payload) {
        String identifier = payload.get("identifier");
        String otpCode = payload.get("otpCode");
        String newPassword = payload.get("newPassword");

        if (identifier == null || otpCode == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Identifier, OTP code, and new password are required"));
        }

        try {
            boolean valid = otpService.verifyOtp(identifier, "FORGOT_PASSWORD", otpCode);
            if (!valid) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired verification code"));
            }

            userService.resetPassword(identifier, newPassword);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Password has been successfully updated! You can now sign in."
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // ==========================================
    // 8. AI RESUME MATCH EMAIL NOTIFICATION TRIGGER
    // ==========================================
    @PostMapping("/send-job-alerts")
    public ResponseEntity<?> sendJobAlerts(@RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractEmail(token.replace("Bearer ", ""));
            User user = userService.findByEmail(email);

            if (user.getSkills() == null || user.getSkills().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Please add skills to your profile first or upload a resume."));
            }

            List<String> skills = Arrays.stream(user.getSkills().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .toList();

            List<Job> allJobs = jobRepository.findAll();
            List<Job> matchedJobs = new ArrayList<>();
            Map<Long, Integer> matchScores = new HashMap<>();

            for (Job job : allJobs) {
                int score = careerIntelligenceService.analyzeJobMatch(job, skills, user.getExperience() != null ? user.getExperience() : 2).getOverallMatchPercentage();
                if (score >= 60) {
                    matchedJobs.add(job);
                    matchScores.put(job.getId(), score);
                }
                if (matchedJobs.size() >= 5) break; // Top 5 matches for email
            }

            if (matchedJobs.isEmpty() && !allJobs.isEmpty()) {
                // Pick top 3 recent jobs as recommended
                matchedJobs = allJobs.stream().limit(3).toList();
                for (Job j : matchedJobs) {
                    matchScores.put(j.getId(), 75);
                }
            }

            emailService.sendJobMatchNotificationEmail(user.getEmail(), user.getName(), matchedJobs, matchScores);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "count", matchedJobs.size(),
                    "message", "AI job match alert email dispatched with " + matchedJobs.size() + " top matching opportunities!"
            ));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/test")
    public String test() {
        return "Protected API working";
    }

    /**
     * Get user profile by email (from JWT token)
     */
    @GetMapping("/profile")
    public ResponseEntity<User> getProfile(@RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractEmail(token.replace("Bearer ", ""));
            User user = userService.findByEmail(email);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * Update user skills and profile information
     */
    @PutMapping("/profile/skills")
    public ResponseEntity<User> updateSkills(
            @RequestHeader("Authorization") String token,
            @RequestBody User userUpdate) {
        try {
            String email = jwtUtil.extractEmail(token.replace("Bearer ", ""));
            User user = userService.findByEmail(email);

            if (userUpdate.getSkills() != null) {
                user.setSkills(userUpdate.getSkills());
            }
            if (userUpdate.getJobTitle() != null) {
                user.setJobTitle(userUpdate.getJobTitle());
            }
            if (userUpdate.getExperience() != null) {
                user.setExperience(userUpdate.getExperience());
            }
            if (userUpdate.getPhone() != null) {
                user.setPhone(userUpdate.getPhone());
            }
            if (userUpdate.getCountryCode() != null) {
                user.setCountryCode(userUpdate.getCountryCode());
            }
            if (userUpdate.getJobAlertsEnabled() != null) {
                user.setJobAlertsEnabled(userUpdate.getJobAlertsEnabled());
            }

            User updatedUser = userService.updateUser(user);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * Get user skills as array
     */
    @GetMapping("/profile/skills")
    public ResponseEntity<?> getSkills(@RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractEmail(token.replace("Bearer ", ""));
            User user = userService.findByEmail(email);
            String[] skills = user.getSkills() != null && !user.getSkills().isBlank()
                    ? user.getSkills().split("\\s*,\\s*")
                    : new String[0];

            return ResponseEntity.ok(new SkillsResponse(skills, user.getJobTitle(), user.getExperience()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    private String maskIdentifier(String id) {
        if (id == null) return "";
        if (id.contains("@")) {
            int atIndex = id.indexOf("@");
            if (atIndex <= 2) return id;
            return id.substring(0, 2) + "***" + id.substring(atIndex);
        } else {
            if (id.length() <= 4) return id;
            return id.substring(0, 3) + "***" + id.substring(id.length() - 2);
        }
    }

    public static class SkillsResponse {
        public String[] skills;
        public String jobTitle;
        public Integer experience;

        public SkillsResponse(String[] skills, String jobTitle, Integer experience) {
            this.skills = skills;
            this.jobTitle = jobTitle;
            this.experience = experience;
        }

        public String[] getSkills() { return skills; }
        public String getJobTitle() { return jobTitle; }
        public Integer getExperience() { return experience; }
    }
}