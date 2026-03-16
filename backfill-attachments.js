/**
 * Backfill FormAttachment records for existing submissions
 * that have file IDs stored in form_data but no attachment records.
 * Run ONCE: node backfill-attachments.js
 */
require('dotenv').config();
const { FormSubmission, FormAttachment, FormTemplate } = require('./src/models');

const KNOWN_FILE_FIELDS = [
    'personal_photo', 'id_card_scan', 'cv_upload',
    'passport_scan', 'medical_certificate', 'signature', 'attachment'
];

async function backfill() {
    try {
        const submissions = await FormSubmission.findAll({
            include: [
                { model: FormTemplate, as: 'Template', attributes: ['schema'] },
                { model: FormAttachment, as: 'Attachments' }
            ]
        });

        let created = 0;

        for (const sub of submissions) {
            const formData = typeof sub.form_data === 'string'
                ? JSON.parse(sub.form_data) : sub.form_data;

            if (!formData) continue;

            // Build file field set from template schema
            const fileFieldNames = new Set(KNOWN_FILE_FIELDS);
            const schema = sub.Template?.schema
                ? (typeof sub.Template.schema === 'string' ? JSON.parse(sub.Template.schema) : sub.Template.schema)
                : null;

            if (schema?.sections) {
                schema.sections.forEach(s =>
                    (s.fields || []).forEach(f => { if (f.type === 'file') fileFieldNames.add(f.name); })
                );
            }

            for (const [fieldName, value] of Object.entries(formData)) {
                if (!fileFieldNames.has(fieldName)) continue;
                if (!value || isNaN(parseInt(value))) continue;

                // Check if attachment already exists
                const exists = sub.Attachments?.find(a =>
                    a.field_name === fieldName && a.file_metadata_id === parseInt(value)
                );
                if (exists) continue;

                await FormAttachment.create({
                    submission_id: sub.id,
                    file_metadata_id: parseInt(value),
                    field_name: fieldName,
                    attachment_type: fieldName,
                    uploaded_by: sub.submitted_by,
                    uploaded_at: sub.submitted_at || sub.created_at
                });

                console.log(`✅ Submission #${sub.id}: linked ${fieldName} → file #${value}`);
                created++;
            }
        }

        console.log(`\n✅ Done. Created ${created} FormAttachment record(s).`);
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit(0);
    }
}

backfill();
