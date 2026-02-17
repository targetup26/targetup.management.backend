module.exports = (sequelize, DataTypes) => {
    const FormApproval = sequelize.define('FormApproval', {
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
        approver_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'User who took action'
        },
        action: {
            type: DataTypes.ENUM('approved', 'rejected', 'returned', 'edited', 'commented'),
            allowNull: false,
            comment: 'Action taken'
        },
        comments: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Approver comments'
        },
        timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'form_approvals',
        underscored: true,
        timestamps: false,
        indexes: [
            { fields: ['submission_id'] },
            { fields: ['approver_id'] },
            { fields: ['timestamp'] }
        ]
    });

    FormApproval.associate = (models) => {
        FormApproval.belongsTo(models.FormSubmission, {
            foreignKey: 'submission_id',
            as: 'Submission'
        });

        FormApproval.belongsTo(models.User, {
            foreignKey: 'approver_id',
            as: 'Approver'
        });
    };

    return FormApproval;
};
