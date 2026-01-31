const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const { addContact, getContacts } = require("../controllers/contact.controller");

router.post("/add", auth , addContact);
router.get("/", auth, getContacts);

module.exports = router;
