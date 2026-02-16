const categoryRepository = require('./category.repository');

const categoryService = {
    /**
     * Get all categories with stats
     */
    async getAllCategories() {
        return await categoryRepository.findAllWithStats();
    }
};

module.exports = categoryService;
