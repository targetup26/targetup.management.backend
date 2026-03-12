const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    const ShareToken = sequelize.define('ShareToken', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        token: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
            defaultValue: () => uuidv4().replace(/-/g, '')
        },
        file_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'file_metadata', key: 'id' }
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' }
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true  // null = never expires
        },
        max_downloads: {
            type: DataTypes.INTEGER,
            allowNull: true  // null = unlimited
        },
        download_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        label: {
            type: DataTypes.STRING,
            allowNull: true  // Optional display name for the link
        }
    }, {
        tableName: 'share_tokens',
        timestamps: true
    });

    ShareToken.associate = (models) => {
        ShareToken.belongsTo(models.FileMetadata, { foreignKey: 'file_id', as: 'File' });
        ShareToken.belongsTo(models.User, { foreignKey: 'created_by', as: 'Creator' });
    };

    return ShareToken;
};
