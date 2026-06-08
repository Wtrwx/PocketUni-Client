// http.js

import axios from "axios";
import * as Constants from "@/utils/constants.js";
import { getApiModeHeaders, getLegacyClientFrom } from "@/utils/apiMode.js";

const DEFAULT_TIMEOUT = 15000;

export const webClient = axios.create({
  baseURL: Constants.WEB_API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    Accept: "application/json, text/plain, */*",
  },
});

export const appClient = axios.create({
  baseURL: Constants.MOBILE_API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    Accept: "application/json, text/plain, */*",
  },
});

export const classClient = axios.create({
  baseURL: Constants.CLASS_API_BASE_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
  },
});

const appendEntries = (target, data = {}) => {
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => target.append(key, item));
      return;
    }
    target.append(key, value);
  });
  return target;
};

export const toUrlEncoded = (data = {}) => appendEntries(new URLSearchParams(), data);

export const toMultipart = (data = {}) => appendEntries(new FormData(), data);

export const withLegacyAuth = (oauth_token, oauth_token_secret, extra = {}) => ({
  oauth_token,
  oauth_token_secret,
  version: Constants.WEB_VERSION,
  from: getLegacyClientFrom(),
  ...extra,
});

export const postUrlEncoded = async (client, url, data = {}, config = {}) => {
  const response = await client.post(url, toUrlEncoded(data), {
    ...config,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      ...getApiModeHeaders(),
      ...(config.headers || {}),
    },
  });
  return response.data;
};

export const postMultipart = async (client, url, data = {}, config = {}) => {
  // Browser/axios will add the correct multipart boundary. Do not hard-code it.
  const response = await client.post(url, toMultipart(data), {
    ...config,
    headers: {
      ...getApiModeHeaders(),
      ...(config.headers || {}),
    },
  });
  return response.data;
};

export const getJson = async (client, url, config = {}) => {
  const response = await client.get(url, config);
  return response.data;
};

export const postJson = async (client, url, data = {}, config = {}) => {
  const response = await client.post(url, data, {
    ...config,
    headers: {
      "Content-Type": "application/json",
      ...getApiModeHeaders(),
      ...(config.headers || {}),
    },
  });
  return response.data;
};

export const withClassAuth = (token, sid, config = {}) => ({
  ...config,
  headers: {
    ...(config.headers || {}),
    Authorization: `Bearer ${token}:${sid}`,
  },
});

export const normalizeApiError = (error) => {
  const data = error?.response?.data;
  const message =
    data?.message ||
    data?.msg ||
    error?.message ||
    "网络请求失败";
  const normalized = new Error(message);
  normalized.cause = error;
  normalized.response = error?.response;
  normalized.status = error?.response?.status;
  normalized.data = data;
  return normalized;
};

export const safeContent = (payload, fallback = null) => {
  if (!payload) return fallback;
  if (payload.content !== undefined) return payload.content;
  if (payload.data !== undefined) return payload.data;
  return payload;
};

export const safeList = (payload) => {
  const content = safeContent(payload, []);
  if (Array.isArray(content)) return content;
  if (Array.isArray(content?.list)) return content.list;
  if (Array.isArray(content?.records)) return content.records;
  if (Array.isArray(content?.data)) return content.data;
  return [];
};
