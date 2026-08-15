const express = require('express');
const router = express.Router();

const { role } = require('../controllers');
const validator = require('../middlewares/validator.js');
const validatePayload = require('../validators/role.js');

router.post('/role', validator(validatePayload.create), role.create);
router.get('/role', validator(validatePayload.get, 'query'), role.get);
router.get('/role/:id', role.get);
router.get('/role/dropdown', role.get);
router.put('/role/:id', validator(validatePayload.update), role.update);
router.patch('/role/:id', role.statusUpdate);
router.delete('/role/:id', role.delete);

module.exports = router;