module.exports = (sequelize, DataTypes) => {
    const FormSubmission = sequelize.define('FormSubmission', {
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
        employee_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'FK to employees table'
        },
        form_data: {
            type: DataTypes.JSON,
            allowNull: false,
            comment: 'Complete form field values'
        },
        status: {
            type: DataTypes.ENUM(
                'draft',
                'submitted',
                'pending',
                'returned_for_edit',
                'approved',
                'rejected',
                'cancelled',
                'archived'
            ),
            defaultValue: 'draft',
            allowNull: false,
            comment: 'Extended lifecycle status'
        },
        submitted_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When form was submitted (not draft)'
        },
        reviewed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When final action was taken'
        },
        reviewer_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'User who took final action'
        },
        reviewer_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Internal notes from reviewer'
        },
        onboarding_token: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Secure token used for unauthenticated submission'
        },
        submitted_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'User who submitted the form'
        }
    }, {
        tableName: 'form_submissions',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['employee_id'] },
            { fields: ['template_id'] },
            { fields: ['status'] },
            { fields: ['submitted_at'] }
        ]
    });

    FormSubmission.associate = (models) => {
        FormSubmission.belongsTo(models.FormTemplate, {
            foreignKey: 'template_id',
            as: 'Template'
        });

        FormSubmission.belongsTo(models.Employee, {
            foreignKey: 'employee_id',
            as: 'Employee'
        });

        FormSubmission.belongsTo(models.User, {
            foreignKey: 'submitted_by',
            as: 'Submitter'
        });

        FormSubmission.belongsTo(models.User, {
            foreignKey: 'reviewer_id',
            as: 'Reviewer'
        });

        FormSubmission.hasMany(models.FormSignature, {
            foreignKey: 'submission_id',
            as: 'Signatures'
        });

        FormSubmission.hasMany(models.FormApproval, {
            foreignKey: 'submission_id',
            as: 'Approvals'
        });

        FormSubmission.hasMany(models.FormAttachment, {
            foreignKey: 'submission_id',
            as: 'Attachments'
        });

        FormSubmission.hasMany(models.FormAuditTrail, {
            foreignKey: 'submission_id',
            as: 'AuditTrail'
        });

        FormSubmission.belongsTo(models.OnboardingToken, {
            foreignKey: 'onboarding_token',
            targetKey: 'token',
            as: 'OnboardingToken',
            constraints: false
        });
    };

    return FormSubmission;
};
