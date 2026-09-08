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
	}

}
