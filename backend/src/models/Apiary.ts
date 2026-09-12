import mongoose, { Schema, Document, Types } from "mongoose";

export interface IApiaryCoordinates {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude] per GeoJSON standard
}

export interface IApiaryLocation {
  latitude: number;
  longitude: number;
  region: string;
  address?: string;
  elevationMeters?: number;
  coordinates?: IApiaryCoordinates;
}

export interface IBeekeeperContact {
  name: string;
  phone?: string;
  email?: string;
}

export interface IApiary extends Document {
  apiaryId: string;
  name: string;
  beekeeper: string; // EVM address or account identifier
  beekeeperContact?: IBeekeeperContact;
  location: IApiaryLocation;
  floraType: string[];
  status: "active" | "inactive" | "quarantined";
  capacity: number;
  hives: Types.ObjectId[];
  organizationId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApiaryCoordinatesSchema = new Schema<IApiaryCoordinates>(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coords: number[]) =>
          coords.length === 2 &&
          coords[0] >= -180 &&
          coords[0] <= 180 && // longitude
          coords[1] >= -90 &&
          coords[1] <= 90, // latitude
        message: "Coordinates must be [longitude, latitude] with valid ranges",
      },
    },
  },
  { _id: false }
);

const ApiaryLocationSchema = new Schema<IApiaryLocation>(
  {
    latitude: {
      type: Number,
      required: [true, "Latitude is required"],
      min: [-90, "Latitude cannot be less than -90"],
      max: [90, "Latitude cannot be greater than 90"],
    },
    longitude: {
      type: Number,
      required: [true, "Longitude is required"],
      min: [-180, "Longitude cannot be less than -180"],
      max: [180, "Longitude cannot be greater than 180"],
    },
    region: {
      type: String,
      required: [true, "Geographic region is required"],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    elevationMeters: {
      type: Number,
    },
    coordinates: {
      type: ApiaryCoordinatesSchema,
      default: function () {
        const loc = this as any;
        if (loc.longitude !== undefined && loc.latitude !== undefined) {
          return { type: "Point", coordinates: [loc.longitude, loc.latitude] };
        }
        return undefined;
      },
    },
  },
  { _id: false }
);

const BeekeeperContactSchema = new Schema<IBeekeeperContact>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);

const ApiarySchema = new Schema<IApiary>(
  {
    apiaryId: {
      type: String,
      required: [true, "apiaryId is required"],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Apiary name is required"],
      trim: true,
    },
    beekeeper: {
      type: String,
      required: [true, "Beekeeper/Owner reference is required"],
      trim: true,
      index: true,
    },
    beekeeperContact: {
      type: BeekeeperContactSchema,
    },
    location: {
      type: ApiaryLocationSchema,
      required: [true, "Location metadata is required"],
    },
    floraType: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "quarantined"],
      default: "active",
      index: true,
    },
    capacity: {
      type: Number,
      default: 20,
      min: [1, "Capacity must be at least 1"],
    },
    hives: [
      {
        type: Schema.Types.ObjectId,
        ref: "Hive",
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound & Geospatial Indexes
ApiarySchema.index({ beekeeper: 1, status: 1 });
ApiarySchema.index({ "location.region": 1 });
ApiarySchema.index({ "location.coordinates": "2dsphere" });

export const Apiary = mongoose.model<IApiary>("Apiary", ApiarySchema);
export default Apiary;
