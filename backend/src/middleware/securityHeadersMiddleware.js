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
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    res.setHeader('Expect-CT', 'max-age=86400, enforce');

    next();
};

export const contentSecurityPolicy = (req, res, next) => {
    const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
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
