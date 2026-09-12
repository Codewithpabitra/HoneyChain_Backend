import mongoose, { Schema, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole =
  | "admin"
  | "beekeeper"
  | "processor"
  | "lab"
  | "distributor"
  | "transporter"
  | "auditor";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash?: string;
  walletAddress?: string;
  role: UserRole;
  organizationId?: Types.ObjectId;
  isOrgAdmin: boolean;
  isActive: boolean;
  /** E.164 phone number for SMS alerting (e.g. +918637365698) */
  phone?: string;
  activationToken?: string;
  activationExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "User email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    walletAddress: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      // E.164 format validation
      match: [/^\+[1-9]\d{6,14}$/, "Phone must be in E.164 format (e.g. +918637365698)"],
    },
    passwordHash: {
      type: String,
      required: false,
      select: false, // Omit from queries by default for security
    },
    activationToken: {
      type: String,
      select: false,
      index: true,
    },
    activationExpires: {
      type: Date,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "beekeeper", "processor", "lab", "distributor", "transporter", "auditor"],
      required: [true, "User role is required"],
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: false,
      index: true,
    },
    isOrgAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret.passwordHash;
        delete ret.activationToken;
        delete ret.activationExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash || !candidatePassword) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>("User", UserSchema);
export default User;
