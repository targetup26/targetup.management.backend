module.exports = (sequelize, DataTypes) => {
    const FormSignature = sequelize.define('FormSignature', {
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
        signer_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'User who signed'
        },
        signer_role: {
            type: DataTypes.ENUM('EMPLOYEE', 'DEPT_MANAGER', 'HR_DIRECTOR', 'COO'),
            allowNull: false,
            comment: 'Role at time of signing'
        },
        signature_order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '1=Employee, 2=Manager, 3=HR Director, 4=COO'
        },
        status: {
            type: DataTypes.ENUM('pending', 'signed', 'declined'),
            defaultValue: 'pending',
            allowNull: false
        },
        signed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp of signature'
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
            comment: 'IP address at time of signing (IPv4/IPv6)'
        },
        comments: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Optional comments from signer'
        }
    }, {
        tableName: 'form_signatures',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { fields: ['submission_id'] },
            { fields: ['signer_id'] },
            { fields: ['signature_order'] },
            { fields: ['status'] }
        ]
    });

    FormSignature.associate = (models) => {
        FormSignature.belongsTo(models.FormSubmission, {
            foreignKey: 'submission_id',
            as: 'Submission'
        });

        FormSignature.belongsTo(models.User, {
            foreignKey: 'signer_id',
            as: 'Signer'
        });
    };

    return FormSignature;
};
