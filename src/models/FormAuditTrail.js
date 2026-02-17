module.exports = (sequelize, DataTypes) => {
    const FormAuditTrail = sequelize.define('FormAuditTrail', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        submission_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'FK to form_submissions'
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'User who performed action'
        },
        action: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'created, submitted, signed, approved, rejected, edited, etc.'
        },
        changes: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Before/after values for edits'
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
            comment: 'IP address of user'
        },
        timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'form_audit_trail',
        underscored: true,
        timestamps: false,
        indexes: [
            { fields: ['submission_id'] },
            { fields: ['user_id'] },
            { fields: ['timestamp'] }
        ]
    });

    FormAuditTrail.associate = (models) => {
        FormAuditTrail.belongsTo(models.FormSubmission, {
            foreignKey: 'submission_id',
            as: 'Submission'
        });

        FormAuditTrail.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'User'
        });
    };

    return FormAuditTrail;
};
