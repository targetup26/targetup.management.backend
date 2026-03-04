const { User, Employee } = require('../models');
const bcrypt = require('bcryptjs');

// Create user account from employee (Enterprise Flow)
exports.createFromEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { password, role } = req.body;

        console.log(`[Enterprise Auth] Initializing account creation for Employee: ${employeeId}`);

        // 1. Validate employee exists
        const employee = await Employee.findByPk(employeeId);
        if (!employee) {
            return res.status(404).json({ success: false, error: 'Target employee record not found.' });
        }

        // 2. Ensure no existing user is linked (Immutable Link Protection)
        const existingUser = await User.findOne({ where: { employee_id: employeeId } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Account Link Violation: This employee is already mapped to a system user.',
                username: existingUser.username
            });
        }

        // 3. Prevent duplicate usernames (Employee Code is unique)
        const usernameConflict = await User.findOne({ where: { username: employee.code } });
        if (usernameConflict) {
            return res.status(400).json({
                success: false,
                error: 'Identity Conflict: Staff ID is already registered as a username.'
            });
        }

        // 4. Secure Credential Generation
        const tempPassword = password || 'Target@2026';
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // 5. Atomic Account Creation
        const user = await User.create({
            username: employee.code,
            password: hashedPassword,
            full_name: employee.full_name,
            email: employee.email,
            role: role || 'EMPLOYEE', // Legacy field (keep for now)
            employee_id: employee.id,
            onboarding_status: 'APPROVED',
            has_completed_onboarding: true
        });

        // [FIX] Assign Role Model (Required for Permission System)
        const RoleModel = require('../models').Role;
        const assignedRoleName = role || 'EMPLOYEE';

        const roleInstance = await RoleModel.findOne({ where: { name: assignedRoleName } });
        if (roleInstance) {
            await user.setRoles([roleInstance]);
            console.log(`[Enterprise Auth] Assigned role '${assignedRoleName}' to user ${user.username}`);
        } else {
            console.warn(`[Enterprise Auth] WARNING: Role '${assignedRoleName}' not found. User has no permissions.`);
        }

        console.log(`[Enterprise Auth] Success: User ${user.username} linked to Employee ${employee.id}`);

        res.status(201).json({
            success: true,
            message: 'Enterprise system access granted successfully.',
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            },
            tempPassword: tempPassword // Admin must copy this now
        });

    } catch (error) {
        console.error('[Enterprise Auth] Fatal failure during account link:', error);
        res.status(500).json({ success: false, error: 'Internal system error during identity mapping.' });
    }
};

// Create user account for an employee (Legacy/Generic - Keep for compatibility if needed, but route will likely point to createFromEmployee)
exports.createEmployeeUser = async (req, res) => {
    try {
        const { employee_id, password } = req.body;

        console.log(`👤 Creating user account for employee: ${employee_id}`);

        // Step 1: Find employee
        const employee = await Employee.findByPk(employee_id);

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Step 2: Check if user already exists for this employee
        const existingUser = await User.findOne({ where: { employee_id } });

        if (existingUser) {
            return res.status(400).json({
                error: 'User account already exists for this employee',
                username: existingUser.username
            });
        }

        // Step 3: Check if username (employee code) is taken
        const existingUsername = await User.findOne({ where: { username: employee.code } });

        if (existingUsername) {
            return res.status(400).json({
                error: 'Username already taken. Employee code must be unique.'
            });
        }

        // Step 4: Create user
        const defaultPassword = password || 'target@2026'; // Default password if not provided
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const user = await User.create({
            username: employee.code,
            password: hashedPassword,
            full_name: employee.full_name,
            role: 'EMPLOYEE',
            employee_id: employee.id
        });

        // [FIX] Assign Role Model (Required for Permission System)
        const RoleModel = require('../models').Role;
        const roleInstance = await RoleModel.findOne({ where: { name: 'EMPLOYEE' } });
        if (roleInstance) {
            await user.setRoles([roleInstance]);
            console.log(`✅ Assigned role 'EMPLOYEE' to user ${user.username}`);
        }

        console.log(`✅ User account created - Username: ${user.username}`);

        res.status(201).json({
            message: 'User account created successfully',
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            },
            defaultPassword: password || 'target@2026' // Return to show admin
        });
    } catch (error) {
        console.error('❌ Create Employee User Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get user by employee_id
exports.getUserByEmployee = async (req, res) => {
    try {
        const { employee_id } = req.params;

        const user = await User.findOne({
            where: { employee_id },
            attributes: ['id', 'username', 'full_name', 'role', 'createdAt']
        });

        if (!user) {
            return res.status(404).json({ error: 'No user account found for this employee' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all users (for admin panel)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Create new user (for admin panel) — auto-creates an Employee record
exports.createUser = async (req, res) => {
    try {
        const { username, password, full_name, email, role } = req.body;

        // Validate required fields
        if (!full_name) {
            return res.status(400).json({ error: 'Full name is required' });
        }

        // Step 1: Auto-create an Employee record (code will be TUP-YYYY-XXXX via hook)
        const employee = await Employee.create({
            full_name,
            email: email || null,
            is_active: true
        });

        // Step 2: Use employee code as username (unless one is explicitly provided)
        const finalUsername = username || employee.code;

        // Step 3: Check if username already exists
        const existingUser = await User.findOne({ where: { username: finalUsername } });
        if (existingUser) {
            await employee.destroy(); // rollback orphan employee
            return res.status(400).json({ error: `Username '${finalUsername}' already exists` });
        }

        // Step 4: Hash password
        const finalPassword = password || 'Target@2026';
        const hashedPassword = await bcrypt.hash(finalPassword, 10);

        // Step 5: Create user linked to new employee
        const user = await User.create({
            username: finalUsername,
            password: hashedPassword,
            full_name,
            email,
            role: role || 'EMPLOYEE',
            employee_id: employee.id
        });

        // Step 6: Assign Role
        const RoleModel = require('../models').Role;
        const roleInstance = await RoleModel.findOne({ where: { name: role || 'EMPLOYEE' } });
        if (roleInstance) await user.setRoles([roleInstance]);

        const userResponse = user.toJSON();
        delete userResponse.password;

        res.status(201).json({
            ...userResponse,
            employee_code: employee.code,
            default_password: password ? undefined : 'Target@2026'
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Update user (for admin panel)
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { password, full_name, email, role } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update fields
        if (full_name) user.full_name = full_name;
        if (email !== undefined) user.email = email;
        if (role) user.role = role;
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        // Return user without password
        const userResponse = user.toJSON();
        delete userResponse.password;

        res.json(userResponse);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

// Delete user (for admin panel)
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.destroy();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

