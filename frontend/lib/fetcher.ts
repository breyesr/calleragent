import api from "./api";

export async function fetcher<T>(path: string): Promise<T> {
  const response = await api.get<T>(path);
  return response.data;
}

export default fetcher;
