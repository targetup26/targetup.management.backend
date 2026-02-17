module.exports = (sequelize, DataTypes) => {
    const FormFieldOption = sequelize.define('FormFieldOption', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        template_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'FK to form_templates'
        },
        field_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Field identifier (e.g., leave_type, location)'
        },
        option_value: {
            type: DataTypes.STRING(200),
            allowNull: false,
            comment: 'Option value (e.g., Annual, Sick, Emergency)'
        },
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Sort order for display'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Only active options are shown'
        }
    }, {
        tableName: 'form_field_options',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['template_id', 'field_name'] },
            { fields: ['is_active'] }
        ]
    });

    FormFieldOption.associate = (models) => {
        FormFieldOption.belongsTo(models.FormTemplate, {
            foreignKey: 'template_id',
            as: 'Template'
        });
    };

    return FormFieldOption;
};
