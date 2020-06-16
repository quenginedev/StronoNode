
const User = {
    name: 'User',
    fields: {
        name: 'String',
        accountType: {
            type: 'String',
            default: 'admin'
        },
        email: {
            type: 'String',
            required: true,
            unique: true
        },
        dateOfBirth: 'Datetime',
        pets: {
            type: ['Pet'],
            ref: true
        }
    }
}

const Pet = {
    name: 'Pet',
    fields: {
        name: {
            type: 'String',
            required: true
        },
        owner: {
            type: 'User',
            ref: true
        }
    }
}

module.exports = [User, Pet]