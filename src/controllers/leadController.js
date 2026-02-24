const { LeadJob, Lead, User } = require('../models');
const config = require('../config');
const axios = require('axios');
const LeadExtractionDTO = require('../dtos/LeadExtractionDTO');

/**
 * Lead Controller - Production Edition
 * Implements clean architecture with DTO mapping and secure webhooks
 */
const leadController = {
    /**
     * Submit a new lead extraction job
     * POST /api/leads/extract
     */
    extractLeads: async (req, res) => {
        try {
            const data = req.body;
            const user_id = req.user.id;

            // 1. Validate & Sanitize Input
            const validation = LeadExtractionDTO.validate(data);
            if (!validation.isValid) {
                return res.status(400).json({ success: false, errors: validation.errors });
            }

            const sanitizedData = LeadExtractionDTO.sanitize(data);

            // 2. Create Job Record

            const job = await LeadJob.create({
                user_id,
                status: 'PENDING',
                source: 'MANUAL',
                query: sanitizedData
            });

            // 3. Call Lead Engine Microservice
            try {
                await axios.post(`${config.leadEngine.url}/internal/start-search`, {
                    searchId: String(job.id), // Sent as string to avoid bullmq jobId.startsWith crash
                    keyword: sanitizedData.business_type,
                    city: sanitizedData.city,
                    limit: sanitizedData.max_results,
                    country: sanitizedData.country,
                    source: 'sales-portal'
                }, {
                    headers: {
                        'x-internal-token': config.leadEngine.internalToken,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000 // 5 second timeout for queuing
                });

                console.log(`[LeadController] Job ${job.id} queued successfully in Lead Engine`);
            } catch (engineError) {
                console.error('[LeadController] Lead Engine call failed:', engineError.message);
                // Update job status to failed
                await job.update({ status: 'failed' });
                return res.status(503).json({
                    success: false,
                    error: 'Lead Engine unavailable',
                    job_id: job.id
                });
            }

            res.status(202).json({
                success: true,
                message: 'Extraction job initialized',
                job_id: job.id,
                status: 'pending'
            });

        } catch (error) {
            console.error('[LeadController] extractLeads error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    /**
     * NOTE: processResults() webhook handler removed
     * The Lead Engine now handles results directly and writes to the database
     * No webhook callback is needed anymore
     */


    /**
     * Poll Job Status
     * GET /api/leads/job/:id
     */
    getJobStatus: async (req, res) => {
        try {
            const job = await LeadJob.findOne({
                where: { id: req.params.id, user_id: req.user.id }
            });

            if (!job) {
                return res.status(404).json({ success: false, error: 'Job not found' });
            }

            res.json({
                success: true,
                status: job.status,
                total_results: job.total_results,
                created_at: job.created_at
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Fetch Leads
     * GET /api/leads
     */
    getLeads: async (req, res) => {
        try {
            const { city, category, job_id } = req.query;
            const where = {};

            if (job_id) where.extraction_job_id = job_id;
            if (city) where.city = city;

            const leads = await Lead.findAll({
                where,
                order: [['created_at', 'DESC']],
                limit: 1000
            });

            res.json(leads);
        } catch (error) {
            console.error('[LeadController] getLeads error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    /**
     * Fetch Job History
     * GET /api/leads/history
     */
    getHistory: async (req, res) => {
        try {
            const history = await LeadJob.findAll({
                where: { user_id: req.user.id },
                order: [['created_at', 'DESC']]
            });
            res.json(history);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    /*
     * Agent Heartbeat (Sales Time Tracking)
     * POST /api/leads/heartbeat
     */
    heartbeat: async (req, res) => {
        try {
            await User.update(
                { last_active_at: new Date() },
                { where: { id: req.user.id } }
            );
            res.status(204).send();
        } catch (error) {
            console.error('[LeadController] heartbeat error:', error);
            res.status(500).json({ error: 'Failed to log activity' });
        }
    }
};

module.exports = leadController;
