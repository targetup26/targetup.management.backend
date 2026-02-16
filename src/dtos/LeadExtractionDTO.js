/**
 * Lead Extraction DTO
 * Data Transfer Object for validating lead extraction requests
 */
class LeadExtractionDTO {
    static validate(data) {
        const errors = [];

        // Business type is required
        if (!data.business_type || data.business_type.trim() === '') {
            errors.push('business_type is required');
        }

        // At least one location parameter should be provided
        if (!data.city && !data.state && !data.country && !data.location) {
            errors.push('At least one location parameter (city, state, country, or location) is required');
        }

        // Max results validation
        if (data.max_results) {
            const maxResults = parseInt(data.max_results);
            if (isNaN(maxResults) || maxResults < 1 || maxResults > 1000) {
                errors.push('max_results must be between 1 and 1000');
            }
        }

        // Manual URLs validation
        if (data.manual_urls && Array.isArray(data.manual_urls)) {
            data.manual_urls.forEach((url, index) => {
                if (!url.startsWith('http')) {
                    errors.push(`manual_urls[${index}] must be a valid URL`);
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static sanitize(data) {
        return {
            business_type: (data.business_type || '').trim(),
            city: (data.city || '').trim(),
            state: (data.state || '').trim(),
            country: (data.country || 'us').toLowerCase().trim(),
            location: (data.location || '').trim(),
            max_results: parseInt(data.max_results) || 50,
            include_closed: Boolean(data.include_closed),
            manual_urls: Array.isArray(data.manual_urls) ? data.manual_urls : []
        };
    }
}

module.exports = LeadExtractionDTO;
