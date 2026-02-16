const NODE_ENV = process.env.NODE_ENV || 'development';

const logger = {
    info: (message, meta = {}) => {
        log('INFO', message, meta);
    },
    warn: (message, meta = {}) => {
        log('WARN', message, meta);
    },
    error: (message, meta = {}) => {
        log('ERROR', message, meta);
    },
    debug: (message, meta = {}) => {
        if (NODE_ENV === 'development') {
            log('DEBUG', message, meta);
        }
    }
};

function log(level, message, meta) {
    const timestamp = new Date().toISOString();

    // Sanitize sensitive keys
    const sanitizedMeta = { ...meta };
    ['password', 'secret', 'token', 'key', 'credential'].forEach(k => {
        if (sanitizedMeta[k]) sanitizedMeta[k] = '***';
    });

    if (NODE_ENV === 'production') {
        // JSON format for production (easy parsing by log aggregators)
        console.log(JSON.stringify({
            ts: timestamp,
            level,
            msg: message,
            ...sanitizedMeta
        }));
    } else {
        // Human-readable for dev
        const metaStr = Object.keys(sanitizedMeta).length ? JSON.stringify(sanitizedMeta) : '';
        console.log(`[${timestamp}] ${level}: ${message} ${metaStr}`);
    }
}

module.exports = logger;
