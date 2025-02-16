import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"

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


export default router