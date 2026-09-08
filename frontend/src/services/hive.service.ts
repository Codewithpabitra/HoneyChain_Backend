import api from "@/lib/axios";

export const hiveService = {
  async getAll() {
    const response = await api.get("/hives");
    return response.data;
  },

  async getById(hiveId: string) {
    const response = await api.get(`/hives/${hiveId}`);
    return response.data;
  },
};