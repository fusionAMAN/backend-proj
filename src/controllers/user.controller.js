import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        console.log("🔹 Debug: generateAccessAndRefreshTokens called with userId:", userId);

        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        console.log("✅ Debug: User found:", user);

        if (!user.generateAccessToken || !user.generateRefreshToken) {
            throw new ApiError(500, "Token generation functions are missing in User model");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        console.log("✅ Debug: Generated tokens - Access Token:", accessToken, "Refresh Token:", refreshToken);

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });


        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
};

const registerUser = asyncHandler(async(req,res)=>{
   
      // 1. get user details form frontend
      // 2. validation-not empty
      // check if user already exist: Check by email or username or both
     // check for images, check for avtar
     // upload them to cloudinary,avtar
     // create user object- create entry in db
     // remove password and refresh token field from response
     // check for user creation
     // return res

    // yha pe sare data points extract kare->
     const {fullname, email, username, password }=req.body
    //  console.log("email:",email);

    //  if(fullname===""){
    //     thorw new ApiError(400, "fullname is required")-> method1 do same for every fields are username , password
    //  }

    // yha par check kara kise ne empty string toh pass nhi karde
    if(
        [fullname, email, username, password].some((field)=>
        field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required");
        
    }

    // yha pr check kara user already exist toh nhi karta same username or email se
    const existedUser= await User.findOne({
        $or:[{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409,"User name with email or username already existed")
    }

    // yha pe local path nikala avtar ka or store kara
    const avatarLocalPath= req.files?.avatar[0]?.path;
    // const coverImageLocalPath=req.files.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path
    }


    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
   const avatar=await uploadOnCloudinary(avatarLocalPath)
   const coverImage=await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar){
    throw new ApiError(400,"Avatar file is required")
   }

   //database mei entry
   const user= await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url||"",
    email,
    password,
    username: username.toLowerCase()
   })

   const createdUser= await User.findById(user._id).select(
    "-password -refreshToken"
   )
   if(!createdUser){
   throw new ApiError(500,"Something went wrong while registering the user")
   }
   return res.status(201).json(
    new ApiResponse(200,createdUser," User registered Successfully")
   )

})

const loginUser= asyncHandler(async(req,res)=>{
    // req body->data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie

    const {email,username, password}=req.body
    if(!username && !email){
    
        throw new ApiError(400, "username or password is required")
    }

    const user= await User.findOne({
        $or: [{username},{email}]
    })
    if(!user){
        throw new ApiError(404, "User does not exist")
    }
   const isPasswordValid= await user.isPasswordCorrect(password)
   if(!isPasswordValid){
    throw new ApiError(401, "Invalid user credentials")
   }
    const {accessToken, refreshToken}=await 
    generateAccessAndRefreshTokens(user._id)

   const loggedInUser= await User.findById(user._id).
   select("-password -refreshToken")// jo jo filed nhi chahiye
    const options={
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
})

const logoutUser= asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options={
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
})
const refreshAccessToken=asyncHandler(async(req,res)=>{

    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    
    if(!incomingRefreshToken){
        throw new ApiError(401,"uauthorized request");
    }
    const decodedToken=jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )
    const user= await User.findById(decodedToken?._id)
    if(!user){
        throw new ApiError(401,"Invalid refresh token")
    }
    
    if(incomingRefreshToken!==user?.refreshToken){
        throw new ApiError(401, "Refresh token is expired or used")
    }
    const options={
        httpOnly: true,
        secure: true
    }
    const {accessToken, refreshToken}=await generateAccessAndRefreshTokens(user._id)
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {accessToken,refreshToken:newRefreshToken},
            "Access token refereshed"
        )
    )
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}