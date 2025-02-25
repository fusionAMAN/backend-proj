import { Router } from "express";
import { registerUser, loginUser,logoutUser,refreshAccessToken} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"

import {verifyJWT } from "../middlewares/auth.middleware.js";

const router=Router()

router.route("/register").post(
    upload.fields([  //.field is used to handle multiple fields for file uploads
        {
            name:"avatar",
            maxcount: 1
        },
        {
            name: "coverImage",
            maxcount:1
        }
    ]),
    registerUser
)
router.route("/login").post(loginUser)

//secure routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router