import mongoose from "mongoose";

interface UserProps{
    name: string,
    email: string,
    password: string
}

export const User = mongoose.model<UserProps>('User', new mongoose.Schema<UserProps>({
    name: {type: String},
    email: {type: String},
    password: {type: String}
}))

