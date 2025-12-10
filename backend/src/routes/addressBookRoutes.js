import express from 'express';
import addressBookController from '../controllers/addressBookController.js';

const router = express.Router();

/**
 * Address Book Routes
 * Manages trusted addresses and scam reporting
 */

// Get all addresses in address book for a wallet
router.get('/:walletId', addressBookController.getAddressBook);

// Check if address is in address book
router.get('/check/:walletId/:address', addressBookController.checkAddress);

// Add address to address book
router.post('/', addressBookController.addAddress);

// Update address book entry
router.put('/:id', addressBookController.updateAddress);

// Delete address from address book
router.delete('/:id', addressBookController.deleteAddress);

// Report a scam address
router.post('/report-scam', addressBookController.reportScamAddress);

// Get list of known scam addresses
router.get('/scam-list/all', addressBookController.getScamAddresses);

export default router;
