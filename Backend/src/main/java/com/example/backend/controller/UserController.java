package com.example.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.backend.model.User;
import com.example.backend.service.UserService;
import com.example.backend.config.JwtUtil;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    public UserController(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    // ✅ SIGNUP
    @PostMapping("/signup")
    public ResponseEntity<User> signup(@RequestBody User user) {
        User savedUser = userService.register(user);
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/create-admin")
    public ResponseEntity<User> createAdmin(@RequestBody User user) {
        User savedAdmin = userService.registerAdmin(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedAdmin);
    }

    // 🔐 LOGIN → RETURN JWT TOKEN
    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody User user) {

        if (user == null || user.getEmail() == null || user.getEmail().isBlank()
                || user.getPassword() == null || user.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Email and password are required");
        }

        try {
            User authenticatedUser = userService.login(
                    user.getEmail(),
                    user.getPassword()
            );

                String token = jwtUtil.generateToken(authenticatedUser.getEmail(), authenticatedUser.getRole());

            return ResponseEntity.ok(token);

        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid email or password");
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

    /**
     * Helper class for skills response
     */
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