package com.example.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtFilter.class);

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        String requestPath = request.getRequestURI();

        if (authHeader != null && authHeader.startsWith("Bearer ")) {

            String token = authHeader.substring(7);
            logger.debug("JWT auth header detected for path: {}", requestPath);

            try {
                String email = jwtUtil.extractEmail(token);
                Optional<User> userOpt = userRepository.findByEmail(email);

                if (userOpt.isPresent()) {
                    String role;
                    try {
                        role = jwtUtil.extractRole(token);
                    } catch (Exception ignored) {
                        role = userOpt.get().getRole();
                    }

                    if (role == null || role.isBlank()) {
                        role = userOpt.get().getRole();
                    }
                    if (role == null || role.isBlank()) {
                        role = "USER";
                    }

                    role = role.toUpperCase();

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    email,
                                    null,
                                    List.of(new SimpleGrantedAuthority("ROLE_" + role))
                            );

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    logger.info("Authenticated user '{}' with role '{}' on path '{}'", email, role, requestPath);
                }

            } catch (Exception e) {
                SecurityContextHolder.clearContext();
                logger.warn("Invalid JWT token for path '{}': {}", requestPath, e.getMessage());
            }
        } else {
            logger.debug("No Bearer token found for path: {}", requestPath);
        }

        filterChain.doFilter(request, response);
    }
}