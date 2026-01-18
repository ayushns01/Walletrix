import express from 'express';
import addressBookController from '../controllers/addressBookController.js';

const router = express.Router();

router.get('/:walletId', addressBookController.getAddressBook);

router.get('/check/:walletId/:address', addressBookController.checkAddress);

router.post('/', addressBookController.addAddress);

router.put('/:id', addressBookController.updateAddress);

router.delete('/:id', addressBookController.deleteAddress);

router.post('/report-scam', addressBookController.reportScamAddress);

router.get('/scam-list/all', addressBookController.getScamAddresses);

export default router;
