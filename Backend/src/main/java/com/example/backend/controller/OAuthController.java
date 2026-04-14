package com.example.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/oauth")
public class OAuthController {

    @Value("${oauth.google.client-id:YOUR_GOOGLE_CLIENT_ID}")
    private String googleClientId;

    @Value("${oauth.google.redirect-uri:http://localhost:3000/auth/google/callback}")
    private String googleRedirectUri;

    @Value("${oauth.github.client-id:YOUR_GITHUB_CLIENT_ID}")
    private String githubClientId;

    @Value("${oauth.github.redirect-uri:http://localhost:3000/auth/github/callback}")
    private String githubRedirectUri;

    /**
     * Initiate Google OAuth flow
     * Redirects user to Google's login page
     */
    @GetMapping("/google")
    public void googleLogin(HttpServletResponse response) throws IOException {
        String scope = URLEncoder.encode("openid email profile", StandardCharsets.UTF_8);
        String redirectUri = URLEncoder.encode(googleRedirectUri, StandardCharsets.UTF_8);
        
        String googleAuthUrl = String.format(
            "https://accounts.google.com/o/oauth2/v2/auth?" +
            "client_id=%s&" +
            "redirect_uri=%s&" +
            "response_type=code&" +
            "scope=%s&" +
            "access_type=offline",
            googleClientId, redirectUri, scope
        );
        
        response.sendRedirect(googleAuthUrl);
    }

    /**
     * Initiate GitHub OAuth flow
     * Redirects user to GitHub's login page
     */
    @GetMapping("/github")
    public void githubLogin(HttpServletResponse response) throws IOException {
        String scope = URLEncoder.encode("user:email", StandardCharsets.UTF_8);
        String redirectUri = URLEncoder.encode(githubRedirectUri, StandardCharsets.UTF_8);
        
        String githubAuthUrl = String.format(
            "https://github.com/login/oauth/authorize?" +
            "client_id=%s&" +
            "redirect_uri=%s&" +
            "scope=%s&" +
            "allow_signup=true",
            githubClientId, redirectUri, scope
        );
        
        response.sendRedirect(githubAuthUrl);
    }

    /**
     * Google OAuth callback endpoint
     * Called by Google after user approves
     * Exchanges authorization code for access token
     */
    @GetMapping("/google/callback")
    public ResponseEntity<String> googleCallback(
            @RequestParam String code,
            @RequestParam(required = false) String state) {
        // TODO: Exchange code for access token with Google
        // TODO: Fetch user info from Google
        // TODO: Create or update user in database
        // TODO: Generate JWT token
        // For now: return success with a placeholder JWT
        String jwtToken = "google_oauth_token_placeholder_" + System.currentTimeMillis();
        return ResponseEntity.ok("{\"token\":\"" + jwtToken + "\", \"message\":\"Google OAuth callback received\"}");
    }

    /**
     * GitHub OAuth callback endpoint
     * Called by GitHub after user approves
     * Exchanges authorization code for access token
     */
    @GetMapping("/github/callback")
    public ResponseEntity<String> githubCallback(
            @RequestParam String code,
            @RequestParam(required = false) String state) {
        // TODO: Exchange code for access token with GitHub
        // TODO: Fetch user info from GitHub
        // TODO: Create or update user in database
        // TODO: Generate JWT token
        // For now: return success with a placeholder JWT
        String jwtToken = "github_oauth_token_placeholder_" + System.currentTimeMillis();
        return ResponseEntity.ok("{\"token\":\"" + jwtToken + "\", \"message\":\"GitHub OAuth callback received\"}");
    }
}
