import { API_BASE } from "./api";
import type { components, paths } from "./api-types";

type Path = keyof paths & string;
type MethodKey = "get" | "post" | "patch" | "delete";

type MethodMap = {
  get: "GET";
  post: "POST";
  patch: "PATCH";
  delete: "DELETE";
};

type Operation<P extends Path, M extends MethodKey> = M extends keyof paths[P] ? paths[P][M] : never;

type QueryFor<P extends Path, M extends MethodKey> = Operation<P, M> extends { parameters: { query: infer Q } } ? Q : never;
type PathParamsFor<P extends Path, M extends MethodKey> = Operation<P, M> extends { parameters: { path: infer R } } ? R : never;
type RequestBodyFor<P extends Path, M extends MethodKey> = Operation<P, M> extends {
  requestBody: { content: { "application/json": infer B } };
}
  ? B
  : never;

type ResponseBodyFor<P extends Path, M extends MethodKey> = Operation<P, M> extends { responses: infer R } ? ExtractResponse<R> : never;

type ExtractResponse<R> = R extends { 200: infer Res }
  ? ExtractContent<Res>
  : R extends { 201: infer Res }
  ? ExtractContent<Res>
  : R extends { 204: infer Res }
  ? ExtractContent<Res>
  : R extends { default: infer Res }
  ? ExtractContent<Res>
  : void;

type ExtractContent<Res> = Res extends { content: { "application/json": infer Body } } ? Body : void;

type BaseOptions = Omit<RequestInit, "headers" | "body" | "method"> & {
  headers?: HeadersInit;
  token?: string | null;
};

type QueryOption<Q> = [Q] extends [never] ? {} : { query?: Q };
type ParamsOption<P> = [P] extends [never] ? {} : { params: P };

type RequestOptions<P extends Path, M extends MethodKey> = BaseOptions & QueryOption<QueryFor<P, M>> & ParamsOption<PathParamsFor<P, M>>;

function buildUrl(path: string, query?: Record<string, unknown>) {
  const url = new URL(path, API_BASE);
  if (!query) {
    return url.toString();
  }
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else {
      params.append(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `${url.toString()}?${queryString}` : url.toString();
}

function resolvePath(path: string, params?: Record<string, unknown>) {
  if (!params) {
    return path;
  }
  return path.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = params[key.trim()];
    if (value === undefined || value === null) {
      throw new Error(`Missing path parameter "${key}" for ${path}`);
    }
    return encodeURIComponent(String(value));
  });
}

async function request<P extends Path, M extends MethodKey>(
  path: P,
  method: MethodMap[M],
  options: RequestOptions<P, M> & { body?: RequestBodyFor<P, M> } = {},
): Promise<ResponseBodyFor<P, M>> {
  const { token, headers, query, params, body, ...init } = options;
  const urlPath = resolvePath(path, params as Record<string, unknown> | undefined);
  const url = buildUrl(urlPath, query as Record<string, unknown> | undefined);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(url, {
    method,
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(headers ?? {}),
    },
    cache: "no-store",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const parseJson = async () => {
    try {
      return (await response.json()) as components["schemas"]["Message"] | unknown;
    } catch {
      return null;
    }
  };

  if (!response.ok) {
    const payload = await parseJson();
    const detail =
      payload && typeof payload === "object" && payload !== null && "detail" in payload ? String((payload as components["schemas"]["Message"]).detail) : null;
    throw new Error(detail || `API error ${response.status}`);
  }

  const data = await parseJson();
  return data as ResponseBodyFor<P, M>;
}

type GetPaths = { [P in Path]: "get" extends keyof paths[P] ? P : never }[Path];
type PostPaths = { [P in Path]: "post" extends keyof paths[P] ? P : never }[Path];
type PatchPaths = { [P in Path]: "patch" extends keyof paths[P] ? P : never }[Path];
type DeletePaths = { [P in Path]: "delete" extends keyof paths[P] ? P : never }[Path];

function get<P extends GetPaths>(path: P, options?: RequestOptions<P, "get">) {
  return request(path, "GET", options);
}

function post<P extends PostPaths>(path: P, body: RequestBodyFor<P, "post">, options?: RequestOptions<P, "post">) {
  return request(path, "POST", { ...options, body });
}

function patch<P extends PatchPaths>(path: P, body: RequestBodyFor<P, "patch">, options?: RequestOptions<P, "patch">) {
  return request(path, "PATCH", { ...options, body });
}

function del<P extends DeletePaths>(path: P, options?: RequestOptions<P, "delete">) {
  return request(path, "DELETE", options);
}

export const api = {
  get,
  post,
  patch,
  delete: del,
};

export type { components, paths };
