module.exports = (sequelize, DataTypes) => {
    const StorageServer = sequelize.define('StorageServer', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: 'Server name (e.g., Server-55, Server-56)'
        },
        ip_address: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isIP: true
            },
            comment: 'Server IP address'
        },
        port: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 3001,
            comment: 'Storage Agent port'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Server online status'
        },
        storage_path: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'C:\\TargetStorage',
            comment: 'Base storage path on server'
        },
        total_capacity_gb: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 500,
            comment: 'Total storage capacity in GB'
        },
        used_capacity_gb: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: 'Used storage in GB'
        }
    }, {
        tableName: 'storage_servers',
        timestamps: true,
        indexes: [
            { fields: ['is_active'] },
            { fields: ['ip_address'] }
        ]
    });

    StorageServer.associate = (models) => {
        StorageServer.hasMany(models.DepartmentStorage, { foreignKey: 'server_id', as: 'DepartmentStorage' });
    };

    return StorageServer;
};
