module.exports = (sequelize, DataTypes) => {
    const FormAttachment = sequelize.define('FormAttachment', {
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
        file_metadata_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'FK to file_metadata (Storage Agent integration - NO BLOBS)'
        },
        field_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Name of the field in the form (e.g. id_card_scan)'
        },
        attachment_type: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'passport_scan, medical_certificate, etc.'
        },
        uploaded_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'User who uploaded'
        },
        uploaded_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'form_attachments',
        underscored: true,
        timestamps: false,
        indexes: [
            { fields: ['submission_id'] },
            { fields: ['file_metadata_id'] }
        ]
    });

    FormAttachment.associate = (models) => {
        FormAttachment.belongsTo(models.FormSubmission, {
            foreignKey: 'submission_id',
            as: 'Submission'
        });

        FormAttachment.belongsTo(models.FileMetadata, {
            foreignKey: 'file_metadata_id',
            as: 'FileMetadata'
        });

        FormAttachment.belongsTo(models.User, {
            foreignKey: 'uploaded_by',
            as: 'Uploader'
        });
    };

    return FormAttachment;
};
