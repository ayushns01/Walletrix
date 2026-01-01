/**
 * Enhanced Security Headers Middleware
 * Implements comprehensive security headers for defense-in-depth
 */

export const securityHeaders = (req, res, next) => {
    // Prevent clickjacking attacks
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS filter (legacy browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy - don't leak referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy - restrict browser features
    res.setHeader(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
    );

    // Cross-Origin policies
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    // Expect-CT header for certificate transparency
    res.setHeader('Expect-CT', 'max-age=86400, enforce');

    next();
};

/**
 * Content Security Policy middleware
 * Strict CSP to prevent XSS attacks
 */
export const contentSecurityPolicy = (req, res, next) => {
    const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // TODO: Remove unsafe-inline in production
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://api.coingecko.com https://*.etherscan.io https://*.infura.io",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "media-src 'self'",
        "worker-src 'self'",
        "manifest-src 'self'",
    ].join('; ');

    res.setHeader('Content-Security-Policy', cspDirectives);
    next();
};

/**
 * HSTS (HTTP Strict Transport Security) middleware
 * Force HTTPS connections
 */
export const strictTransportSecurity = (req, res, next) => {
    // Only set HSTS in production with HTTPS
    if (process.env.NODE_ENV === 'production') {
        res.setHeader(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
        );
    }
    next();
};

/**
 * Combined security headers middleware
 */
export const allSecurityHeaders = (req, res, next) => {
    securityHeaders(req, res, () => {
        contentSecurityPolicy(req, res, () => {
            strictTransportSecurity(req, res, next);
        });
    });
};

export default {
    securityHeaders,
    contentSecurityPolicy,
    strictTransportSecurity,
    allSecurityHeaders,
};
