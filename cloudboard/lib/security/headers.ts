/**
 * lib/security/headers.ts
 * Security Headers Configuration for CloudBoard.
 * Use these headers for AWS CloudFront Response Headers Policy and static headers.
 */

export const SECURITY_HEADERS = {
  // Enforce HTTPS
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Restrict browser features and APIs
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.amazonaws.com https://cognito-idp.*.amazonaws.com https://*.execute-api.*.amazonaws.com",
    "frame-ancestors 'none'",
  ].join('; '),
};
