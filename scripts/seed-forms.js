require('dotenv').config();
const db = require('../src/models');

async function seedForms() {
    try {
        await db.sequelize.authenticate();
        console.log('Database connected...');

        // ─── JOIN FORM ───────────────────────────────────────────────────────────
        const [joinForm, joinCreated] = await db.FormTemplate.findOrCreate({
            where: { type: 'join', name: 'Join Form' },
            defaults: {
                name: 'Join Form',
                type: 'join',
                description: 'Standard employee onboarding and joining form',
                is_active: true,
                version: 1,
                schema: [
                    {
                        name: 'full_name',
                        label: 'Full Name',
                        type: 'text',
                        required: true,
                        placeholder: 'Enter your full name'
                    },
                    {
                        name: 'national_id',
                        label: 'National ID',
                        type: 'text',
                        required: true,
                        placeholder: 'Enter your national ID number'
                    },
                    {
                        name: 'phone',
                        label: 'Phone Number',
                        type: 'text',
                        required: true,
                        placeholder: '+20 1xx xxxx xxx'
                    },
                    {
                        name: 'email',
                        label: 'Email Address',
                        type: 'email',
                        required: false,
                        placeholder: 'example@email.com'
                    },
                    {
                        name: 'address',
                        label: 'Home Address',
                        type: 'textarea',
                        required: true,
                        placeholder: 'Enter your full address'
                    },
                    {
                        name: 'emergency_contact',
                        label: 'Emergency Contact Name',
                        type: 'text',
                        required: true,
                        placeholder: 'Emergency contact full name'
                    },
                    {
                        name: 'emergency_phone',
                        label: 'Emergency Contact Phone',
                        type: 'text',
                        required: true,
                        placeholder: 'Emergency contact phone number'
                    },
                    {
                        name: 'education',
                        label: 'Education Level',
                        type: 'select',
                        required: true,
                        options: [
                            'High School',
                            'Diploma',
                            "Bachelor's Degree",
                            "Master's Degree",
                            'PhD',
                            'Other'
                        ]
                    },
                    {
                        name: 'bank_account',
                        label: 'Bank Account Number',
                        type: 'text',
                        required: false,
                        placeholder: 'For salary transfer'
                    },
                    {
                        name: 'start_date',
                        label: 'Expected Start Date',
                        type: 'date',
                        required: true
                    },
                    {
                        name: 'signature',
                        label: 'Employee Signature',
                        type: 'signature',
                        required: true
                    }
                ]
            }
        });
        console.log(joinCreated ? '✅ Join Form created' : '⚠️  Join Form already exists (skipped)');

        // ─── LEAVE FORM ──────────────────────────────────────────────────────────
        const [leaveForm, leaveCreated] = await db.FormTemplate.findOrCreate({
            where: { type: 'leave', name: 'Leave Request Form' },
            defaults: {
                name: 'Leave Request Form',
                type: 'leave',
                description: 'Employee leave request and approval form',
                is_active: true,
                version: 1,
                schema: [
                    {
                        name: 'leave_type',
                        label: 'Leave Type',
                        type: 'select',
                        required: true,
                        options: [
                            'Annual Leave',
                            'Sick Leave',
                            'Emergency Leave',
                            'Unpaid Leave',
                            'Maternity / Paternity Leave',
                            'Other'
                        ]
                    },
                    {
                        name: 'start_date',
                        label: 'Leave Start Date',
                        type: 'date',
                        required: true
                    },
                    {
                        name: 'end_date',
                        label: 'Leave End Date',
                        type: 'date',
                        required: true
                    },
                    {
                        name: 'reason',
                        label: 'Reason for Leave',
                        type: 'textarea',
                        required: true,
                        placeholder: 'Please describe the reason for your leave request'
                    },
                    {
                        name: 'covering_employee',
                        label: 'Covering Employee (if any)',
                        type: 'text',
                        required: false,
                        placeholder: 'Name of colleague who will cover your duties'
                    },
                    {
                        name: 'contact_during_leave',
                        label: 'Reachable During Leave?',
                        type: 'select',
                        required: true,
                        options: ['Yes', 'No']
                    },
                    {
                        name: 'contact_number',
                        label: 'Contact Number During Leave',
                        type: 'text',
                        required: false,
                        placeholder: 'Phone number if reachable'
                    },
                    {
                        name: 'signature',
                        label: 'Employee Signature',
                        type: 'signature',
                        required: true
                    }
                ]
            }
        });
        console.log(leaveCreated ? '✅ Leave Request Form created' : '⚠️  Leave Form already exists (skipped)');

        console.log('\n--- FORM SEEDING COMPLETE ---');
        console.log(`Join Form ID: ${joinForm.id}`);
        console.log(`Leave Form ID: ${leaveForm.id}`);
        process.exit(0);

    } catch (error) {
        console.error('Form seeding failed:', error.message);
        process.exit(1);
    }
}

seedForms();
