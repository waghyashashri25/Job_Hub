package com.example.backend.controller;

import com.example.backend.config.JwtUtil;
import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/oauth")
public class OAuthController {

    private static final Logger logger = LoggerFactory.getLogger(OAuthController.class);

    @Value("${oauth.google.client-id:}")
    private String googleClientId;

    @Value("${oauth.google.client-secret:}")
    private String googleClientSecret;

    // Backend endpoint registered with Google OAuth
    @Value("${oauth.google.redirect-uri:http://localhost:8080/api/oauth/google/callback}")
    private String googleRedirectUri;

    @Value("${oauth.github.client-id:}")
    private String githubClientId;

    @Value("${oauth.github.client-secret:}")
    private String githubClientSecret;

    // Backend endpoint registered with GitHub OAuth
    @Value("${oauth.github.redirect-uri:http://localhost:8080/api/oauth/github/callback}")
    private String githubRedirectUri;

    // Frontend URL where user is redirected after OAuth completes
    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public OAuthController(
            UserRepository userRepository,
            JwtUtil jwtUtil,
            PasswordEncoder passwordEncoder,
            RestTemplate restTemplate,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    private boolean isGoogleConfigured() {
        return googleClientId != null && !googleClientId.isBlank() &&
               googleClientSecret != null && !googleClientSecret.isBlank();
    }

    private boolean isGithubConfigured() {
        return githubClientId != null && !githubClientId.isBlank() &&
               githubClientSecret != null && !githubClientSecret.isBlank();
    }

    private String resolveFrontendUrl(HttpServletRequest request) {
        if (frontendUrl != null && !frontendUrl.isBlank() && !frontendUrl.contains("localhost")) {
            return frontendUrl.replaceAll("/+$", "");
        }
        if (request != null) {
            String origin = request.getHeader("Origin");
            if (origin != null && !origin.isBlank() && !origin.contains("google.com") && !origin.contains("github.com") && !origin.contains("localhost")) {
                return origin.replaceAll("/+$", "");
            }
            String referer = request.getHeader("Referer");
            if (referer != null && !referer.isBlank()) {
                try {
                    java.net.URI uri = new java.net.URI(referer);
                    String host = uri.getHost();
                    if (host != null && !host.contains("google.com") && !host.contains("github.com") && !host.contains("localhost")) {
                        return uri.getScheme() + "://" + host + (uri.getPort() == -1 || uri.getPort() == 80 || uri.getPort() == 443 ? "" : ":" + uri.getPort());
                    }
                } catch (Exception ignored) {}
            }
        }
        return (frontendUrl != null && !frontendUrl.isBlank()) ? frontendUrl.replaceAll("/+$", "") : "https://job-hub-bay-alpha.vercel.app";
    }

    private String getFrontendGoogleCallback(HttpServletRequest request) {
        return resolveFrontendUrl(request) + "/auth/google/callback";
    }

    private String getFrontendGithubCallback(HttpServletRequest request) {
        return resolveFrontendUrl(request) + "/auth/github/callback";
    }

    /**
     * OAuth configuration status endpoint
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getOAuthStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("googleConfigured", isGoogleConfigured());
        status.put("githubConfigured", isGithubConfigured());
        return ResponseEntity.ok(status);
    }

    /**
     * Initiate Google OAuth 2.0 Authorization Code Flow
     * Redirects user to Google's consent screen
     */
    @GetMapping("/google")
    public void googleLogin(HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (!isGoogleConfigured()) {
            logger.error("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
            response.sendRedirect(getFrontendGoogleCallback(request) + "?error=" +
                URLEncoder.encode("Google OAuth is not configured. Please set up your Google OAuth credentials on Render.", StandardCharsets.UTF_8));
            return;
        }

        String scope = URLEncoder.encode("openid email profile", StandardCharsets.UTF_8);
        String redirectUri = URLEncoder.encode(googleRedirectUri, StandardCharsets.UTF_8);

        String googleAuthUrl = String.format(
            "https://accounts.google.com/o/oauth2/v2/auth?" +
            "client_id=%s&" +
            "redirect_uri=%s&" +
            "response_type=code&" +
            "scope=%s&" +
            "access_type=offline&" +
            "prompt=select_account",
            googleClientId, redirectUri, scope
        );

        logger.info("Redirecting to Google OAuth consent screen");
        response.sendRedirect(googleAuthUrl);
    }

    /**
     * Initiate GitHub OAuth 2.0 Authorization Code Flow
     * Redirects user to GitHub's authorization page
     */
    @GetMapping("/github")
    public void githubLogin(HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (!isGithubConfigured()) {
            logger.error("GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.");
            response.sendRedirect(getFrontendGithubCallback(request) + "?error=" +
                URLEncoder.encode("GitHub OAuth is not configured. Please set up your GitHub OAuth credentials on Render.", StandardCharsets.UTF_8));
            return;
        }

        String scope = URLEncoder.encode("user:email read:user", StandardCharsets.UTF_8);
        String redirectUri = URLEncoder.encode(githubRedirectUri, StandardCharsets.UTF_8);

        String githubAuthUrl = String.format(
            "https://github.com/login/oauth/authorize?" +
            "client_id=%s&" +
            "redirect_uri=%s&" +
            "scope=%s&" +
            "allow_signup=true",
            githubClientId, redirectUri, scope
        );

        logger.info("Redirecting to GitHub OAuth authorization page");
        response.sendRedirect(githubAuthUrl);
    }

    /**
     * Google OAuth 2.0 callback — exchanges authorization code for access token,
     * fetches the user's profile, creates/updates the user record, and issues a JWT.
     * Finally redirects the user to the FRONTEND with the token or error.
     */
    @GetMapping("/google/callback")
    public void googleCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {

        if (error != null) {
            logger.warn("Google OAuth denied or errored: {}", error);
            response.sendRedirect(getFrontendGoogleCallback(request) + "?error=" +
                URLEncoder.encode("Google sign-in was cancelled or denied: " + error, StandardCharsets.UTF_8));
            return;
        }

        if (code == null || code.isBlank()) {
            response.sendRedirect(getFrontendGoogleCallback(request) + "?error=" +
                URLEncoder.encode("No authorization code received from Google.", StandardCharsets.UTF_8));
            return;
        }

        try {
            // Step 1: Exchange authorization code for tokens
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> tokenParams = new LinkedMultiValueMap<>();
            tokenParams.add("client_id", googleClientId);
            tokenParams.add("client_secret", googleClientSecret);
            tokenParams.add("code", code);
            tokenParams.add("grant_type", "authorization_code");
            tokenParams.add("redirect_uri", googleRedirectUri);

            HttpEntity<MultiValueMap<String, String>> tokenRequest = new HttpEntity<>(tokenParams, headers);
            ResponseEntity<String> tokenResponse = restTemplate.postForEntity(
                "https://oauth2.googleapis.com/token", tokenRequest, String.class);

            if (tokenResponse.getStatusCode() != HttpStatus.OK || tokenResponse.getBody() == null) {
                throw new RuntimeException("Failed to exchange code with Google: empty or non-200 response");
            }

            JsonNode tokenJson = objectMapper.readTree(tokenResponse.getBody());
            String accessToken = tokenJson.path("access_token").asText();

            if (accessToken.isBlank()) {
                String tokenError = tokenJson.path("error").asText("unknown_error");
                throw new RuntimeException("Google token exchange error: " + tokenError);
            }

            // Step 2: Fetch the authenticated user's profile
            HttpHeaders userHeaders = new HttpHeaders();
            userHeaders.setBearerAuth(accessToken);
            HttpEntity<Void> userRequest = new HttpEntity<>(userHeaders);

            ResponseEntity<String> userInfoResponse = restTemplate.exchange(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                HttpMethod.GET, userRequest, String.class);

            if (userInfoResponse.getStatusCode() != HttpStatus.OK || userInfoResponse.getBody() == null) {
                throw new RuntimeException("Failed to fetch user info from Google");
            }

            JsonNode userJson = objectMapper.readTree(userInfoResponse.getBody());
            String email = userJson.path("email").asText();
            String name = userJson.path("name").asText(userJson.path("given_name").asText("Google User"));

            if (email.isBlank()) {
                throw new RuntimeException("Google did not provide an email address for this account.");
            }

            // Step 3: Upsert user in database
            User user = upsertOAuthUser(email, name, "GOOGLE");

            // Step 4: Issue signed JWT and redirect to FRONTEND
            String jwtToken = jwtUtil.generateToken(user.getEmail(), user.getRole());
            String encodedName = URLEncoder.encode(user.getName(), StandardCharsets.UTF_8);
            String encodedEmail = URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8);

            logger.info("Google OAuth successful for: {}", email);
            response.sendRedirect(getFrontendGoogleCallback(request) + "?token=" + jwtToken +
                "&name=" + encodedName + "&email=" + encodedEmail + "&provider=Google");

        } catch (Exception ex) {
            logger.error("Google OAuth callback failed: {}", ex.getMessage(), ex);
            response.sendRedirect(getFrontendGoogleCallback(request) + "?error=" +
                URLEncoder.encode("Google sign-in failed: " + ex.getMessage(), StandardCharsets.UTF_8));
        }
    }

    /**
     * GitHub OAuth 2.0 callback — exchanges authorization code for access token,
     * fetches the user's profile and primary email, creates/updates the user record, and issues a JWT.
     * Finally redirects the user to the FRONTEND with the token or error.
     */
    @GetMapping("/github/callback")
    public void githubCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {

        if (error != null) {
            logger.warn("GitHub OAuth denied or errored: {}", error);
            response.sendRedirect(getFrontendGithubCallback(request) + "?error=" +
                URLEncoder.encode("GitHub sign-in was cancelled or denied: " + error, StandardCharsets.UTF_8));
            return;
        }

        if (code == null || code.isBlank()) {
            response.sendRedirect(getFrontendGithubCallback(request) + "?error=" +
                URLEncoder.encode("No authorization code received from GitHub.", StandardCharsets.UTF_8));
            return;
        }

        try {
            // Step 1: Exchange authorization code for access token
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.set("Accept", "application/json");

            MultiValueMap<String, String> tokenParams = new LinkedMultiValueMap<>();
            tokenParams.add("client_id", githubClientId);
            tokenParams.add("client_secret", githubClientSecret);
            tokenParams.add("code", code);
            tokenParams.add("redirect_uri", githubRedirectUri);

            HttpEntity<MultiValueMap<String, String>> tokenRequest = new HttpEntity<>(tokenParams, headers);
            ResponseEntity<String> tokenResponse = restTemplate.postForEntity(
                "https://github.com/login/oauth/access_token", tokenRequest, String.class);

            if (tokenResponse.getStatusCode() != HttpStatus.OK || tokenResponse.getBody() == null) {
                throw new RuntimeException("Failed to exchange code with GitHub: empty or non-200 response");
            }

            JsonNode tokenJson = objectMapper.readTree(tokenResponse.getBody());
            String accessToken = tokenJson.path("access_token").asText();

            if (accessToken.isBlank()) {
                String tokenError = tokenJson.path("error_description").asText(
                    tokenJson.path("error").asText("unknown_error"));
                throw new RuntimeException("GitHub token exchange error: " + tokenError);
            }

            // Step 2: Fetch user profile
            HttpHeaders userHeaders = new HttpHeaders();
            userHeaders.setBearerAuth(accessToken);
            userHeaders.set("User-Agent", "JobHub-Portal");
            userHeaders.set("Accept", "application/json");
            HttpEntity<Void> userRequest = new HttpEntity<>(userHeaders);

            ResponseEntity<String> userInfoResponse = restTemplate.exchange(
                "https://api.github.com/user", HttpMethod.GET, userRequest, String.class);

            if (userInfoResponse.getStatusCode() != HttpStatus.OK || userInfoResponse.getBody() == null) {
                throw new RuntimeException("Failed to fetch user info from GitHub");
            }

            JsonNode userJson = objectMapper.readTree(userInfoResponse.getBody());
            String name = userJson.path("name").asText(userJson.path("login").asText("GitHub User"));
            String email = userJson.path("email").asText(null);

            // Step 3: If email is null/private, fetch the user's verified primary email
            if (email == null || email.isBlank() || "null".equals(email)) {
                ResponseEntity<String> emailsResponse = restTemplate.exchange(
                    "https://api.github.com/user/emails", HttpMethod.GET, userRequest, String.class);

                if (emailsResponse.getStatusCode() == HttpStatus.OK && emailsResponse.getBody() != null) {
                    JsonNode emailsArray = objectMapper.readTree(emailsResponse.getBody());
                    if (emailsArray.isArray()) {
                        for (JsonNode emailNode : emailsArray) {
                            boolean isPrimary = emailNode.path("primary").asBoolean(false);
                            boolean isVerified = emailNode.path("verified").asBoolean(false);
                            if (isPrimary && isVerified) {
                                email = emailNode.path("email").asText();
                                break;
                            }
                        }
                        // Fallback: first verified email if no primary found
                        if (email == null || email.isBlank()) {
                            for (JsonNode emailNode : emailsArray) {
                                if (emailNode.path("verified").asBoolean(false)) {
                                    email = emailNode.path("email").asText();
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            if (email == null || email.isBlank()) {
                throw new RuntimeException("Could not retrieve a verified email from your GitHub account. Please make sure your primary email is verified.");
            }

            // Step 4: Upsert user in database
            User user = upsertOAuthUser(email, name, "GITHUB");

            // Step 5: Issue signed JWT and redirect to FRONTEND
            String jwtToken = jwtUtil.generateToken(user.getEmail(), user.getRole());
            String encodedName = URLEncoder.encode(user.getName(), StandardCharsets.UTF_8);
            String encodedEmail = URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8);

            logger.info("GitHub OAuth successful for: {}", email);
            response.sendRedirect(getFrontendGithubCallback(request) + "?token=" + jwtToken +
                "&name=" + encodedName + "&email=" + encodedEmail + "&provider=GitHub");

        } catch (Exception ex) {
            logger.error("GitHub OAuth callback failed: {}", ex.getMessage(), ex);
            response.sendRedirect(getFrontendGithubCallback(request) + "?error=" +
                URLEncoder.encode("GitHub sign-in failed: " + ex.getMessage(), StandardCharsets.UTF_8));
        }
    }

    /**
     * Upsert OAuth user: find existing user by email or create a new one.
     * Existing users keep their role and skills; new users get role=USER.
     */
    private User upsertOAuthUser(String email, String name, String provider) {
        Optional<User> existingOpt = userRepository.findByEmail(email);

        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            boolean changed = false;
            if (name != null && !name.isBlank() && !name.equals(existing.getName())) {
                existing.setName(name);
                changed = true;
            }
            if (!provider.equalsIgnoreCase(existing.getProvider())) {
                existing.setProvider(provider);
                changed = true;
            }
            if (changed) {
                userRepository.save(existing);
            }
            return existing;
        }

        // New user via OAuth — create account
        User newUser = new User();
        newUser.setEmail(email);
        newUser.setName(name != null && !name.isBlank() ? name : "JobHub Member");
        newUser.setProvider(provider);
        newUser.setRole("USER");
        newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        newUser.setSkills("");
        newUser.setJobTitle("");
        newUser.setExperience(0);

        logger.info("Created new OAuth user: {} via {}", email, provider);
        return userRepository.save(newUser);
    }
}
