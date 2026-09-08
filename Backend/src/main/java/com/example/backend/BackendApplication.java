package com.example.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
@EnableScheduling
@EnableAsync
public class BackendApplication {

	public static void main(String[] args) {
		loadDotEnv();
		SpringApplication.run(BackendApplication.class, args);
	}

	/**
	 * Automatically locate and load environment variables from .env files
	 * into Java System properties so Spring Boot can resolve them via ${VAR_NAME}
	 * whether launched from IDE, Maven, or command line.
	 */
	private static void loadDotEnv() {
		List<String> possiblePaths = Arrays.asList(
			".env",
			"Backend/.env",
			"../.env",
			"../../.env"
		);

		for (String relPath : possiblePaths) {
			File envFile = new File(relPath);
			if (envFile.exists() && envFile.isFile()) {
				try (BufferedReader reader = new BufferedReader(new FileReader(envFile, StandardCharsets.UTF_8))) {
					String line;
					while ((line = reader.readLine()) != null) {
						line = line.trim();
						if (line.isEmpty() || line.startsWith("#")) {
							continue;
						}
						int eqIndex = line.indexOf('=');
						if (eqIndex > 0) {
							String key = line.substring(0, eqIndex).trim();
							String value = line.substring(eqIndex + 1).trim();
							if ((value.startsWith("\"") && value.endsWith("\"")) ||
							    (value.startsWith("'") && value.endsWith("'"))) {
								if (value.length() >= 2) {
									value = value.substring(1, value.length() - 1);
								}
							}
							if (System.getProperty(key) == null && System.getenv(key) == null) {
								System.setProperty(key, value);
							}
						}
					}
					System.out.println("Loaded environment variables from: " + envFile.getAbsolutePath());
				} catch (Exception e) {
					System.err.println("Warning: Failed to load .env from " + envFile.getAbsolutePath() + ": " + e.getMessage());
				}
			}
		}
		normalizeDatabaseUrl();
	}

	/**
	 * Automatically translate cloud database connection URLs (e.g. Render / Heroku / Supabase)
	 * from postgres://user:password@host:port/db into Spring Boot jdbc:postgresql:// format.
	 */
	private static void normalizeDatabaseUrl() {
		String dbUrl = System.getenv("SPRING_DATASOURCE_URL");
		if (dbUrl == null || dbUrl.isBlank()) {
			dbUrl = System.getenv("DATABASE_URL");
		}
		if (dbUrl == null || dbUrl.isBlank()) {
			dbUrl = System.getProperty("SPRING_DATASOURCE_URL");
		}
		if (dbUrl == null || dbUrl.isBlank()) {
			dbUrl = System.getProperty("DATABASE_URL");
		}
		if (dbUrl != null && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
			try {
				String raw = dbUrl.replaceFirst("^postgres(ql)?://", "http://");
				java.net.URI uri = new java.net.URI(raw);
				String host = uri.getHost();
				int port = uri.getPort() == -1 ? 5432 : uri.getPort();
				String path = uri.getPath();
				String userInfo = uri.getUserInfo();
				String query = uri.getQuery();
				String sslParam = (query != null && query.contains("sslmode")) ? "" : (path.contains("?") ? "&sslmode=require" : "?sslmode=require");
				String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path + sslParam;

				System.setProperty("spring.datasource.url", jdbcUrl);
				System.setProperty("SPRING_DATASOURCE_URL", jdbcUrl);

				if (userInfo != null && userInfo.contains(":")) {
					String[] parts = userInfo.split(":", 2);
					System.setProperty("spring.datasource.username", parts[0]);
					System.setProperty("SPRING_DATASOURCE_USERNAME", parts[0]);
					System.setProperty("spring.datasource.password", parts[1]);
					System.setProperty("SPRING_DATASOURCE_PASSWORD", parts[1]);
				}
				System.out.println("Normalized Cloud Database URL for Spring Boot JDBC connection.");
			} catch (Exception e) {
				System.err.println("Notice: Could not parse database URL as URI: " + e.getMessage());
			}
		}
	}

}
