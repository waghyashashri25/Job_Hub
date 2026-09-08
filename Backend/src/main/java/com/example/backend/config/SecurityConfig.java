package com.example.backend.config;

import org.springframework.http.HttpMethod;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    @Value("${app.cors.allowed-origin:http://localhost:3000}")
    private String allowedOrigin;

    // 🔥 Inject JWT Filter
    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .httpBasic(httpBasic -> httpBasic.disable())
            .formLogin(form -> form.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/users/signup",
                    "/api/users/signup/**",
                    "/api/users/login",
                    "/api/users/login/**",
                    "/api/users/login-init",
                    "/api/users/login-init/**",
                    "/api/users/login-verify",
                    "/api/users/login-verify/**",
                    "/api/users/check-duplicate",
                    "/api/users/check-duplicate/**",
                    "/api/users/send-otp",
                    "/api/users/send-otp/**",
                    "/api/users/verify-otp",
                    "/api/users/verify-otp/**",
                    "/api/users/forgot-password/**",
                    "/error"
                ).permitAll()
                .requestMatchers("/api/oauth/**").permitAll()
                .requestMatchers("/api/jobs", "/api/jobs/", "/api/jobs/all", "/api/jobs/search", "/api/jobs/search/**", "/api/jobs/source/**", "/api/jobs/discovery", "/api/jobs/internships", "/api/jobs/sync-internships", "/api/jobs/sync").permitAll()
                .requestMatchers("/api/applications", "/api/applications/**").permitAll()
                .requestMatchers("/api/resume/**", "/api/career/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/admin/announcement").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/recruiter/**").hasAnyRole("RECRUITER", "ADMIN")
                .requestMatchers("/api/users/create-admin").hasRole("ADMIN")
                .requestMatchers("/api/jobs/create", "/api/jobs/aggregate").hasRole("ADMIN")
                .requestMatchers("/api/jobs/**").hasAnyRole("USER", "ADMIN", "RECRUITER")
                .requestMatchers("/api/users/**").hasAnyRole("USER", "ADMIN", "RECRUITER")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Build allowed origins from environment variable (comma-separated)
        String allowedOriginsEnv = System.getenv("CORS_ALLOWED_ORIGINS");
        
        if (allowedOriginsEnv != null && !allowedOriginsEnv.isEmpty()) {
            // Production: use environment variable
            configuration.setAllowedOrigins(List.of(allowedOriginsEnv.split(",")));
        } else {
            // Development: use default localhost origins
            configuration.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002",
                "http://localhost:5173",
                "http://localhost:5174",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001",
                "http://127.0.0.1:3002",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174"
            ));
        }
        
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}