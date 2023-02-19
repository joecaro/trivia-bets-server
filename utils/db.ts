import axios, { AxiosError } from 'axios';

export default class {
    baseUrl = 'http://localhost:3001/games';

    async get(id: string) {
        try {
            const res = await axios.get(`${this.baseUrl}/${id}`);
            return res.data;
        } catch (e) {
            return {}
        }
    }

    async getAll() {
        const res = await axios.get(this.baseUrl);
        return res.data;
    }

    async create(data: any) {
        const res = await axios.post(this.baseUrl, data);
        return res.data;
    }

    async update(id: string, data: any) {
        const res = await axios.put(`${this.baseUrl}/${id}`, data);
        return res.data;
    }

    async delete(id: string) {
        const res = await axios.delete(`${this.baseUrl}/${id}`);
        return res.data;
    }
}
