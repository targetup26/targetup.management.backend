const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class OnboardingToken extends Model {
        static associate(models) {
            // Optional: link to who created it
            OnboardingToken.belongsTo(models.User, { foreignKey: 'created_by', as: 'Creator' });
        }
    }

    OnboardingToken.init({
        token: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Optional email to restrict usage'
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
        is_used: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        used_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'OnboardingToken',
        tableName: 'onboarding_tokens',
        timestamps: true
    });

    return OnboardingToken;
};
