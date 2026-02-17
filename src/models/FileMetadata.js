module.exports = (sequelize, DataTypes) => {
    const FileMetadata = sequelize.define('FileMetadata', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        filename: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Unique filename (with UUID)'
        },
        original_name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Original uploaded filename'
        },
        file_path: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Relative path from storage root'
        },
        file_size: {
            type: DataTypes.BIGINT,
            allowNull: false,
            comment: 'File size in bytes'
        },
        mime_type: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'File MIME type'
        },
        department_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'departments',
                key: 'id'
            }
        },
        employee_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'employees',
                key: 'id'
            }
        },
        server_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'storage_servers',
                key: 'id'
            }
        },
        uploaded_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'User who uploaded the file (null for onboarding)'
        },
        onboarding_token: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Token used for unauthenticated upload'
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Soft delete flag'
        },
        is_sensitive: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Mark file as sensitive/confidential'
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: 'File version number'
        },
        parent_file_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'file_metadata',
                key: 'id'
            },
            comment: 'Parent file for versioning'
        }
    }, {
        tableName: 'file_metadata',
        timestamps: true,
        indexes: [
            { fields: ['employee_id'] },
            { fields: ['department_id'] },
            { fields: ['server_id'] },
            { fields: ['is_deleted'] },
            { fields: ['is_sensitive'] },
            { fields: ['parent_file_id'] }
        ]
    });

    FileMetadata.associate = (models) => {
        FileMetadata.belongsTo(models.Department, {
            foreignKey: 'department_id',
            as: 'Department'
        });

        FileMetadata.belongsTo(models.Employee, {
            foreignKey: 'employee_id',
            as: 'Employee'
        });

        /*
                FileMetadata.belongsTo(models.StorageServer, {
                    foreignKey: 'server_id',
                    as: 'StorageServer'
                });
        */

        FileMetadata.belongsTo(models.User, {
            foreignKey: 'uploaded_by',
            as: 'Uploader'
        });

        // Versioning association
        FileMetadata.belongsTo(models.FileMetadata, {
            foreignKey: 'parent_file_id',
            as: 'ParentFile'
        });

        FileMetadata.hasMany(models.FileMetadata, {
            foreignKey: 'parent_file_id',
            as: 'Versions'
        });

        /*
                FileMetadata.belongsTo(models.OnboardingToken, {
                    foreignKey: 'onboarding_token',
                    targetKey: 'token',
                    as: 'OnboardingToken'
                });
        */
    };

    return FileMetadata;
};
