const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class PersonalNote extends Model {
        static associate(models) {
            PersonalNote.belongsTo(models.User, { foreignKey: 'user_id' });
        }
    }

    PersonalNote.init({
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        is_pinned: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        sequelize,
        modelName: 'PersonalNote',
        tableName: 'personal_notes',
        paranoid: true, // Soft delete
        underscored: true
    });

    return PersonalNote;
};
