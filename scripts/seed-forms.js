require('dotenv').config();
const db = require('../src/models');

async function seedForms() {
    try {
        await db.sequelize.authenticate();
        console.log('Database connected...');

        const joinSchema = {
            sections: [
                {
                    title: 'Personal Information',
                    fields: [
                        { name: 'full_name',   label: 'Full Name',    type: 'text',     required: true,  placeholder: 'Enter your full name' },
                        { name: 'national_id', label: 'National ID',  type: 'text',     required: true,  placeholder: 'National ID number' },
                        { name: 'phone',       label: 'Phone Number', type: 'text',     required: true,  placeholder: '+20 1xx xxxx xxx' },
                        { name: 'email',       label: 'Email Address',type: 'text',     required: false, placeholder: 'example@email.com' },
                        { name: 'address',     label: 'Home Address', type: 'textarea', required: true,  placeholder: 'Full address' }
                    ]
                },
                {
                    title: 'Emergency Contact',
                    fields: [
                        { name: 'emergency_contact', label: 'Emergency Contact Name',  type: 'text', required: true, placeholder: 'Full name' },
                        { name: 'emergency_phone',   label: 'Emergency Contact Phone', type: 'text', required: true, placeholder: 'Phone number' }
                    ]
                },
                {
                    title: 'Professional Details',
                    fields: [
                        { name: 'education',    label: 'Education Level',     type: 'select', required: true,  options: ['High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 'PhD', 'Other'] },
                        { name: 'bank_account', label: 'Bank Account Number', type: 'text',   required: false, placeholder: 'For salary transfer' },
                        { name: 'start_date',   label: 'Expected Start Date', type: 'date',   required: true }
                    ]
                },
                {
                    title: 'Signature',
                    fields: [
                        { name: 'signature', label: 'Employee Signature', type: 'file', required: true }
                    ]
                }
            ]
        };

        const leaveSchema = {
            sections: [
                {
                    title: 'Leave Details',
                    fields: [
                        { name: 'leave_type', label: 'Leave Type',       type: 'select',   required: true,  options: ['Annual Leave', 'Sick Leave', 'Emergency Leave', 'Unpaid Leave', 'Maternity / Paternity Leave', 'Other'] },
                        { name: 'start_date', label: 'Leave Start Date', type: 'date',     required: true },
                        { name: 'end_date',   label: 'Leave End Date',   type: 'date',     required: true },
                        { name: 'reason',     label: 'Reason for Leave', type: 'textarea', required: true,  placeholder: 'Describe the reason for your leave request' }
                    ]
                },
                {
                    title: 'Coverage & Contact',
                    fields: [
                        { name: 'covering_employee',    label: 'Covering Employee (if any)',  type: 'text',   required: false, placeholder: 'Colleague name' },
                        { name: 'contact_during_leave', label: 'Reachable During Leave?',     type: 'select', required: true,  options: ['Yes', 'No'] },
                        { name: 'contact_number',       label: 'Contact Number During Leave', type: 'text',   required: false, placeholder: 'Phone number if reachable' }
                    ]
                },
                {
                    title: 'Signature',
                    fields: [
                        { name: 'signature', label: 'Employee Signature', type: 'file', required: true }
                    ]
                }
            ]
        };

        // Upsert Join Form
        const [joinForm, joinCreated] = await db.FormTemplate.findOrCreate({
            where: { type: 'join' },
            defaults: { name: 'Join Form', type: 'join', description: 'Standard employee onboarding form', is_active: true, version: 1, schema: joinSchema }
        });
        if (!joinCreated) {
            await joinForm.update({ schema: joinSchema, name: 'Join Form' });
            console.log('✅ Join Form schema UPDATED');
        } else {
            console.log('✅ Join Form CREATED');
        }

        // Upsert Leave Form
        const [leaveForm, leaveCreated] = await db.FormTemplate.findOrCreate({
            where: { type: 'leave' },
            defaults: { name: 'Leave Request Form', type: 'leave', description: 'Employee leave request form', is_active: true, version: 1, schema: leaveSchema }
        });
        if (!leaveCreated) {
            await leaveForm.update({ schema: leaveSchema, name: 'Leave Request Form' });
            console.log('✅ Leave Request Form schema UPDATED');
        } else {
            console.log('✅ Leave Request Form CREATED');
        }

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
