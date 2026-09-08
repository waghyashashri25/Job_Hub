package com.example.backend.service;

import com.example.backend.model.ApplicationStatus;
import com.example.backend.model.Job;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.mail.from-name:JobHub AI Platform}")
    private String fromName;

    @Value("${app.mail.from-email:support@jobhub.com}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Check whether active real SMTP mail sender credentials are provided.
     */
    public boolean isMailConfigured() {
        return mailUsername != null && !mailUsername.trim().isBlank();
    }

    /**
     * Check whether destination email is a real deliverable external domain
     * (skips dummy guest/test domains like .local, .test, example.com to avoid bounce-backs).
     */
    public static boolean isDeliverableEmail(String email) {
        if (email == null || email.trim().isBlank()) return false;
        String e = email.trim().toLowerCase();
        if (!e.contains("@") || !e.contains(".")) return false;
        if (e.endsWith(".local") || e.endsWith(".test") || e.endsWith(".invalid") || e.endsWith(".example") || e.endsWith("@localhost")) {
            return false;
        }
        if (e.contains("@jobportal.local") || e.contains("@jobhub.local") || e.contains("@example.com") || e.contains("@test.com")) {
            return false;
        }
        return true;
    }

    // ==========================================
    // 1. REGISTRATION OTP EMAIL
    // ==========================================
    @Async
    public void sendRegistrationOtpEmail(String toEmail, String userName, String otpCode) {
        String subject = "Your JobHub Registration Verification Code: " + otpCode;
        String content = buildOtpEmailHtml(
                userName,
                "Verify Your JobHub Account",
                "Thank you for joining JobHub! Please enter the 6-digit verification code below to verify your email address and activate your account.",
                otpCode,
                "This code is valid for 10 minutes. Never share your OTP with anyone."
        );
        sendHtmlEmail(toEmail, subject, content, otpCode);
    }

    // ==========================================
    // 2. REGISTRATION SUCCESS EMAIL
    // ==========================================
    @Async
    public void sendRegistrationSuccessEmail(String toEmail, String userName) {
        String subject = "Welcome to JobHub! Your account is active";
        String content = buildNotificationEmailHtml(
                userName,
                "Welcome to JobHub! 🚀",
                "Your account is verified and ready. You now have full access to our AI Career Intelligence suite, aggregated job boards, and auto-matching features.",
                "Explore Opportunities",
                frontendUrl + "/jobs",
                "Tip: Complete your profile and upload your resume to unlock high-accuracy AI match scoring."
        );
        sendHtmlEmail(toEmail, subject, content, null);
    }

    // ==========================================
    // 4. INTERVIEW INVITATION EMAIL
    // ==========================================
    @Async
    public void sendInterviewInviteEmail(String toEmail, String candidateName, String jobTitle, String company, String interviewTime, String meetingLink, String round, String notes) {
        String targetEmail = resolveRecipientEmail(toEmail);
        if (targetEmail == null) return;

        String subject = "Interview Invitation: " + jobTitle + " at " + (company != null ? company : "JobHub Partner");
        String safeMeetingLink = (meetingLink != null && !meetingLink.isBlank()) ? meetingLink.trim() : frontendUrl + "/applications";
        String roundText = (round != null && !round.isBlank()) ? round : "Technical Assessment";

        String description = String.format(
            "Congratulations! The hiring team has reviewed your application for <strong>%s</strong> and would like to invite you for the <strong>%s</strong> round.<br/><br/>" +
            "<strong>📅 Scheduled Time:</strong> %s<br/>" +
            "<strong>🏢 Company:</strong> %s<br/>" +
            "<strong>📝 Recruiter Notes:</strong> %s",
            escapeHtml(jobTitle),
            escapeHtml(roundText),
            escapeHtml(interviewTime != null ? interviewTime : "To be coordinated"),
            escapeHtml(company != null ? company : "JobHub Partner"),
            escapeHtml(notes != null && !notes.isBlank() ? notes : "Please be ready 5 minutes before the session.")
        );

        String content = buildNotificationEmailHtml(
            candidateName,
            "You're Invited to an Interview! 🎉",
            description,
            "Join Video Interview",
            safeMeetingLink,
            "Need to reschedule? Please reply directly to this email or update your status in JobHub."
        );

        sendHtmlEmail(targetEmail, subject, content, null);
    }

    // ==========================================
    // 2.5. FORMAL EMPLOYMENT OFFER LETTER EMAIL
    // ==========================================
    @Async
    public void sendOfferLetterEmail(
            String toEmail,
            String candidateName,
            String designation,
            String company,
            String salary,
            String joiningDate,
            String benefits,
            String instructions
    ) {
        String targetEmail = resolveRecipientEmail(toEmail);
        if (targetEmail == null) return;

        String safeName = (candidateName != null && !candidateName.isBlank()) ? candidateName : "Candidate";
        String subject = "🎉 Formal Offer of Employment: " + designation + " at " + company;

        String description = String.format(
            "Congratulations %s!<br/><br/>" +
            "On behalf of <strong>%s</strong>, we are thrilled to extend an official offer of employment for the role of <strong>%s</strong>.<br/><br/>" +
            "<strong>OFFER HIGHLIGHTS:</strong><br/>" +
            "&bull; <strong>Designation:</strong> %s<br/>" +
            "&bull; <strong>Annual Compensation:</strong> %s<br/>" +
            "&bull; <strong>Expected Start Date:</strong> %s<br/>" +
            "&bull; <strong>Key Benefits:</strong> %s<br/><br/>" +
            "<strong>NEXT STEPS:</strong><br/>%s",
            escapeHtml(safeName),
            escapeHtml(company),
            escapeHtml(designation),
            escapeHtml(designation),
            escapeHtml(salary),
            escapeHtml(joiningDate),
            escapeHtml(benefits != null && !benefits.isBlank() ? benefits : "Standard Company Benefits & Health Coverage"),
            escapeHtml(instructions != null && !instructions.isBlank() ? instructions : "Please review and confirm your acceptance through your JobHub candidate portal.")
        );

        String content = buildNotificationEmailHtml(
            safeName,
            "Official Employment Offer Letter 🎉",
            description,
            "View Offer & Respond",
            frontendUrl + "/applications",
            "This offer is confidential and prepared exclusively for you."
        );

        sendHtmlEmail(targetEmail, subject, content, null);
    }

    // ==========================================
    // 2.6. RECRUITER CHAT MESSAGE NOTIFICATION EMAIL (TO CANDIDATE)
    // ==========================================
    @Async
    public void sendRecruiterMessageNotificationEmail(
            String toEmail,
            String candidateName,
            String recruiterName,
            String company,
            String jobTitle,
            String messageSnippet
    ) {
        String targetEmail = resolveRecipientEmail(toEmail);
        if (targetEmail == null) return;

        String safeCandidate = (candidateName != null && !candidateName.isBlank()) ? candidateName : "Candidate";
        String safeRecruiter = (recruiterName != null && !recruiterName.isBlank()) ? recruiterName : "Hiring Recruiter";
        String safeCompany = (company != null && !company.isBlank()) ? company : "Hiring Partner";
        String safeJob = (jobTitle != null && !jobTitle.isBlank()) ? jobTitle : "Position";
        String safeMessage = (messageSnippet != null && !messageSnippet.isBlank()) ? messageSnippet : "You have a new message from the recruiter.";

        String subject = "💬 New Message from " + safeCompany + " regarding " + safeJob;

        String description = String.format(
            "You have received a new message from <strong>%s</strong> at <strong>%s</strong> regarding your application for <strong>%s</strong>:<br/><br/>" +
            "<div style=\"background: #f8fafc; padding: 14px 18px; border-radius: 8px; font-style: italic; color: #1e293b; line-height: 1.5; font-size: 14px; margin: 8px 0 16px 0; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb;\">" +
            "&ldquo;%s&rdquo;" +
            "</div>" +
            "Click the button below to view the conversation and reply directly to the hiring team.",
            escapeHtml(safeRecruiter),
            escapeHtml(safeCompany),
            escapeHtml(safeJob),
            escapeHtml(safeMessage)
        );

        String content = buildNotificationEmailHtml(
            safeCandidate,
            "New Message from Recruiter 💬",
            description,
            "View & Reply to Message",
            frontendUrl + "/jobs?tab=applications",
            "You received this notification because you applied to " + safeCompany + " on JobHub."
        );

        sendHtmlEmail(targetEmail, subject, content, null);
    }

    // ==========================================
    // 2.7. CANDIDATE CHAT MESSAGE NOTIFICATION EMAIL (TO RECRUITER)
    // ==========================================
    @Async
    public void sendCandidateMessageNotificationEmail(
            String toEmail,
            String recruiterName,
            String candidateName,
            String company,
            String jobTitle,
            String messageSnippet
    ) {
        String targetEmail = resolveRecipientEmail(toEmail);
        if (targetEmail == null) return;

        String safeRecruiter = (recruiterName != null && !recruiterName.isBlank()) ? recruiterName : "Hiring Team";
        String safeCandidate = (candidateName != null && !candidateName.isBlank()) ? candidateName : "Candidate";
        String safeCompany = (company != null && !company.isBlank()) ? company : "Company";
        String safeJob = (jobTitle != null && !jobTitle.isBlank()) ? jobTitle : "Position";
        String safeMessage = (messageSnippet != null && !messageSnippet.isBlank()) ? messageSnippet : "New message from candidate.";

        String subject = "💬 New Candidate Message from " + safeCandidate + " regarding " + safeJob;

        String description = String.format(
            "Candidate <strong>%s</strong> has sent a new message regarding their application for <strong>%s</strong> at <strong>%s</strong>:<br/><br/>" +
            "<div style=\"background: #f8fafc; padding: 14px 18px; border-radius: 8px; font-style: italic; color: #1e293b; line-height: 1.5; font-size: 14px; margin: 8px 0 16px 0; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb;\">" +
            "&ldquo;%s&rdquo;" +
            "</div>" +
            "Click the button below to open your Recruiter ATS dashboard and reply.",
            escapeHtml(safeCandidate),
            escapeHtml(safeJob),
            escapeHtml(safeCompany),
            escapeHtml(safeMessage)
        );

        String content = buildNotificationEmailHtml(
            safeRecruiter,
            "New Candidate Message 💬",
            description,
            "Open Recruiter Portal",
            frontendUrl + "/recruiter",
            "Candidate communication via JobHub Talent Platform."
        );

        sendHtmlEmail(targetEmail, subject, content, null);
    }

    // ==========================================
    // 2.8. CANDIDATE APPLICATION STATUS UPDATE EMAIL
    // ==========================================
    @Async
    public void sendApplicationStatusUpdateEmail(
            String toEmail,
            String candidateName,
            String jobTitle,
            String company,
            ApplicationStatus newStatus,
            String notes,
            String recruiterName
    ) {
        String targetEmail = resolveRecipientEmail(toEmail);
        if (targetEmail == null) return;

        String safeCandidate = (candidateName != null && !candidateName.isBlank()) ? candidateName : "Candidate";
        String safeJob = (jobTitle != null && !jobTitle.isBlank()) ? jobTitle : "Position";
        String safeCompany = (company != null && !company.isBlank()) ? company : "Hiring Company";
        String safeRecruiter = (recruiterName != null && !recruiterName.isBlank()) ? recruiterName : "Recruiter";
        String statusName = newStatus != null ? newStatus.name() : "UPDATED";

        String subject;
        String title;
        String mainText;
        String buttonText = "View Application Status";
        String buttonUrl = frontendUrl + "/jobs?tab=applications";
        String badgeColor = "#2563eb"; // Blue

        switch (statusName) {
            case "SHORTLISTED":
                subject = "🎯 Shortlisted! Your application for " + safeJob + " at " + safeCompany;
                title = "Application Shortlisted! 🎯";
                mainText = "Great news! The hiring team at <strong>" + escapeHtml(safeCompany) + "</strong> has reviewed your profile and shortlisted your application for <strong>" + escapeHtml(safeJob) + "</strong>. You have advanced to the next stage of our evaluation process.";
                badgeColor = "#059669"; // Emerald Green
                break;
            case "INTERVIEW":
                subject = "📅 Interview Stage: Application for " + safeJob + " at " + safeCompany;
                title = "Interview Stage Active 📅";
                mainText = "Your application for <strong>" + escapeHtml(safeJob) + "</strong> at <strong>" + escapeHtml(safeCompany) + "</strong> has progressed to the <strong>Interview stage</strong>. The recruitment team is coordinating the session and will share the schedule/link.";
                buttonText = "View Interview Details";
                badgeColor = "#7c3aed"; // Purple
                break;
            case "OFFER":
                subject = "🎉 Offer Extended: Application for " + safeJob + " at " + safeCompany;
                title = "Job Offer Extended! 🎉";
                mainText = "Congratulations! <strong>" + escapeHtml(safeCompany) + "</strong> has extended a formal employment offer for the role of <strong>" + escapeHtml(safeJob) + "</strong>. Please access your candidate portal to review and confirm the offer details.";
                buttonText = "Review Offer Details";
                badgeColor = "#d97706"; // Amber Gold
                break;
            case "REJECTED":
                subject = "Application Update: " + safeJob + " at " + safeCompany;
                title = "Application Status Update";
                mainText = "Thank you for your interest and the time you invested in applying for the <strong>" + escapeHtml(safeJob) + "</strong> opportunity at <strong>" + escapeHtml(safeCompany) + "</strong>.<br/><br/>" +
                           "After careful consideration, the hiring team has decided to proceed with other candidates whose profiles more closely align with the immediate role requirements at this time. We strongly encourage you to explore other relevant openings on JobHub.";
                buttonText = "Explore Other Opportunities";
                buttonUrl = frontendUrl + "/jobs";
                badgeColor = "#64748b"; // Slate Gray
                break;
            default:
                subject = "Application Status Update: " + safeJob + " at " + safeCompany;
                title = "Application Status: " + statusName;
                mainText = "Your application for <strong>" + escapeHtml(safeJob) + "</strong> at <strong>" + escapeHtml(safeCompany) + "</strong> has been updated to <strong>" + statusName + "</strong>.";
                break;
        }

        StringBuilder descBuilder = new StringBuilder();
        descBuilder.append(mainText);

        // Status badge pill
        descBuilder.append("<div style=\"margin: 20px 0 16px 0;\">")
                   .append("<span style=\"display: inline-block; background: ").append(badgeColor).append("; color: #ffffff; padding: 6px 16px; border-radius: 9999px; font-weight: 700; font-size: 13px; letter-spacing: 0.5px;\">")
                   .append("CURRENT STATUS: ").append(statusName)
                   .append("</span>")
                   .append("</div>");

        // Optional recruiter notes
        if (notes != null && !notes.trim().isBlank()) {
            descBuilder.append("<div style=\"background: #f8fafc; padding: 14px 18px; border-radius: 8px; font-style: italic; color: #1e293b; line-height: 1.5; font-size: 14px; margin: 12px 0 16px 0; border: 1px solid #e2e8f0; border-left: 4px solid ").append(badgeColor).append(";\">")
                       .append("<strong>💬 Recruiter Note:</strong> &ldquo;").append(escapeHtml(notes.trim())).append("&rdquo;")
                       .append("</div>");
        }

        String content = buildNotificationEmailHtml(
                safeCandidate,
                title,
                descBuilder.toString(),
                buttonText,
                buttonUrl,
                "Updated by " + safeRecruiter + " &bull; JobHub Talent Notification Service."
        );

        sendHtmlEmail(targetEmail, subject, content, null);
    }

    // ==========================================
    // 2.9. NEW APPLICATION NOTIFICATION EMAIL (TO RECRUITER)
    // ==========================================
    @Async
    public void sendNewApplicationNotificationEmail(
            String toEmail,
            String recruiterName,
            String candidateName,
            String jobTitle,
            String company,
            String candidateEmail,
            String candidateSkills,
            String coverNote
    ) {
        String targetEmail = resolveRecipientEmail(toEmail);
        if (targetEmail == null) return;

        String safeRecruiter = (recruiterName != null && !recruiterName.isBlank()) ? recruiterName : "Hiring Team";
        String safeCandidate = (candidateName != null && !candidateName.isBlank()) ? candidateName : "Candidate";
        String safeJob = (jobTitle != null && !jobTitle.isBlank()) ? jobTitle : "Position";
        String safeCompany = (company != null && !company.isBlank()) ? company : "Company";
        String safeSkills = (candidateSkills != null && !candidateSkills.isBlank()) ? candidateSkills : "Not specified";

        String subject = "🚀 New Direct Application: " + safeCandidate + " for " + safeJob;

        StringBuilder descBuilder = new StringBuilder();
        descBuilder.append("A candidate has directly submitted an application for your opening <strong>")
                   .append(escapeHtml(safeJob)).append("</strong> at <strong>")
                   .append(escapeHtml(safeCompany)).append("</strong>.<br/><br/>");

        descBuilder.append("<div style=\"background: #f8fafc; padding: 14px 18px; border-radius: 8px; font-size: 14px; margin: 12px 0 16px 0; border: 1px solid #e2e8f0; border-left: 4px solid #10b981;\">")
                   .append("<strong>👤 Candidate:</strong> ").append(escapeHtml(safeCandidate)).append("<br/>")
                   .append("<strong>📧 Email:</strong> ").append(escapeHtml(candidateEmail != null ? candidateEmail : "N/A")).append("<br/>")
                   .append("<strong>🛠️ Skills:</strong> ").append(escapeHtml(safeSkills)).append("<br/>");

        if (coverNote != null && !coverNote.trim().isBlank()) {
            descBuilder.append("<br/><strong>💬 Candidate Note:</strong><br/><em>&ldquo;")
                       .append(escapeHtml(coverNote.trim()))
                       .append("&rdquo;</em>");
        }
        descBuilder.append("</div>");
        descBuilder.append("Click below to open your ATS pipeline, review the applicant's full profile, and progress their application.");

        String content = buildNotificationEmailHtml(
                safeRecruiter,
                "New Candidate Application 🚀",
                descBuilder.toString(),
                "Open Recruiter ATS",
                frontendUrl + "/recruiter",
                "JobHub Talent Acquisition & Automated Matching System."
        );

        sendHtmlEmail(targetEmail, subject, content, null);
    }

    /**
     * Resolves the actual email recipient. If the recipient is a local guest or dummy
     * placeholder domain (e.g. guest@jobportal.local), automatically redirects to the configured
     * active administrator/developer mailbox so test/demo notifications are delivered without bounce.
     */
    private String resolveRecipientEmail(String email) {
        if (email == null || email.trim().isBlank()) {
            return (mailUsername != null && !mailUsername.isBlank()) ? mailUsername.trim() : null;
        }
        String clean = email.trim();
        if (!isDeliverableEmail(clean)) {
            if (mailUsername != null && !mailUsername.isBlank()) {
                logger.info("Redirecting demo message notification for guest/placeholder user ({}) to configured mailbox ({})", clean, mailUsername);
                return mailUsername.trim();
            }
            return null;
        }
        return clean;
    }


    // ==========================================
    // 3. LOGIN OTP EMAIL
    // ==========================================
    @Async
    public void sendLoginOtpEmail(String toEmail, String userName, String otpCode) {
        String subject = "Your JobHub Sign-In Verification Code: " + otpCode;
        String content = buildOtpEmailHtml(
                userName,
                "JobHub Secure Sign-In",
                "A sign-in attempt was initiated for your JobHub account. Please enter the verification code below to complete your login securely.",
                otpCode,
                "If you did not attempt to sign in, please secure your account immediately."
        );
        sendHtmlEmail(toEmail, subject, content, otpCode);
    }

    // ==========================================
    // 4. LOGIN WELCOME / SECURITY ALERT EMAIL
    // ==========================================
    @Async
    public void sendLoginAlertEmail(String toEmail, String userName) {
        String subject = "Welcome back to JobHub! Sign-In Confirmed";
        String content = buildNotificationEmailHtml(
                userName,
                "Welcome Back to JobHub",
                "You have successfully signed in to your JobHub account. We are actively tracking fresh career opportunities matching your profile across verified tech boards.",
                "Go to Dashboard",
                frontendUrl + "/jobs",
                "Notice: If this sign-in was not authorized by you, please reset your password immediately."
        );
        sendHtmlEmail(toEmail, subject, content, null);
    }

    // ==========================================
    // 5. FORGOT PASSWORD OTP EMAIL
    // ==========================================
    @Async
    public void sendForgotPasswordOtpEmail(String toEmail, String userName, String otpCode) {
        String subject = "JobHub Password Reset Code: " + otpCode;
        String content = buildOtpEmailHtml(
                userName,
                "Reset Your JobHub Password",
                "We received a request to reset the password for your JobHub account. Enter the verification code below to proceed with setting a new password.",
                otpCode,
                "This password reset code will expire in 10 minutes. If you did not request this, you can safely ignore this email."
        );
        sendHtmlEmail(toEmail, subject, content, otpCode);
    }

    // ==========================================
    // 6. PASSWORD RESET SUCCESS EMAIL
    // ==========================================
    @Async
    public void sendPasswordResetSuccessEmail(String toEmail, String userName) {
        String subject = "Security Alert: JobHub Password Reset Successfully";
        String content = buildNotificationEmailHtml(
                userName,
                "Password Reset Confirmed",
                "Your JobHub password was successfully updated. You can now sign in using your new credentials.",
                "Sign In Now",
                frontendUrl + "/login",
                "If you did not perform this change, please contact support immediately to lock your account."
        );
        sendHtmlEmail(toEmail, subject, content, null);
    }

    // ==========================================
    // 7. AI RESUME JOB MATCH NOTIFICATION EMAIL
    // ==========================================
    @Async
    public void sendJobMatchNotificationEmail(String toEmail, String userName, List<Job> matchedJobs, Map<Long, Integer> matchScores) {
        if (matchedJobs == null || matchedJobs.isEmpty()) return;

        String subject = "🎯 " + matchedJobs.size() + " New Job Matches for Your Profile on JobHub";
        StringBuilder jobCardsHtml = new StringBuilder();

        for (Job job : matchedJobs) {
            int score = matchScores != null && matchScores.containsKey(job.getId())
                    ? matchScores.get(job.getId())
                    : 85;

            jobCardsHtml.append(String.format(
                """
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div>
                            <h3 style="margin: 0 0 4px 0; color: #0f172a; font-size: 16px; font-weight: 700;">%s</h3>
                            <p style="margin: 0; color: #2563eb; font-weight: 600; font-size: 14px;">%s &bull; <span style="color: #64748b; font-weight: normal;">%s</span></p>
                        </div>
                        <span style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">
                            %d%% AI Match
                        </span>
                    </div>
                    <div style="margin-top: 12px;">
                        <a href="%s" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                            View &amp; Apply &rarr;
                        </a>
                    </div>
                </div>
                """,
                escapeHtml(job.getTitle()),
                escapeHtml(job.getCompany()),
                escapeHtml(job.getLocation()),
                score,
                job.getApplyLink() != null && !job.getApplyLink().isBlank() ? job.getApplyLink() : frontendUrl + "/jobs"
            ));
        }

        String content = String.format(
            """
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 30px 20px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background: #2563eb; color: #ffffff; padding: 8px 18px; border-radius: 10px; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
                        JobHub
                    </div>
                    <p style="color: #64748b; font-size: 13px; margin: 6px 0 0 0;">AI-Powered Career Intelligence</p>
                </div>

                <div style="background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15,23,42,0.05);">
                    <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">Hi %s,</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
                        Our AI matching engine analyzed the latest job postings against your resume skills and discovered <strong>%d high-matching opportunities</strong> for you today!
                    </p>

                    <div style="margin-bottom: 24px;">
                        %s
                    </div>

                    <div style="text-align: center; margin-top: 24px;">
                        <a href="%s/jobs" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700;">
                            Explore All Matches on JobHub
                        </a>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                    <p style="margin: 4px 0;">JobHub AI Platform &bull; Real-time Job Opportunity Matching</p>
                    <p style="margin: 4px 0;">You received this email because your resume job alerts are active.</p>
                </div>
            </div>
            """,
            escapeHtml(userName != null ? userName : "Candidate"),
            matchedJobs.size(),
            jobCardsHtml.toString(),
            frontendUrl
        );

        sendHtmlEmail(toEmail, subject, content, null);
    }

    // ==========================================
    // EMAIL SENDER HELPER
    // ==========================================
    private void sendHtmlEmail(String toEmail, String subject, String htmlContent, String otpForLog) {
        if (toEmail == null || toEmail.trim().isBlank()) {
            logger.warn("⚠️ Skipping email delivery: recipient email is null or empty");
            return;
        }

        String destination = toEmail.trim();

        if (!isDeliverableEmail(destination)) {
            logger.info("ℹ️ Skipped real SMTP delivery for non-deliverable/guest address: {}", destination);
            return;
        }

        // Prominently log to console for development / verification
        logger.info("===============================================================================");
        logger.info("[REAL EMAIL DISPATCH] TO: {} | SUBJECT: {}", destination, subject);
        if (otpForLog != null) {
            logger.info("[ACTIVE OTP CODE] >>> {} <<< for destination: {}", otpForLog, destination);
        }
        logger.info("===============================================================================");

        if (!isMailConfigured()) {
            logger.warn("SMTP mail credentials are not configured in application.properties/env. Logged OTP above.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String senderEmail = (mailUsername != null && !mailUsername.isBlank()) ? mailUsername.trim() : fromEmail.trim();
            helper.setFrom(senderEmail, fromName);
            helper.setTo(destination);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("✅ Real email successfully sent via SMTP to {}", destination);
        } catch (Exception ex) {
            logger.error("❌ Failed to transmit real email to {}: {}", destination, ex.getMessage(), ex);
        }
    }

    private String buildOtpEmailHtml(String userName, String title, String description, String otpCode, String footerNote) {
        String displayName = (userName != null && !userName.isBlank()) ? userName : "User";
        return String.format(
            """
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #f8fafc; padding: 32px 20px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background: #2563eb; color: #ffffff; padding: 8px 18px; border-radius: 10px; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                        JobHub
                    </div>
                    <p style="color: #64748b; font-size: 13px; margin: 6px 0 0 0;">AI Powered Job Hunt Platform</p>
                </div>

                <div style="background: #ffffff; border-radius: 16px; padding: 32px 28px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15,23,42,0.05); text-align: center;">
                    <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;">%s</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.5; margin-bottom: 24px; text-align: left;">
                        Hi <strong>%s</strong>,<br/><br/>
                        %s
                    </p>

                    <div style="background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 18px 24px; display: inline-block; margin: 0 auto 24px auto;">
                        <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: 'Courier New', Courier, monospace;">
                            %s
                        </span>
                    </div>

                    <p style="color: #64748b; font-size: 13px; line-height: 1.4; margin: 0 0 8px 0;">
                        %s
                    </p>
                </div>

                <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                    <p style="margin: 4px 0;">JobHub AI Platform &bull; Security &amp; Authentication Team</p>
                    <p style="margin: 4px 0;">This is an automated system message. Please do not reply directly to this email.</p>
                </div>
            </div>
            """,
            escapeHtml(title),
            escapeHtml(displayName),
            escapeHtml(description),
            otpCode,
            escapeHtml(footerNote)
        );
    }

    private String buildNotificationEmailHtml(String userName, String title, String description, String buttonText, String buttonUrl, String footerNote) {
        String displayName = (userName != null && !userName.isBlank()) ? userName : "User";
        return String.format(
            """
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #f8fafc; padding: 32px 20px; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background: #2563eb; color: #ffffff; padding: 8px 18px; border-radius: 10px; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                        JobHub
                    </div>
                    <p style="color: #64748b; font-size: 13px; margin: 6px 0 0 0;">AI Powered Job Hunt Platform</p>
                </div>

                <div style="background: #ffffff; border-radius: 16px; padding: 32px 28px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15,23,42,0.05); text-align: left;">
                    <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;">%s</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
                        Hello <strong>%s</strong>,
                    </p>
                    <div style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                        %s
                    </div>

                    <div style="text-align: center; margin: 28px 0;">
                        <a href="%s" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">
                            %s
                        </a>
                    </div>

                    <p style="color: #94a3b8; font-size: 13px; line-height: 1.4; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                        %s
                    </p>
                </div>

                <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                    <p style="margin: 4px 0;">JobHub AI Platform &bull; Security &amp; Career Services</p>
                </div>
            </div>
            """,
            escapeHtml(title),
            escapeHtml(displayName),
            description,
            buttonUrl,
            escapeHtml(buttonText),
            escapeHtml(footerNote)
        );
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }
}
