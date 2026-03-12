const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class LeadActivity extends Model {
        static associate(models) {
            LeadActivity.belongsTo(models.Lead, { foreignKey: 'lead_id', as: 'Lead' });
            LeadActivity.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
        }
    }

    LeadActivity.init({
        lead_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('CALL', 'EMAIL', 'MEETING', 'NOTE', 'STATUS_CHANGE'),
            defaultValue: 'NOTE'
        },
        outcome: {
            type: DataTypes.ENUM('ANSWERED', 'NO_ANSWER', 'BUSY', 'INTERESTED', 'NOT_INTERESTED', 'FOLLOW_UP', 'CONVERTED'),
            allowNull: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        next_follow_up: {
            type: DataTypes.DATE,
            allowNull: true
        },
        duration_minutes: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'LeadActivity',
        tableName: 'lead_activities',
        underscored: true,
        paranoid: true
    });

    return LeadActivity;
};
