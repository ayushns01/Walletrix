export const securityHeaders = (req, res, next) => {

    res.setHeader('X-Frame-Options', 'DENY');

    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.setHeader('X-XSS-Protection', '1; mode=block');

    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    res.setHeader(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
    );

    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    // Note: COEP require-corp and CORP same-origin removed — they block
    // cross-origin API requests from the frontend (different origin).

    // Expect-CT removed — deprecated and enforced by all modern browsers by default.

    next();
};


export const contentSecurityPolicy = (req, res, next) => {
    // Allow unsafe-inline only for Swagger docs; stricter CSP elsewhere
    const isSwaggerPath = req.path.startsWith('/api/docs') || req.path.startsWith('/api-docs');
    const scriptSrc = isSwaggerPath ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'";
    const styleSrc = isSwaggerPath ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'";

    const cspDirectives = [
        "default-src 'self'",
        scriptSrc,
        styleSrc,
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

export const strictTransportSecurity = (req, res, next) => {

    if (process.env.NODE_ENV === 'production') {
        res.setHeader(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
        );
    }
    next();
};

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
