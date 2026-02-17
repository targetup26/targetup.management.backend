module.exports = (sequelize, DataTypes) => {
    const FormTemplate = sequelize.define('FormTemplate', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Template name (e.g., Join Form, Leave Request)'
        },
        type: {
            type: DataTypes.ENUM('join', 'leave', 'custom'),
            allowNull: false,
            comment: 'Form category'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Short summary of the form purpose'
        },
        schema: {
            type: DataTypes.JSON,
            allowNull: false,
            comment: 'Dynamic form field definitions with validation rules'
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: 'Template version for change tracking'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Only active templates are visible to users'
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Admin who created this template'
        }
    }, {
        tableName: 'form_templates',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['type'] },
            { fields: ['is_active'] }
        ]
    });

    FormTemplate.associate = (models) => {
        FormTemplate.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'Creator'
        });

        FormTemplate.hasMany(models.FormSubmission, {
            foreignKey: 'template_id',
            as: 'Submissions'
        });

        FormTemplate.hasMany(models.FormFieldOption, {
            foreignKey: 'template_id',
            as: 'FieldOptions'
        });
    };

    return FormTemplate;
};
