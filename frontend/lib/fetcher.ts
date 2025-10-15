import api from "./api";
export default async function fetcher(url: string) {
  const { data } = await api.get(url);
  return data;
}
