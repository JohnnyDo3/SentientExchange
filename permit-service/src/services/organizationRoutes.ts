/**
 * Organization Management API Routes
 * Handles organization CRUD, member management, and Accela credentials
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  organizations,
  organizationMembers,
  accelaCredentials,
  sharedPermits,
  submissions,
} from '../db/database';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { logger } from '../middleware/logger';
import { AccelaSubmitter } from '../integrations/accelaSubmitter';
import { AccelaClient } from '../integrations/accela-client';
import { sendSubmissionConfirmationEmail } from './emailService';

const router = Router();

// Encryption key for Accela credentials - REQUIRED in production
const ENCRYPTION_KEY = (() => {
  const key = process.env.ACCELA_ENCRYPTION_KEY;

  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error(
      'ACCELA_ENCRYPTION_KEY must be set in production. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (!key) {
    logger.warn('Using default encryption key - NOT SAFE FOR PRODUCTION!');
    return 'default-key-change-in-production-32b';
  }

  return key;
})();

/**
 * Encrypt Accela credentials
 */
function encryptCredentials(credentials: any): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt Accela credentials
 */
function decryptCredentials(encryptedData: string): any {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

  const [ivHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}

// ============================================================================
// ORGANIZATION ROUTES
// ============================================================================

/**
 * POST /api/v1/organizations
 * Create a new organization
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, licenseNumber, phone, address, clerkOrgId } = req.body;
    const userId = req.auth!.userId;

    if (!name) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    const orgId = crypto.randomUUID();

    organizations.create({
      id: orgId,
      name,
      ownerId: userId,
      clerkOrgId,
      description,
      licenseNumber,
      phone,
      address,
    });

    // Add creator as admin member
    organizationMembers.add({
      id: crypto.randomUUID(),
      orgId,
      userId,
      role: 'admin',
    });

    const org = organizations.get(orgId);

    res.status(201).json({
      message: 'Organization created successfully',
      organization: org,
    });
  } catch (error: any) {
    console.error('Failed to create organization:', error);
    res.status(500).json({ error: 'Failed to create organization', details: error.message });
  }
});

/**
 * GET /api/v1/organizations
 * Get all organizations for the current user
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;

    // Get orgs where user is owner
    const ownedOrgs = organizations.getByOwnerId(userId);

    // Get orgs where user is a member
    const memberships = organizationMembers.getByUser(userId);
    const memberOrgIds = memberships.map((m: any) => m.org_id);
    const memberOrgs = memberOrgIds
      .map((id: string) => organizations.get(id))
      .filter((org: any) => org && org.owner_id !== userId); // Exclude owned orgs

    // Combine and add membership info
    const allOrgs = [
      ...ownedOrgs.map((org: any) => ({ ...org, role: 'owner' })),
      ...memberOrgs.map((org: any) => {
        const membership = memberships.find((m: any) => m.org_id === org.id);
        return { ...org, role: membership?.role || 'member' };
      }),
    ];

    res.json({ organizations: allOrgs });
  } catch (error: any) {
    console.error('Failed to fetch organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations', details: error.message });
  }
});

/**
 * GET /api/v1/organizations/:id
 * Get organization details
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;

    const org = organizations.get(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user is owner or member
    const isOwner = org.owner_id === userId;
    const membership = organizationMembers.getByUser(userId).find((m: any) => m.org_id === id);

    if (!isOwner && !membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get members
    const members = organizationMembers.getByOrg(id);

    // Get Accela credentials (without exposing sensitive data)
    const credentials = accelaCredentials.getByOrg(id);

    res.json({
      organization: org,
      members,
      hasAccelaCredentials: !!credentials,
      accelaVerified: credentials?.verified || false,
      userRole: isOwner ? 'owner' : membership?.role,
    });
  } catch (error: any) {
    console.error('Failed to fetch organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization', details: error.message });
  }
});

/**
 * PUT /api/v1/organizations/:id
 * Update organization details
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;
    const { name, description, licenseNumber, phone, address } = req.body;

    const org = organizations.get(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user is owner or admin
    const isOwner = org.owner_id === userId;
    const isAdmin = organizationMembers.isAdmin(id, userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only organization owners and admins can update details' });
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (licenseNumber !== undefined) updates.license_number = licenseNumber;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;

    organizations.update(id, updates);
    const updatedOrg = organizations.get(id);

    res.json({
      message: 'Organization updated successfully',
      organization: updatedOrg,
    });
  } catch (error: any) {
    console.error('Failed to update organization:', error);
    res.status(500).json({ error: 'Failed to update organization', details: error.message });
  }
});

/**
 * DELETE /api/v1/organizations/:id
 * Delete organization (owner only)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;

    const org = organizations.get(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Only owner can delete
    if (org.owner_id !== userId) {
      return res.status(403).json({ error: 'Only organization owner can delete' });
    }

    organizations.delete(id);

    res.json({ message: 'Organization deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete organization:', error);
    res.status(500).json({ error: 'Failed to delete organization', details: error.message });
  }
});

// ============================================================================
// MEMBER MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /api/v1/organizations/:id/members
 * Add a member to organization
 */
router.post('/:id/members', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;
    const { memberUserId, role } = req.body;

    if (!memberUserId || !role) {
      return res.status(400).json({ error: 'memberUserId and role are required' });
    }

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "member"' });
    }

    const org = organizations.get(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user is owner or admin
    const isOwner = org.owner_id === userId;
    const isAdmin = organizationMembers.isAdmin(id, userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only owners and admins can add members' });
    }

    organizationMembers.add({
      id: crypto.randomUUID(),
      orgId: id,
      userId: memberUserId,
      role,
    });

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error: any) {
    console.error('Failed to add member:', error);

    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'User is already a member of this organization' });
    }

    res.status(500).json({ error: 'Failed to add member', details: error.message });
  }
});

/**
 * PUT /api/v1/organizations/:id/members/:memberId
 * Update member role
 */
router.put('/:id/members/:memberId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.auth!.userId;
    const { role } = req.body;

    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "member"' });
    }

    const org = organizations.get(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Only owner or admin can update roles
    const isOwner = org.owner_id === userId;
    const isAdmin = organizationMembers.isAdmin(id, userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only owners and admins can update member roles' });
    }

    organizationMembers.updateRole(id, memberId, role);

    res.json({ message: 'Member role updated successfully' });
  } catch (error: any) {
    console.error('Failed to update member role:', error);
    res.status(500).json({ error: 'Failed to update member role', details: error.message });
  }
});

/**
 * DELETE /api/v1/organizations/:id/members/:memberId
 * Remove a member from organization
 */
router.delete('/:id/members/:memberId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.auth!.userId;

    const org = organizations.get(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user is owner, admin, or removing themselves
    const isOwner = org.owner_id === userId;
    const isAdmin = organizationMembers.isAdmin(id, userId);
    const isSelf = memberId === userId;

    if (!isOwner && !isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prevent owner from being removed
    if (memberId === org.owner_id) {
      return res.status(400).json({ error: 'Cannot remove organization owner' });
    }

    organizationMembers.remove(id, memberId);

    res.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    console.error('Failed to remove member:', error);
    res.status(500).json({ error: 'Failed to remove member', details: error.message });
  }
});

// ============================================================================
// ACCELA CREDENTIALS ROUTES
// ============================================================================

/**
 * POST /api/v1/organizations/:id/accela-credentials
 * Add or update Accela credentials for organization
 */
router.post('/:id/accela-credentials', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;
    const { agency, environment, clientId, clientSecret, username, password } = req.body;

    if (!agency || !environment || !clientId || !clientSecret) {
      return res.status(400).json({
        error: 'Missing required fields: agency, environment, clientId, clientSecret'
      });
    }

    const org = organizations.get(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Only owner or admin can manage credentials
    const isOwner = org.owner_id === userId;
    const isAdmin = organizationMembers.isAdmin(id, userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only owners and admins can manage credentials' });
    }

    const credentials = {
      clientId,
      clientSecret,
      username,
      password,
    };

    const encryptedCreds = encryptCredentials(credentials);

    // Check if credentials already exist
    const existing = accelaCredentials.getByOrg(id);

    if (existing) {
      // Update existing
      accelaCredentials.update(existing.id, encryptedCreds);
    } else {
      // Create new
      accelaCredentials.create({
        id: crypto.randomUUID(),
        orgId: id,
        encryptedCredentials: encryptedCreds,
        agency,
        environment,
      });
    }

    res.json({ message: 'Accela credentials saved successfully' });
  } catch (error: any) {
    console.error('Failed to save Accela credentials:', error);
    res.status(500).json({ error: 'Failed to save credentials', details: error.message });
  }
});

/**
 * DELETE /api/v1/organizations/:id/accela-credentials
 * Delete Accela credentials
 */
router.delete('/:id/accela-credentials', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;

    const org = organizations.get(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Only owner or admin can delete credentials
    const isOwner = org.owner_id === userId;
    const isAdmin = organizationMembers.isAdmin(id, userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only owners and admins can delete credentials' });
    }

    const credentials = accelaCredentials.getByOrg(id);
    if (!credentials) {
      return res.status(404).json({ error: 'No credentials found' });
    }

    accelaCredentials.delete(credentials.id);

    res.json({ message: 'Accela credentials deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete credentials:', error);
    res.status(500).json({ error: 'Failed to delete credentials', details: error.message });
  }
});

// ============================================================================
// SHARED PERMIT ROUTES
// ============================================================================

/**
 * POST /api/v1/submissions/:submissionId/share
 * Create a shareable link for a permit
 */
router.post('/submissions/:submissionId/share', requireAuth, async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const userId = req.auth!.userId;
    const { password, expiresInDays } = req.body;

    const submission = submissions.get(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check if user owns this submission
    if (submission.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const shareToken = crypto.randomBytes(32).toString('hex');
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

    let expiresAt: Date | undefined;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    sharedPermits.create({
      id: crypto.randomUUID(),
      submissionId,
      shareToken,
      createdBy: userId,
      passwordHash,
      expiresAt,
    });

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared/${shareToken}`;

    res.json({
      message: 'Shareable link created successfully',
      shareUrl,
      shareToken,
      expiresAt,
    });
  } catch (error: any) {
    console.error('Failed to create share link:', error);
    res.status(500).json({ error: 'Failed to create share link', details: error.message });
  }
});

/**
 * GET /api/v1/shared/:token
 * Get permit details via share token (public route)
 */
router.get('/shared/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const shared = sharedPermits.getByToken(token);
    if (!shared) {
      return res.status(404).json({ error: 'Shared permit not found or link expired' });
    }

    // Check expiration
    if (shared.expires_at && new Date(shared.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This share link has expired' });
    }

    // Check password if required
    if (shared.password_hash) {
      if (!password) {
        return res.status(401).json({ error: 'Password required', requiresPassword: true });
      }

      const valid = await bcrypt.compare(password as string, shared.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // Get submission details
    const submission = submissions.get(shared.submission_id);
    if (!submission) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    // Increment view count
    sharedPermits.incrementView(shared.id);

    res.json({
      permit: {
        id: submission.id,
        status: submission.status,
        permitData: submission.permit_data,
        pdfPackage: submission.pdf_package,
        accelaRecordId: submission.accela_record_id,
        accelaUrl: submission.accela_url,
        createdAt: submission.created_at,
        submittedAt: submission.submitted_at,
      },
      viewCount: shared.view_count + 1,
    });
  } catch (error: any) {
    console.error('Failed to fetch shared permit:', error);
    res.status(500).json({ error: 'Failed to fetch shared permit', details: error.message });
  }
});

/**
 * DELETE /api/v1/submissions/:submissionId/share/:token
 * Delete a share link
 */
router.delete('/submissions/:submissionId/share/:token', requireAuth, async (req: Request, res: Response) => {
  try {
    const { submissionId, token } = req.params;
    const userId = req.auth!.userId;

    const submission = submissions.get(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check if user owns this submission
    if (submission.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    sharedPermits.deleteByToken(token);

    res.json({ message: 'Share link deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete share link:', error);
    res.status(500).json({ error: 'Failed to delete share link', details: error.message });
  }
});

// ============================================================================
// USER SUBMISSIONS ROUTES
// ============================================================================

/**
 * GET /api/v1/submissions/user/:userId
 * Get all submissions for a user (requires auth)
 */
router.get('/submissions/user/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authUserId = req.auth!.userId;

    // Users can only fetch their own submissions
    if (userId !== authUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userSubmissions = submissions.getByUserId(userId);

    res.json({
      submissions: userSubmissions,
      count: userSubmissions.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions', details: error.message });
  }
});

/**
 * GET /api/v1/submissions/:id
 * Get a single submission (requires auth)
 */
router.get('/submissions/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authUserId = req.auth!.userId;

    const submission = submissions.get(id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Users can only fetch their own submissions
    if (submission.user_id !== authUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      submission,
    });
  } catch (error: any) {
    console.error('Failed to fetch submission:', error);
    res.status(500).json({ error: 'Failed to fetch submission', details: error.message });
  }
});

/**
 * POST /api/v1/submit-to-accela
 * Submit permit to Accela using organization credentials (authenticated route)
 */
router.post('/submit-to-accela', requireAuth, async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.body;
    const userId = req.auth!.userId;

    if (!submissionId) {
      return res.status(400).json({ error: 'submissionId is required' });
    }

    // Get submission
    const submission = submissions.get(submissionId);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Verify user owns this submission
    if (submission.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify submission is in correct state
    if (submission.status !== 'generated') {
      return res.status(400).json({
        error: 'Invalid status',
        details: `Submission status is ${submission.status}, must be 'generated'`,
      });
    }

    // Get user's organization and credentials
    const userOrgs = organizationMembers.getByUser(userId);
    if (!userOrgs || userOrgs.length === 0) {
      return res.status(400).json({
        error: 'No organization found',
        details: 'You must be part of an organization to submit to Accela',
      });
    }

    // Use first org (in production, you might let them select)
    const orgId = userOrgs[0].org_id;
    const credentials = accelaCredentials.getByOrg(orgId);

    if (!credentials || !credentials.verified) {
      return res.status(400).json({
        error: 'Accela credentials not configured',
        details: 'Set up verified Accela credentials in Organization Settings',
      });
    }

    // Decrypt credentials
    const decryptedCreds = decryptCredentials(credentials.encrypted_credentials);

    // Create Accela client with organization's credentials
    const accelaClient = new AccelaClient({
      agency: credentials.agency,
      environment: credentials.environment,
      clientId: decryptedCreds.clientId,
      clientSecret: decryptedCreds.clientSecret,
      appId: decryptedCreds.clientId, // Typically same as clientId
      scope: 'records addresses documents customforms',
    });

    // Create submitter instance
    const submitter = new AccelaSubmitter();

    // Extract permit data and PDFs from submission
    const permitData = JSON.parse(submission.permit_data);
    const pdfPackage = submission.pdf_package ? JSON.parse(submission.pdf_package) : null;

    if (!pdfPackage) {
      return res.status(400).json({
        error: 'No PDF package found',
        details: 'PDF package must be generated before submitting to Accela',
      });
    }

    // Prepare PDFs for upload
    const pdfs = [
      {
        name: pdfPackage.mainForm.filename || 'permit-application.pdf',
        description: pdfPackage.mainForm.description || 'Main permit application form',
        pdf: pdfPackage.mainForm.pdf,
      },
      ...(pdfPackage.additionalDocuments || []).map((doc: any) => ({
        name: doc.filename || doc.name,
        description: doc.description || 'Supporting document',
        pdf: doc.pdf,
      })),
    ];

    logger.info('Submitting to Accela', {
      submissionId,
      documentCount: pdfs.length,
      agency: credentials.agency,
      environment: credentials.environment,
    });

    // Submit to Accela
    const result = await submitter.submitToTampa(permitData, pdfs);

    // Update submission with Accela info
    submissions.setAccelaSubmission(submissionId, result.recordId, result.url);

    logger.info('Permit submitted to Accela successfully', {
      submissionId,
      recordId: result.recordId,
      userId,
      orgId,
      mockMode: result.mockMode,
    });

    // Send submission confirmation email to contractor
    const contractorEmail = permitData?.contractor?.email;
    const contractorName = permitData?.contractor?.name;

    if (contractorEmail) {
      sendSubmissionConfirmationEmail({
        to: contractorEmail,
        customerName: contractorName,
        accelaRecordId: result.recordId,
        accelaUrl: result.url,
        submissionId,
      }).catch(error => {
        logger.error('Failed to send submission confirmation email', {
          error: error.message,
          submissionId,
          to: contractorEmail,
        });
        // Don't fail the request if email fails - log and continue
      });

      logger.info('Submission confirmation email queued', {
        to: contractorEmail,
        submissionId,
        accelaRecordId: result.recordId,
      });
    } else {
      logger.warn('No contractor email available for confirmation', {
        submissionId,
      });
    }

    res.json({
      success: true,
      message: 'Successfully submitted to Accela',
      recordId: result.recordId,
      accelaUrl: result.url,
    });
  } catch (error: any) {
    console.error('Failed to submit to Accela:', error);
    res.status(500).json({
      error: 'Submission failed',
      details: error.message,
    });
  }
});

export default router;
