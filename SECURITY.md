# Security Guidelines

This document outlines important security practices for the Job Portal project.

## Before Deploying to Production

### 1. Environment Variables

- **DO NOT** commit `.env` files to version control
- **DO** use `.env.example` as templates
- **DO** change all default values in `.env` files before deployment

### 2. JWT Secret

- Generate a strong, random JWT secret for production
- Example: `openssl rand -base64 64`
- Update `JWT_SECRET` in Backend `.env`

### 3. Database Credentials

- Use strong database passwords (minimum 16 characters, mix of uppercase, lowercase, numbers, special characters)
- Update `DB_PASSWORD` in Backend `.env`
- Consider using database connection pooling in production

### 4. CORS Configuration

- Configure `CORS_ALLOWED_ORIGINS` to only allow trusted frontend URLs
- Example: `CORS_ALLOWED_ORIGINS=https://yourfrontend.com`
- Remove localhost URLs from production `.env`

### 5. API Keys

- Store third-party API keys (Adzuna, JSearch, USA Jobs) in `.env`, never in code
- Rotate API keys periodically
- Monitor API usage for unusual patterns

### 6. HTTPS

- Always use HTTPS in production (not HTTP)
- Obtain SSL/TLS certificates from trusted CAs (Let's Encrypt, AWS Certificate Manager, etc.)
- Configure secure cookie settings

### 7. Authentication Tokens

- Implement token expiration (default: 1 hour)
- Use secure, httpOnly cookies for sensitive operations if possible
- Implement refresh token mechanism for long-lived sessions

### 8. Dependency Management

- Keep dependencies up to date
- Run security vulnerability scans:
  - Frontend: `npm audit`
  - Backend: `./mvnw dependency-check:check`
- Update regularly

### 9. Input Validation

- Validate all user inputs on both Frontend and Backend
- Sanitize user data before storing in database
- Use parameterized queries to prevent SQL injection

### 10. Error Handling

- Don't expose stack traces or sensitive information in API error responses
- Log errors securely on Backend
- Use generic error messages for clients

## Git Security Checklist

Before committing code:

- [ ] No `.env` files committed (only `.env.example`)
- [ ] No API keys in code comments or files
- [ ] No database passwords in files
- [ ] No JWT secrets in code
- [ ] `.gitignore` properly configured
- [ ] Sensitive files excluded from version control

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables in `.env` are production values
- [ ] Database credentials are strong and unique
- [ ] JWT_SECRET is a strong, random value
- [ ] CORS_ALLOWED_ORIGINS configured correctly
- [ ] HTTPS/SSL configured
- [ ] Dependencies are updated and security scanned
- [ ] Database backups configured
- [ ] Logging is configured securely
- [ ] Authentication and authorization working correctly
- [ ] No test/debug endpoints exposed in production

## Monitoring in Production

- Monitor application logs for suspicious activity
- Set up alerts for failed authentication attempts
- Review access logs regularly
- Monitor database for unusual queries
- Keep audit logs of admin actions

## Reporting Security Issues

If you discover a security vulnerability:

1. DO NOT open a public issue
2. Report privately to the maintainers
3. Include detailed description and reproduction steps
4. Allow time for response before public disclosure

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Spring Boot Security Documentation](https://spring.io/projects/spring-security)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/nodejs-security/)
