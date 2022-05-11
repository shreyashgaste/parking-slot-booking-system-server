const { Router } = require('express');
const authController = require('../controllers/authController');
// const { checkUser, checkAdmin } = require('../middleware/authMiddleware');
const router = Router();

router.post('/customersignup', authController.customersignup_post);
router.post('/customersignin', authController.customersignin_post);
router.post('/authoritysignup', authController.authoritysignup_post);
router.post('/authoritysignin', authController.authoritysignin_post);
router.post('/adminsignup', authController.adminsignup_post);
router.post('/adminsignin', authController.adminsignin_post);
router.post('/bookslot', authController.bookslot_post);
router.post('/registerparkinglocation', authController.registerparkinglocation_post);
router.post('/findparkingslots', authController.findparkingslots_post);
router.post('/verifyEmail', authController.verifyEmail_post);


module.exports = router;