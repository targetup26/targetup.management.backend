// Simple Chat Rate Limiter
const lastRequest = new Map();

const chatRateLimiter = (req, res, next) => {
    const userId = req.user.id;
    const now = Date.now();
    const cooldown = 1000; // 1 second cooldown

    if (lastRequest.has(userId)) {
        const diff = now - lastRequest.get(userId);
        if (diff < cooldown) {
            return res.status(429).json({
                error: 'Too many messages. Please wait a moment.'
            });
        }
    }

    lastRequest.set(userId, now);
    next();
};

module.exports = chatRateLimiter;
