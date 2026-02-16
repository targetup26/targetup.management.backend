const categoryService = require('../modules/leads/category.service');
const subcategoryRepository = require('../modules/leads/subcategory.repository'); // Fallback to repositories for now
const leadRepository = require('../modules/leads/lead.repository');
const categoryRepository = require('../modules/leads/category.repository');
const { Subcategory } = require('../models');

const categoryController = {
    /**
     * GET /api/categories
     */
    getCategories: async (req, res) => {
        try {
            const categories = await categoryService.getAllCategories();
            res.json({ success: true, data: categories });
        } catch (error) {
            console.error('[CategoryController] getCategories error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    /**
     * GET /api/categories/:id
     */
    getCategoryById: async (req, res) => {
        try {
            const category = await categoryRepository.findById(req.params.id);
            if (!category) {
                return res.status(404).json({ success: false, error: 'Category not found' });
            }
            res.json({ success: true, data: category });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * GET /api/categories/:id/subcategories
     */
    getSubcategories: async (req, res) => {
        try {
            const subcategories = await Subcategory.findAll({
                where: { category_id: req.params.id },
                order: [['name', 'ASC']]
            });
            res.json({ success: true, data: subcategories });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * GET /api/subcategories/:id/leads
     */
    getSubcategoryLeads: async (req, res) => {
        try {
            const leads = await leadRepository.findAll({ subcategory_id: req.params.id });
            res.json({ success: true, data: leads });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = categoryController;
