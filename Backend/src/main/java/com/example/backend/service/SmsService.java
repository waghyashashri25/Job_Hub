package com.example.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

@Service
public class SmsService {

    private static final Logger logger = LoggerFactory.getLogger(SmsService.class);

    private final RestTemplate restTemplate;

    @Value("${sms.provider:none}")
    private String provider;

    @Value("${sms.api-key:}")
    private String apiKey;

    @Value("${twilio.account-sid:}")
    private String twilioSid;

    @Value("${twilio.auth-token:}")
    private String twilioToken;

    @Value("${twilio.phone-number:}")
    private String twilioPhone;

    public SmsService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public boolean isSmsConfigured() {
        if ("fast2sms".equalsIgnoreCase(provider) && apiKey != null && !apiKey.isBlank()) {
            return true;
        }
        if ("twilio".equalsIgnoreCase(provider) && twilioSid != null && !twilioSid.isBlank() && twilioToken != null && !twilioToken.isBlank()) {
            return true;
        }
        return false;
    }

    @Async
    public void sendOtpSms(String phoneNumber, String otpCode, String purpose) {
        logger.info("===============================================================================");
        logger.info("[REAL SMS DISPATCH] TO: {} | PURPOSE: {}", phoneNumber, purpose);
        logger.info("[ACTIVE SMS OTP CODE] >>> {} <<< for phone: {}", otpCode, phoneNumber);
        logger.info("===============================================================================");

        if (!isSmsConfigured()) {
            logger.info("SMS provider not configured (provider={}). Logged OTP code above.", provider);
            return;
        }

        try {
            String messageText = String.format("Your JobHub verification code is %s. Valid for 10 minutes. Do not share this OTP with anyone.", otpCode);

            if ("fast2sms".equalsIgnoreCase(provider)) {
                sendViaFast2Sms(phoneNumber, messageText);
            } else if ("twilio".equalsIgnoreCase(provider)) {
                sendViaTwilio(phoneNumber, messageText);
            }
        } catch (Exception ex) {
            logger.warn("SMS transmission note for {}: {}", phoneNumber, ex.getMessage());
        }
    }

    private void sendViaFast2Sms(String phoneNumber, String message) {
        try {
            // Remove '+' and spaces for Fast2SMS numbers
            String cleanNumber = phoneNumber.replaceAll("[^0-9]", "");
            if (cleanNumber.startsWith("91") && cleanNumber.length() == 12) {
                cleanNumber = cleanNumber.substring(2);
            }

            String url = "https://www.fast2sms.com/dev/bulkV2?authorization=" + apiKey +
                    "&route=q&message=" + URLEncoder.encode(message, StandardCharsets.UTF_8) +
                    "&language=english&flash=0&numbers=" + cleanNumber;

            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            logger.info("Fast2SMS response status: {}", response.getStatusCode());
        } catch (Exception ex) {
            logger.error("Fast2SMS transmission error: {}", ex.getMessage());
        }
    }

    private void sendViaTwilio(String phoneNumber, String message) {
        try {
            String url = "https://api.twilio.com/2010-04-01/Accounts/" + twilioSid + "/Messages.json";
            HttpHeaders headers = new HttpHeaders();
            headers.setBasicAuth(twilioSid, twilioToken);
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            String body = "To=" + URLEncoder.encode(phoneNumber, StandardCharsets.UTF_8) +
                    "&From=" + URLEncoder.encode(twilioPhone, StandardCharsets.UTF_8) +
                    "&Body=" + URLEncoder.encode(message, StandardCharsets.UTF_8);

            HttpEntity<String> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            logger.info("Twilio response status: {}", response.getStatusCode());
        } catch (Exception ex) {
            logger.error("Twilio transmission error: {}", ex.getMessage());
        }
    }
}
