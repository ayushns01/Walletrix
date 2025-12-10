import prisma from '../lib/prisma.js';

/**
 * Address Book Controller
 * Manages user's trusted addresses
 */

/**
 * Get all address book entries for a wallet
 * GET /api/v1/address-book/:walletId
 */
async function getAddressBook(req, res) {
  try {
    const { walletId } = req.params;

    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'walletId is required',
      });
    }

    const addresses = await prisma.addressBook.findMany({
      where: { walletId: parseInt(walletId) },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error('Error getting address book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get address book',
    });
  }
}

/**
 * Add address to address book
 * POST /api/v1/address-book
 * Body: { walletId, address, label, trusted }
 */
async function addAddress(req, res) {
  try {
    const { walletId, address, label, trusted = true } = req.body;

    if (!walletId || !address || !label) {
      return res.status(400).json({
        success: false,
        error: 'walletId, address, and label are required',
      });
    }

    // Check if address already exists
    const existing = await prisma.addressBook.findFirst({
      where: {
        walletId: parseInt(walletId),
        address: address.toLowerCase(),
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Address already exists in address book',
      });
    }

    const entry = await prisma.addressBook.create({
      data: {
        walletId: parseInt(walletId),
        address: address.toLowerCase(),
        label,
        trusted,
      },
    });

    res.status(201).json({
      success: true,
      address: entry,
    });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add address',
    });
  }
}

/**
 * Update address book entry
 * PUT /api/v1/address-book/:id
 * Body: { label?, trusted? }
 */
async function updateAddress(req, res) {
  try {
    const { id } = req.params;
    const { label, trusted } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'id is required',
      });
    }

    const updateData = {};
    if (label !== undefined) updateData.label = label;
    if (trusted !== undefined) updateData.trusted = trusted;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    const entry = await prisma.addressBook.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      address: entry,
    });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update address',
    });
  }
}

/**
 * Delete address from address book
 * DELETE /api/v1/address-book/:id
 */
async function deleteAddress(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'id is required',
      });
    }

    await prisma.addressBook.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete address',
    });
  }
}

/**
 * Check if address is in address book
 * GET /api/v1/address-book/check/:walletId/:address
 */
async function checkAddress(req, res) {
  try {
    const { walletId, address } = req.params;

    if (!walletId || !address) {
      return res.status(400).json({
        success: false,
        error: 'walletId and address are required',
      });
    }

    const entry = await prisma.addressBook.findFirst({
      where: {
        walletId: parseInt(walletId),
        address: address.toLowerCase(),
      },
    });

    res.status(200).json({
      success: true,
      inAddressBook: !!entry,
      trusted: entry?.trusted || false,
      label: entry?.label || null,
    });
  } catch (error) {
    console.error('Error checking address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check address',
    });
  }
}

/**
 * Report a scam address
 * POST /api/v1/address-book/report-scam
 * Body: { address, severity, description }
 */
async function reportScamAddress(req, res) {
  try {
    const { address, severity = 'medium', description } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'address is required',
      });
    }

    // Check if already reported
    const existing = await prisma.scamAddress.findFirst({
      where: { address: address.toLowerCase() },
    });

    if (existing) {
      // Update report count
      await prisma.scamAddress.update({
        where: { id: existing.id },
        data: { reportCount: existing.reportCount + 1 },
      });

      return res.status(200).json({
        success: true,
        message: 'Scam address report updated',
      });
    }

    // Create new scam report
    const scamAddress = await prisma.scamAddress.create({
      data: {
        address: address.toLowerCase(),
        severity,
        description,
        reportCount: 1,
      },
    });

    res.status(201).json({
      success: true,
      scamAddress,
    });
  } catch (error) {
    console.error('Error reporting scam address:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report scam address',
    });
  }
}

/**
 * Get scam address list
 * GET /api/v1/address-book/scam-list
 */
async function getScamAddresses(req, res) {
  try {
    const scamAddresses = await prisma.scamAddress.findMany({
      orderBy: { reportCount: 'desc' },
      take: 1000, // Limit to top 1000 scam addresses
    });

    res.status(200).json({
      success: true,
      scamAddresses,
    });
  } catch (error) {
    console.error('Error getting scam addresses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scam addresses',
    });
  }
}

export default {
  getAddressBook,
  addAddress,
  updateAddress,
  deleteAddress,
  checkAddress,
  reportScamAddress,
  getScamAddresses,
};
