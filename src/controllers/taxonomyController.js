const { Category, Subcategory, Lead, sequelize } = require('../models');

/**
 * Taxonomy Controller
 * Admin operations for managing categories and subcategories
 */
const taxonomyController = {
    /**
     * Get all categories with subcategories (Admin view)
     */
    getCategories: async (req, res) => {
        try {
            const categories = await Category.findAll({
                include: [
                    {
                        model: Subcategory,
                        as: 'Subcategories',
                        attributes: ['id', 'name', 'slug', 'lead_count']
                    }
                ],
                order: [['name', 'ASC']]
            });

            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('[TaxonomyController] getCategories error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    /**
     * Rename a category
     */
    renameCategory: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const { id } = req.params;
            const { new_name } = req.body;

            if (!new_name || !new_name.trim()) {
                return res.status(400).json({ success: false, error: 'New name is required' });
            }

            const category = await Category.findByPk(id);
            if (!category) {
                return res.status(404).json({ success: false, error: 'Category not found' });
            }

            // Generate new slug
            const newSlug = new_name.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '');

            await category.update({
                name: new_name.trim(),
                slug: newSlug
            }, { transaction });

            await transaction.commit();

            res.json({
                success: true,
                data: category
            });
        } catch (error) {
            await transaction.rollback();
            console.error('[TaxonomyController] renameCategory error:', error);
            res.status(500).json({ success: false, error: 'Failed to rename category' });
        }
    },

    /**
     * Merge two categories
     */
    mergeCategories: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const { id } = req.params; // Source category
            const { target_category_id } = req.body;

            if (!target_category_id) {
                return res.status(400).json({ success: false, error: 'Target category ID is required' });
            }

            if (id === target_category_id) {
                return res.status(400).json({ success: false, error: 'Cannot merge a category into itself' });
            }

            const sourceCategory = await Category.findByPk(id);
            const targetCategory = await Category.findByPk(target_category_id);

            if (!sourceCategory || !targetCategory) {
                return res.status(404).json({ success: false, error: 'Category not found' });
            }

            // Move all leads from source to target
            await Lead.update({
                category_id: target_category_id
            }, {
                where: { category_id: id },
                transaction
            });

            // Move all subcategories from source to target
            await Subcategory.update({
                category_id: target_category_id
            }, {
                where: { category_id: id },
                transaction
            });

            // Update target category lead count
            const newLeadCount = targetCategory.lead_count + sourceCategory.lead_count;
            await targetCategory.update({
                lead_count: newLeadCount
            }, { transaction });

            // Delete source category
            await sourceCategory.destroy({ transaction });

            await transaction.commit();

            res.json({
                success: true,
                message: `Merged ${sourceCategory.name} into ${targetCategory.name}`,
                data: {
                    merged_leads: sourceCategory.lead_count,
                    target_category: targetCategory
                }
            });
        } catch (error) {
            await transaction.rollback();
            console.error('[TaxonomyController] mergeCategories error:', error);
            res.status(500).json({ success: false, error: 'Failed to merge categories' });
        }
    },

    /**
     * Delete a category and all its subcategories
     */
    deleteCategory: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const { id } = req.params;

            const category = await Category.findByPk(id);
            if (!category) {
                return res.status(404).json({ success: false, error: 'Category not found' });
            }

            // Unlink all leads (set category_id and subcategory_id to null)
            await Lead.update({
                category_id: null,
                subcategory_id: null
            }, {
                where: { category_id: id },
                transaction
            });

            // Delete all subcategories
            await Subcategory.destroy({
                where: { category_id: id },
                transaction
            });

            // Delete the category
            await category.destroy({ transaction });

            await transaction.commit();

            res.json({
                success: true,
                message: `Deleted category ${category.name} and all associated subcategories`
            });
        } catch (error) {
            await transaction.rollback();
            console.error('[TaxonomyController] deleteCategory error:', error);
            res.status(500).json({ success: false, error: 'Failed to delete category' });
        }
    }
};

module.exports = taxonomyController;
