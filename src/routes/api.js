const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const employeeController = require('../controllers/employeeController');
const departmentController = require('../controllers/departmentController');
const jobRoleController = require('../controllers/jobRoleController');
const attendanceController = require('../controllers/attendanceController');
const deviceController = require('../controllers/deviceController');
const roleController = require('../controllers/roleController');
const permissionController = require('../controllers/permissionController');
const userController = require('../controllers/userController');
const storageController = require('../controllers/storageController');
const adminController = require('../controllers/adminController');
const auditController = require('../controllers/auditController');
const userProfileController = require('../controllers/userProfileController');
const searchController = require('../controllers/searchController');
const personalNoteController = require('../controllers/personalNoteController');
const chatController = require('../controllers/chatController');
const configController = require('../controllers/configController');
const formTemplateController = require('../controllers/formTemplateController');
const printSettingsController = require('../controllers/printSettingsController');
const leadController = require('../controllers/leadController');
const categoryController = require('../controllers/categoryController');
const exportController = require('../controllers/exportController');
const taxonomyController = require('../controllers/taxonomyController');
const formSubmissionController = require('../controllers/formSubmissionController');
const onboardingController = require('../controllers/onboardingController');

// Middleware
const auth = require('../middleware/auth');
const onboardingGuard = require('../middleware/onboardingGuard');
const requirePermission = require('../middleware/requirePermission');
const upload = require('../middleware/upload');
const chatRateLimiter = require('../middleware/rateLimiter');


// Device Routes
router.get('/devices/scan', deviceController.scanNetwork);
router.get('/devices', deviceController.getDevices);
router.post('/devices', deviceController.addDevice);
router.put('/devices/:id', deviceController.updateDevice);
router.delete('/devices/:id', deviceController.deleteDevice);


// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.put('/auth/profile', authController.updateProfile);

// Department Routes
router.get('/departments', departmentController.getAll);
router.post('/departments', departmentController.create);
router.put('/departments/:id', departmentController.update);
router.delete('/departments/:id', departmentController.delete);

// JobRole Routes
router.get('/job-roles', jobRoleController.getAll);
router.post('/job-roles', jobRoleController.create);
router.put('/job-roles/:id', jobRoleController.update);
router.delete('/job-roles/:id', jobRoleController.delete);

// Employee Routes
router.get('/employees', employeeController.getAll);
router.get('/employees/:id', employeeController.getOne);
router.post('/employees', employeeController.create);
router.put('/employees/:id', employeeController.update);
router.delete('/employees/:id', employeeController.delete);

// Attendance Routes (Desktop + Web Compatibility)
router.post('/attendance/check-in', auth, attendanceController.desktopCheckIn);
router.post('/attendance/check-out', auth, attendanceController.desktopCheckOut);
router.post('/attendance/heartbeat', auth, attendanceController.desktopHeartbeat);
router.get('/attendance/status', auth, attendanceController.getAttendanceStatus);
router.get('/attendance/dashboard', auth, requirePermission('attendance.view.self'), attendanceController.getDashboardData);
router.get('/attendance/history', auth, requirePermission('attendance.view.self'), attendanceController.getEntries);
router.get('/attendance/stats/today', auth, requirePermission('attendance.view.self'), attendanceController.getDashboardData);
router.get('/attendance/balance', auth, attendanceController.getLeaveBalance);
router.get('/attendance', auth, requirePermission('attendance.view.self'), attendanceController.getEntries);

// Desktop App Routes
router.post('/devices/register', deviceController.registerDevice);
// Routes below use unified paths in Attendance section above. 
// Keeping these as aliases if needed, but the ones above are cleaner.
// Reverting to the ones that worked before but adding heartbeat.

const breakController = require('../controllers/breakController');
const shiftController = require('../controllers/shiftController');
const globalSettingsController = require('../controllers/globalSettingsController');
// const ipRuleController = require('../controllers/ipRuleController'); // [MISSING]

router.post('/breaks/start', auth, breakController.startBreak);
router.post('/breaks/end', auth, breakController.endBreak);
// router.get('/breaks/active', auth, breakController.getActiveBreaks); // Deprecated
router.get('/breaks/daily', auth, breakController.getBreaksHistory); // Renamed internally but keeping path for Home.jsx compatibility (defaulting to today)
router.get('/breaks/history', auth, breakController.getBreaksHistory); // Explicit history endpoint

router.get('/shifts', auth, shiftController.getAllShifts);
router.post('/shifts', auth, shiftController.createShift);
router.put('/shifts/:id', auth, shiftController.updateShift);
router.delete('/shifts/:id', auth, shiftController.deleteShift);

// Admin-Only Routes (Global Settings & IP Rules)
router.get('/admin/settings', auth, requirePermission('admin.settings.manage'), globalSettingsController.getAllSettings);
router.get('/admin/settings/:key', auth, requirePermission('admin.settings.manage'), globalSettingsController.getSetting);
router.put('/admin/settings/:key', auth, requirePermission('admin.settings.manage'), globalSettingsController.updateSetting);
router.delete('/admin/settings/:key', auth, requirePermission('admin.settings.manage'), globalSettingsController.deleteSetting);

// Audit Logs
router.get('/admin/audit-logs', auth, requirePermission('admin.audit-logs.manage'), auditController.getLogs);
router.get('/admin/audit-logs/stats', auth, requirePermission('admin.audit-logs.manage'), auditController.getLogStats);

// router.get('/admin/ip-rules', auth, requirePermission('admin.ip-rules.manage'), ipRuleController.getAllRules); // [REMOVED]
// router.post('/admin/ip-rules', auth, requirePermission('admin.ip-rules.manage'), ipRuleController.createRule); // [REMOVED]
// router.put('/admin/ip-rules/:id', auth, requirePermission('admin.ip-rules.manage'), ipRuleController.updateRule); // [REMOVED]
// router.delete('/admin/ip-rules/:id', auth, requirePermission('admin.ip-rules.manage'), ipRuleController.deleteRule); // [REMOVED]

// RBAC Routes (Admin Only)
router.get('/admin/roles', auth, requirePermission('admin.roles.manage'), roleController.getAllRoles);
router.post('/admin/roles', auth, requirePermission('admin.roles.manage'), roleController.createRole);
router.put('/admin/roles/:id', auth, requirePermission('admin.roles.manage'), roleController.updateRole);
router.delete('/admin/roles/:id', auth, requirePermission('admin.roles.manage'), roleController.deleteRole);
router.put('/admin/roles/:id/permissions', auth, requirePermission('admin.roles.manage'), roleController.syncRolePermissions);

router.get('/admin/permissions', auth, requirePermission('admin.permissions.manage'), permissionController.getAllPermissions);
router.post('/admin/permissions', auth, requirePermission('admin.permissions.manage'), permissionController.createPermission);
router.put('/admin/permissions/:id', auth, requirePermission('admin.permissions.manage'), permissionController.updatePermission);
router.delete('/admin/permissions/:id', auth, requirePermission('admin.permissions.manage'), permissionController.deletePermission);

// User Management Routes
router.get('/users', auth, userController.getAllUsers); // Allow any auth user to see directory for chat
router.post('/admin/users/create-from-employee/:employeeId', auth, requirePermission('users.create'), userController.createFromEmployee);
router.post('/users', auth, requirePermission('users.create'), userController.createUser);
router.put('/users/:id', auth, requirePermission('users.edit'), userController.updateUser);
router.delete('/users/:id', auth, requirePermission('users.delete'), userController.deleteUser);

// Storage Routes
router.post('/storage/upload',
    auth,
    requirePermission('storage.upload.self'),
    upload.single('file'),
    storageController.uploadFile
);

router.get('/storage/files',
    auth,
    requirePermission('storage.view.self'),
    storageController.listFiles
);

router.get('/storage/download/:id',
    auth,
    requirePermission('storage.view.self'),
    storageController.downloadFile
);

router.delete('/storage/:id',
    auth,
    requirePermission('storage.delete'),
    storageController.deleteFile
);

router.post('/storage/folders',
    auth,
    requirePermission('storage.upload.self'),
    storageController.createFolder
);

router.put('/storage/:id/rename',
    auth,
    requirePermission('storage.upload.self'),
    storageController.renameFile
);

router.get('/storage/:id/versions',
    auth,
    requirePermission('storage.view.self'),
    storageController.getFileVersions
);

router.get('/storage/health',
    auth,
    requirePermission('storage.manage'),
    storageController.getServerHealth
);

// [NEW] Storage Settings (Admin Only)
router.get('/storage/settings', auth, requirePermission('storage.manage'), storageController.getSettings);
router.post('/storage/settings', auth, requirePermission('storage.manage'), storageController.updateSettings);

// [NEW] Storage Servers CRUD (Admin Only)
router.post('/storage/servers', auth, requirePermission('storage.manage'), storageController.createServer);
router.put('/storage/servers/:id', auth, requirePermission('storage.manage'), storageController.updateServer);
router.delete('/storage/servers/:id', auth, requirePermission('storage.manage'), storageController.deleteServer);

// Dashboard & Activity
router.get('/admin/dashboard-stats', auth, requirePermission('admin.access'), attendanceController.getDashboardData);
router.get('/admin/dashboard-tactical', auth, requirePermission('admin.access'), adminController.getDashboardTactical);
router.get('/admin/audit-logs', auth, requirePermission('audit.view'), auditController.getLogs);

// Identity & Profile
router.get('/profile', auth, userProfileController.getMyProfile);
router.get('/profile/:id', auth, userProfileController.getUserProfile);
router.put('/profile', auth, userProfileController.updateProfile);
router.put('/profile/settings', auth, userProfileController.updateSettings);
router.put('/profile/presence', auth, userProfileController.updatePresence);

// Unified Search
router.get('/search', auth, searchController.unifiedSearch);

// Personal Notes (Private)
router.get('/notes', auth, personalNoteController.getNotes);
router.post('/notes', auth, personalNoteController.createNote);
router.put('/notes/:id', auth, personalNoteController.updateNote);
router.delete('/notes/:id', auth, personalNoteController.deleteNote);

// ========== LEAD ACTIVITY / CRM ROUTES ==========
const leadActivityController = require('../controllers/leadActivityController');
// IMPORTANT: Static routes must come BEFORE dynamic :leadId route
router.get('/leads/history', auth, leadController.getHistory);
router.get('/leads/job/:id', auth, leadController.getJobStatus);
router.get('/leads/:leadId',                            auth, leadActivityController.getLeadDetail);
router.get('/leads/:leadId/activities',                 auth, leadActivityController.getActivities);
router.post('/leads/:leadId/activities',                auth, leadActivityController.addActivity);
router.delete('/leads/:leadId/activities/:activityId',  auth, leadActivityController.deleteActivity);
router.patch('/leads/:leadId/status',                   auth, leadActivityController.updateLeadStatus);


// ========== CHAT ROUTES (Desktop App Only) ==========

// Chat Rooms
router.get('/chat/rooms',
    auth,
    requirePermission('chat.view'),
    chatController.getRooms
);

router.post('/chat/rooms',
    auth,
    requirePermission('chat.group.create'),
    chatController.createRoom
);

// Chat Messages
router.get('/chat/rooms/:id/messages',
    auth,
    requirePermission('chat.view'),
    chatController.getMessages
);

router.post('/chat/messages',
    auth,
    requirePermission('chat.write'),
    chatRateLimiter,
    chatController.sendMessage
);

router.put('/chat/messages/:id',
    auth,
    requirePermission('chat.write'),
    chatController.editMessage
);

router.delete('/chat/messages/:id',
    auth,
    requirePermission('chat.write'),
    chatController.deleteMessage
);

// Chat Policies (Admin Only)
router.get('/chat/policies',
    auth,
    requirePermission('chat.admin.policy'),
    chatController.getPolicies
);

router.put('/chat/policies',
    auth,
    requirePermission('chat.admin.policy'),
    chatController.updatePolicies
);

// Chat Analytics (Admin Only)
router.get('/chat/analytics',
    auth,
    requirePermission('chat.admin.policy'),
    chatController.getAnalytics
);

// Admin Room Management
router.get('/admin/chat/rooms',
    auth,
    requirePermission('chat.admin.policy'),
    chatController.getAllRooms
);

router.put('/admin/chat/rooms/:id',
    auth,
    requirePermission('chat.admin.policy'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { is_active, is_read_only, name, description } = req.body;
            const { ChatRoom } = require('../models');

            const room = await ChatRoom.findByPk(id);
            if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

            if (is_active !== undefined) room.is_active = is_active;
            if (is_read_only !== undefined) room.is_read_only = is_read_only;
            if (name) room.name = name;
            if (description !== undefined) room.description = description;

            await room.save();
            res.json({ success: true, room });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// [NEW] System Configuration
router.get('/config', auth, configController.getSystemConfig);
router.put('/admin/config/presence', auth, configController.updatePresenceConfig);

// Admin Management Routes (Requires Admin permissions)
router.get('/admin/submissions', auth, onboardingGuard, requirePermission('forms.view.all'), adminController.getAllSubmissions);
router.get('/admin/submissions/:id', auth, onboardingGuard, requirePermission('forms.view.all'), adminController.getSubmissionDetail);
router.post('/admin/submissions/:id/action', auth, onboardingGuard, requirePermission('forms.approve'), adminController.adminAction);
router.post('/admin/reassign', auth, onboardingGuard, requirePermission('forms.template.manage'), adminController.reassignApprover);
router.get('/admin/config', auth, onboardingGuard, requirePermission('forms.template.manage'), adminController.getSystemConfig);

// Form Templates (Admin)
router.get('/admin/forms/templates', auth, requirePermission('forms.template.manage'), formTemplateController.getAllTemplates);
router.get('/admin/forms/templates/:id', auth, requirePermission('forms.template.manage'), formTemplateController.getTemplate);
router.post('/admin/forms/templates', auth, requirePermission('forms.template.manage'), formTemplateController.createTemplate);
router.put('/admin/forms/templates/:id', auth, requirePermission('forms.template.manage'), formTemplateController.updateTemplate);
router.get('/admin/forms/templates/:id/options/:field', auth, requirePermission('forms.template.manage'), formTemplateController.getFieldOptions);

// Form Templates (Employee)
router.get('/forms/templates', auth, formTemplateController.getTemplates);
router.get('/forms/templates/:id', auth, formTemplateController.getTemplate);
router.get('/forms/templates/:id/options/:field', auth, formTemplateController.getFieldOptions);
router.get('/forms/my-submissions', auth, formSubmissionController.getMySubmissions);
router.post('/forms/submit', auth, formSubmissionController.submitForm);
router.get('/forms/submissions/:id', auth, formSubmissionController.getSubmissionDetail);
router.get('/forms/submissions/:id/print', auth, formSubmissionController.getPrintSubmission);

// Print Settings Routes
router.get('/settings/print', auth, printSettingsController.getPrintSettings);
router.put('/settings/print', auth, requirePermission('forms.template.manage'), printSettingsController.updatePrintSettings);
router.post('/settings/print/reset', auth, requirePermission('forms.template.manage'), printSettingsController.resetPrintSettings);

// ========== LEADS EXTRACTION ROUTES (Production PWA Ready) ==========
router.get('/leads', auth, leadController.getLeads);
router.post('/leads/extract', auth, leadController.extractLeads);
router.post('/leads/heartbeat', auth, leadController.heartbeat);
router.get('/leads/job/:id', auth, leadController.getJobStatus);
router.get('/leads/history', auth, leadController.getHistory);

// Onboarding Routes
router.post('/onboarding/invite', auth, requirePermission('users.create'), onboardingController.invite);
router.get('/onboarding/template/:token', onboardingController.getTemplateByToken);
router.post('/onboarding/submit', onboardingController.submitOnboarding);
router.post('/onboarding/upload', upload.single('file'), onboardingController.uploadFile);

// Taxonomy & Classification Routes
router.get('/categories', auth, categoryController.getCategories);
router.get('/categories/:id', auth, categoryController.getCategoryById);
router.get('/categories/:id/subcategories', auth, categoryController.getSubcategories);

router.get('/subcategories/:id/leads', auth, categoryController.getSubcategoryLeads);

// Admin Taxonomy Management Routes
router.get('/admin/taxonomy/categories', auth, taxonomyController.getCategories);
router.put('/admin/taxonomy/categories/:id/rename', auth, taxonomyController.renameCategory);
router.post('/admin/taxonomy/categories/:id/merge', auth, taxonomyController.mergeCategories);
router.delete('/admin/taxonomy/categories/:id', auth, taxonomyController.deleteCategory);

// Export Routes
router.post('/leads/export', auth, exportController.exportLeads);
router.get('/leads/export/history', auth, exportController.getExportHistory);

// ========== FILE SHARE LINK ROUTES ==========
const shareController = require('../controllers/shareController');
// Public routes (no auth required)
router.get('/share/:token/info', shareController.getShareInfo);
router.get('/share/:token/download', shareController.downloadViaShareLink);
router.get('/share/:token/preview', shareController.previewViaShareLink);
// Folder share routes (public)
router.get('/share/:token/folder', shareController.getFolderContents);
router.get('/share/:token/folder/file/:fileId', shareController.downloadFolderFile);
router.get('/share/:token/folder/zip', shareController.downloadFolderZip);
// Authenticated routes
router.post('/storage/share/:fileId', auth, shareController.generateShareLink);
router.get('/storage/shares/:fileId', auth, shareController.listFileShares);
router.delete('/storage/share/:shareId', auth, shareController.revokeShareLink);

module.exports = router;
