import mongoose,{Schema} from "mongoose"
import { JsonWebTokenError } from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema =new Schema(
    {
        username:{
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true,
            index:true
        },
        email:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullname:{
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar:{
            type: String, // cloudinary url
            required: true,
        },
        coverImage:{
            type: String, //cloudinary url
        },
        watchHistory:[
            {
                type: Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type: String,
            required:[true,'Password is required']
        },
        refreshToken:{
            type: String
        }
    },
    {
        timestamps: true
    }
)
userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();

    this.password= await bcrypt.hash(this.password,10)
    next()
})
/*
This is a pre-save middleware function in Mongoose.
"save" refers to the event that triggers this middleware: whenever a new user is created or an existing user is updated in the database.
The function runs before the document is saved to the database.
if (!this.isModified("password")) return next();:

The this.isModified("password") check ensures that the password is only hashed if it has been modified.
If the password is not modified, it skips the hashing and proceeds to the next middleware or the save operation by calling next().
this.password = await bcrypt.hash(this.password, 10);:

bcrypt.hash() is used to hash the password before storing it.
this.password refers to the password field of the user document. The password is hashed using bcrypt.
The second argument 10 is the salt rounds. A higher number means more secure (slower) hashing.
next();:

The next() function is called to indicate that the middleware is complete and that Mongoose should continue with the save operation.
If the password is hashed successfully, the modified password (hashed version) is saved to the database.
*/ 

userSchema.methods.isPasswordCorrect=async function
(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken=function(){
    return JsonWebTokenError.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullname:this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken=function(){
    return JsonWebTokenError.sign( 
        {
            _id:  this._id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User=mongoose.model("User",userSchema)