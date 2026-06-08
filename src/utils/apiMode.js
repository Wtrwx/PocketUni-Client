export const API_MODE_STORAGE_KEY = "puApiMode";
export const API_MODE_CHANGED_EVENT = "pu-api-mode-change";

export const API_MODE_OPTIONS = Object.freeze([
  {
    value: "auto",
    label: "智能匹配",
    shortLabel: "AUTO",
    legacyFrom: "pc",
    description: "同时读取可用学校，登录时按学校自动选择传统 Web 或新版 Class。",
  },
  {
    value: "web",
    label: "传统 Web",
    shortLabel: "WEB",
    legacyFrom: "pc",
    description: "只使用旧版 Web 登录和传统接口，适合仍未迁移到新平台的学校。",
  },
  {
    value: "class",
    label: "新版 Class",
    shortLabel: "CLASS",
    legacyFrom: "pc",
    description: "只使用 class.pocketuni.net 新平台登录与接口，学校列表更聚焦。",
  },
  {
    value: "ios",
    label: "iOS App",
    shortLabel: "iOS",
    legacyFrom: "ios",
    description: "实验兼容通道，仅用于需要 App 来源参数的旧接口请求。",
  },
]);

const fallbackMode = "auto";

export const getApiModeOption = (mode) =>
  API_MODE_OPTIONS.find((option) => option.value === mode) || API_MODE_OPTIONS[0];

export const getApiMode = () => {
  try {
    const value = window.localStorage.getItem(API_MODE_STORAGE_KEY);
    return getApiModeOption(value).value || fallbackMode;
  } catch {
    return fallbackMode;
  }
};

export const setApiMode = (mode) => {
  const normalized = getApiModeOption(mode).value;
  try {
    window.localStorage.setItem(API_MODE_STORAGE_KEY, normalized);
    window.dispatchEvent(
      new CustomEvent(API_MODE_CHANGED_EVENT, {
        detail: { mode: normalized, option: getApiModeOption(normalized) },
      })
    );
  } catch {
    // Ignore storage errors in restricted WebViews.
  }
  return normalized;
};

export const getLegacyClientFrom = () => getApiModeOption(getApiMode()).legacyFrom;

export const getApiModeHeaders = () => {
  const mode = getApiMode();
  if (mode !== "ios") return {};
  return {
    "X-PU-Client": "ios",
    "X-PU-Compatibility": "PocketUni-Client",
  };
};
