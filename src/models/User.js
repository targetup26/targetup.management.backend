const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // Define associations here as needed
        }
    }

    User.init({
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.STRING, // Temporarily STRING to allow sync
            defaultValue: 'HR_VIEWER'
        },
        full_name: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'User',
    });
    return User;
};
