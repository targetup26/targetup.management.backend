const leadRepository = require('./lead.repository');
const categoryRepository = require('./category.repository');
const subcategoryRepository = require('./subcategory.repository');
const { sequelize } = require('../../models');

const classificationService = {
    /**
     * Normalization Mapping Layer
     */
    normalizationMap: {
        'gym': 'Fitness',
        'fitness_center': 'Fitness',
        'restaurant': 'Food & Beverage',
        'cafe': 'Food & Beverage',
        'bar': 'Food & Beverage',
        'dentist': 'Medical',
        'doctor': 'Medical',
        'hospital': 'Medical',
        'real_estate_agency': 'Real Estate',
        'car_dealer': 'Automotive',
        'car_repair': 'Automotive',
        'beauty_salon': 'Beauty & Wellness',
        'spa': 'Beauty & Wellness',
        'hair_care': 'Beauty & Wellness',
        'lawyer': 'Legal',
        'school': 'Education',
        'university': 'Education',
        'hotel': 'Travel & Hospitality'
    },

    /**
     * Generate URL-friendly slug
     */
    generateSlug(text) {
        return text.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    },

    /**
     * Classify a lead based on signals
     */
    async classifyAndStore(leadData, transaction = null) {
        const localTransaction = !transaction ? await sequelize.transaction() : null;
        const tx = transaction || localTransaction;

        try {
            // 1. Duplicate Protection
            const existing = await leadRepository.findByPhoneOrEmail(leadData.phone, leadData.email);
            if (existing) {
                if (localTransaction) await localTransaction.rollback();
                return { skipped: true, reason: 'Duplicate', lead: existing };
            }

            // 2. Extract Business Signals
            const googleTypes = leadData.google_types || [];
            const title = leadData.business_name || '';
            const searchKeyword = leadData.search_keyword || '';

            // 3. Scoring System
            let bestMatch = { category: 'General', score: 0, subcategory: null };

            // Check Google Types (+50)
            for (const type of googleTypes) {
                const normalized = this.normalizationMap[type.toLowerCase()];
                if (normalized) {
                    bestMatch = { category: normalized, score: 50, subcategory: type };
                    break; // High confidence match
                }
            }

            // Check Title Keywords (+30)
            if (bestMatch.score < 50) {
                for (const [key, value] of Object.entries(this.normalizationMap)) {
                    if (title.toLowerCase().includes(key.toLowerCase())) {
                        bestMatch = { category: value, score: 30, subcategory: key };
                        break;
                    }
                }
            }

            // Check Search Keyword (+20)
            if (bestMatch.score < 20 && searchKeyword) {
                const normalized = this.normalizationMap[searchKeyword.toLowerCase()];
                if (normalized) {
                    bestMatch = { category: normalized, score: 20, subcategory: searchKeyword };
                }
            }

            // 4. Resolve/Create Category
            const categorySlug = this.generateSlug(bestMatch.category);
            let category = await categoryRepository.findBySlug(categorySlug);

            if (!category) {
                category = await categoryRepository.create({
                    name: bestMatch.category,
                    slug: categorySlug,
                    lead_count: 0
                }, tx);
            }

            // 5. Resolve/Create Subcategory
            const subName = bestMatch.subcategory || 'General';
            const subSlug = this.generateSlug(subName);
            let subcategory = await subcategoryRepository.findBySlug(category.id, subSlug);

            if (!subcategory) {
                subcategory = await subcategoryRepository.create({
                    category_id: category.id,
                    name: subName,
                    slug: subSlug,
                    lead_count: 0
                }, tx);
            }

            // 6. Assign Lead
            const lead = await leadRepository.create({
                ...leadData,
                category_id: category.id,
                subcategory_id: subcategory.id,
                classification_confidence: bestMatch.score
            }, tx);

            // 7. Update Counters
            await categoryRepository.incrementLeadCount(category.id, 1, tx);
            await subcategoryRepository.incrementLeadCount(subcategory.id, 1, tx);

            if (localTransaction) await localTransaction.commit();

            return { skipped: false, lead, category, subcategory };

        } catch (error) {
            if (localTransaction) await localTransaction.rollback();
            throw error;
        }
    }
};

module.exports = classificationService;
