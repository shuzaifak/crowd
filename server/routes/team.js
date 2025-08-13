const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = process.env.USE_MONGODB ? require('../database/mongoDatabase') : require('../database/db');

// Get team members for the authenticated user's organization
router.get('/members', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Getting team members for user: ${userId}`);

        // Get user data to determine organization
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get team members (mock data for now - in real app, would be based on organization)
        const teamMembers = user.teamMembers || [
            {
                id: userId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: 'owner',
                status: 'active',
                joinedAt: user.createdAt,
                permissions: {
                    canCreateEvents: true,
                    canEditEvents: true,
                    canManageTeam: true,
                    canViewAnalytics: true
                }
            }
        ];

        res.json({
            success: true,
            members: teamMembers,
            count: teamMembers.length
        });

    } catch (error) {
        console.error('Error getting team members:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve team members',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get team roles for the authenticated user's organization
router.get('/roles', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Getting team roles for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get team roles (including default roles and custom ones)
        const defaultRoles = [
            {
                id: 'owner',
                name: 'Owner',
                description: 'Full access to all organization features and settings',
                color: '#1e293b',
                isSystem: true,
                permissions: {
                    canCreateEvents: true,
                    canEditEvents: true,
                    canManageTeam: true,
                    canViewAnalytics: true,
                    canManageSettings: true,
                    canDeleteOrganization: true
                }
            },
            {
                id: 'admin',
                name: 'Admin',
                description: 'Administrative access with team and event management capabilities',
                color: '#dc2626',
                isSystem: true,
                permissions: {
                    canCreateEvents: true,
                    canEditEvents: true,
                    canManageTeam: true,
                    canViewAnalytics: true,
                    canManageSettings: false,
                    canDeleteOrganization: false
                }
            },
            {
                id: 'member',
                name: 'Team Member',
                description: 'Basic team member with event creation and editing permissions',
                color: '#7c3aed',
                isSystem: true,
                permissions: {
                    canCreateEvents: true,
                    canEditEvents: true,
                    canManageTeam: false,
                    canViewAnalytics: true,
                    canManageSettings: false,
                    canDeleteOrganization: false
                }
            }
        ];

        // Get custom roles from user data
        const customRoles = user.teamRoles || [];

        const allRoles = [...defaultRoles, ...customRoles];

        res.json({
            success: true,
            roles: allRoles,
            count: allRoles.length
        });

    } catch (error) {
        console.error('Error getting team roles:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve team roles',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Invite team members
router.post('/invite', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { emails, role, message } = req.body;

        console.log(`Inviting team members for user: ${userId}`, { emails, role });

        // Validate input
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ error: 'Email addresses are required' });
        }

        if (!role) {
            return res.status(400).json({ error: 'Role is required' });
        }

        // Validate email formats
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = emails.filter(email => !emailRegex.test(email));
        if (invalidEmails.length > 0) {
            return res.status(400).json({ 
                error: `Invalid email addresses: ${invalidEmails.join(', ')}` 
            });
        }

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create invitations
        const invitations = emails.map(email => ({
            id: 'inv_' + Math.random().toString(36).substr(2, 9) + Date.now(),
            email: email,
            role: role,
            message: message,
            invitedBy: userId,
            invitedAt: new Date().toISOString(),
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }));

        // Store invitations in user data (in real app, would be in separate invitations table)
        if (!user.teamInvitations) {
            user.teamInvitations = [];
        }
        user.teamInvitations.push(...invitations);

        // Update user in database
        await db.updateUser(userId, { 
            teamInvitations: user.teamInvitations,
            updatedAt: new Date().toISOString()
        });

        // In real app, would send actual email invitations here
        console.log('📧 Email invitations would be sent to:', emails);

        res.json({
            success: true,
            message: `Invitations sent to ${emails.length} email${emails.length > 1 ? 's' : ''}`,
            invitations: invitations.map(inv => ({
                id: inv.id,
                email: inv.email,
                role: inv.role,
                status: inv.status
            }))
        });

    } catch (error) {
        console.error('Error sending invitations:', error);
        res.status(500).json({ 
            error: 'Failed to send invitations',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Create custom role
router.post('/roles', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description, permissions } = req.body;

        console.log(`Creating custom role for user: ${userId}`, { name, description, permissions });

        // Validate input
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Role name is required' });
        }

        if (!permissions || typeof permissions !== 'object') {
            return res.status(400).json({ error: 'Permissions are required' });
        }

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if role name already exists
        const existingRoles = user.teamRoles || [];
        const systemRoles = ['owner', 'admin', 'member'];
        const roleName = name.trim().toLowerCase();
        
        if (systemRoles.includes(roleName) || 
            existingRoles.some(role => role.name.toLowerCase() === roleName)) {
            return res.status(400).json({ error: 'Role name already exists' });
        }

        // Create new role
        const newRole = {
            id: 'role_' + Math.random().toString(36).substr(2, 9) + Date.now(),
            name: name.trim(),
            description: description?.trim() || '',
            color: getRandomColor(),
            isSystem: false,
            permissions: {
                canCreateEvents: permissions.canCreateEvents || false,
                canEditEvents: permissions.canEditEvents || false,
                canManageTeam: permissions.canManageTeam || false,
                canViewAnalytics: permissions.canViewAnalytics || false,
                canManageSettings: false, // Custom roles can't manage settings
                canDeleteOrganization: false // Custom roles can't delete organization
            },
            createdAt: new Date().toISOString(),
            createdBy: userId
        };

        // Add role to user's custom roles
        if (!user.teamRoles) {
            user.teamRoles = [];
        }
        user.teamRoles.push(newRole);

        // Update user in database
        await db.updateUser(userId, { 
            teamRoles: user.teamRoles,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Role "${name}" created successfully`,
            role: newRole
        });

    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ 
            error: 'Failed to create role',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Update team member role
router.put('/members/:memberId/role', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const memberId = req.params.memberId;
        const { role } = req.body;

        console.log(`Updating member ${memberId} role to ${role} for user: ${userId}`);

        // Validate input
        if (!role) {
            return res.status(400).json({ error: 'Role is required' });
        }

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find and update team member
        const teamMembers = user.teamMembers || [];
        const memberIndex = teamMembers.findIndex(member => member.id === memberId);
        
        if (memberIndex === -1) {
            return res.status(404).json({ error: 'Team member not found' });
        }

        // Update member role
        teamMembers[memberIndex].role = role;
        teamMembers[memberIndex].updatedAt = new Date().toISOString();

        // Update user in database
        await db.updateUser(userId, { 
            teamMembers: teamMembers,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Team member role updated successfully',
            member: teamMembers[memberIndex]
        });

    } catch (error) {
        console.error('Error updating team member role:', error);
        res.status(500).json({ 
            error: 'Failed to update team member role',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Remove team member
router.delete('/members/:memberId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const memberId = req.params.memberId;

        console.log(`Removing member ${memberId} for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Cannot remove self if owner
        if (memberId === userId) {
            return res.status(400).json({ error: 'Cannot remove yourself from the organization' });
        }

        // Find and remove team member
        const teamMembers = user.teamMembers || [];
        const updatedMembers = teamMembers.filter(member => member.id !== memberId);
        
        if (updatedMembers.length === teamMembers.length) {
            return res.status(404).json({ error: 'Team member not found' });
        }

        // Update user in database
        await db.updateUser(userId, { 
            teamMembers: updatedMembers,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Team member removed successfully'
        });

    } catch (error) {
        console.error('Error removing team member:', error);
        res.status(500).json({ 
            error: 'Failed to remove team member',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Delete custom role
router.delete('/roles/:roleId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const roleId = req.params.roleId;

        console.log(`Deleting role ${roleId} for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Cannot delete system roles
        const systemRoles = ['owner', 'admin', 'member'];
        if (systemRoles.includes(roleId)) {
            return res.status(400).json({ error: 'Cannot delete system roles' });
        }

        // Find and remove custom role
        const teamRoles = user.teamRoles || [];
        const updatedRoles = teamRoles.filter(role => role.id !== roleId);
        
        if (updatedRoles.length === teamRoles.length) {
            return res.status(404).json({ error: 'Custom role not found' });
        }

        // Check if role is being used by team members
        const teamMembers = user.teamMembers || [];
        const membersUsingRole = teamMembers.filter(member => member.role === roleId);
        
        if (membersUsingRole.length > 0) {
            return res.status(400).json({ 
                error: `Cannot delete role. ${membersUsingRole.length} team member(s) are assigned this role.` 
            });
        }

        // Update user in database
        await db.updateUser(userId, { 
            teamRoles: updatedRoles,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Custom role deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ 
            error: 'Failed to delete role',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Get team invitations
router.get('/invitations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Getting team invitations for user: ${userId}`);

        // Get user data
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const invitations = user.teamInvitations || [];
        
        // Filter out expired invitations
        const now = new Date();
        const activeInvitations = invitations.filter(inv => 
            new Date(inv.expiresAt) > now && inv.status === 'pending'
        );

        res.json({
            success: true,
            invitations: activeInvitations,
            count: activeInvitations.length
        });

    } catch (error) {
        console.error('Error getting team invitations:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve team invitations',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Helper function to generate random colors
function getRandomColor() {
    const colors = [
        '#1e293b', '#dc2626', '#7c3aed', '#059669', '#d97706', 
        '#0891b2', '#be123c', '#7c2d12', '#365314', '#1e40af'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

module.exports = router;