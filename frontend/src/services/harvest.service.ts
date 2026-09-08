import api from "@/lib/axios";
import type { CreateHarvestPayload } from "@/types/harvest";

export const harvestService = {
  async getAll() {
    const response = await api.get("/harvests");
    return response.data;
  },

  async getById(harvestId: string) {
    const response = await api.get(`/harvests/${harvestId}`);
    return response.data;
  },

  async create(data: CreateHarvestPayload) {
    const response = await api.post("/harvests", data);
    return response.data;
  },
};