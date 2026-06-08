// api.js

import CryptoJS from "crypto-js";
import * as Constants from "@/utils/constants.js";
import { joinSign } from "@/utils/sign.js";
import {
  appClient,
  classClient,
  getJson,
  normalizeApiError,
  postJson,
  postMultipart,
  postUrlEncoded,
  webClient,
  withClassAuth,
  withLegacyAuth,
} from "@/utils/http.js";

const request = async (task, options = {}) => {
  try {
    return await task();
  } catch (error) {
    if (!options.silent) console.error(error);
    throw normalizeApiError(error);
  }
};

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

const avatarSource = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("{")) {
      try {
        return avatarSource(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (typeof value !== "object") return "";
  return avatarSource(
    firstDefined(
      value.url,
      value.avatarUrl,
      value.avatorName,
      value.avatar,
      value.large,
      value.middle,
      value.big,
      value.small,
      value.original,
      value.src,
      value.href,
      value.path,
      value.origin,
      value.originUrl,
      value.thumbUrl,
      value.fileUrl,
      value.picUrl,
      value.photo,
      value.headImg,
      value.headimg,
      value.data,
      value.content
    )
  );
};

export const normalizeAvatarUrl = (...values) => {
  const raw = values.map(avatarSource).find((value) => value);
  if (!raw || raw === "null" || raw === "undefined" || raw === "[object Object]") return "";
  const normalized = raw.replace(/\\/g, "/");
  if (/^(data:|blob:|https?:\/\/)/i.test(normalized)) return normalized;
  if (normalized.startsWith("//")) return `https:${normalized}`;
  return new URL(
    normalized.startsWith("/") ? normalized : `/${normalized}`,
    Constants.WEB_API_BASE_URL
  ).href;
};

export const isClassSession = (userData) =>
  userData?.platform === "class" || Boolean(userData?.token && userData?.sid && !userData?.oauth_token);

export const isGoSchool = (school) =>
  String(school?.is_go ?? school?.isGo ?? "0") === "1" && Boolean(firstDefined(school?.go_id, school?.goId, school?.sid, school?.id));

export const getSchoolSid = (school) => {
  const sid = firstDefined(school?.go_id, school?.goId, school?.sid, school?.id);
  return sid === undefined ? 0 : Number(sid);
};

const getClassAuth = (userData) => {
  const token = userData?.token || userData?.classToken;
  const sid = Number(userData?.sid || userData?.schoolId || 0);
  if (!token || !sid) throw new Error("未登录或 class token 失效");
  return { token, sid };
};

const classAuthConfig = (userData, config = {}) => {
  const { token, sid } = getClassAuth(userData);
  return withClassAuth(token, sid, config);
};

const shouldRetryAsForm = (error) => {
  const status = error?.response?.status;
  if ([400, 415, 422].includes(status)) return true;
  const data = error?.response?.data || {};
  const message = String(data.message || data.msg || error?.message || "");
  return /content-?type|json|parse|参数|parameter|unsupported/i.test(message);
};

const postClassJsonWithFormFallback = (userData, endpoint, data = {}, config = {}) =>
  request(async () => {
    const authConfig = classAuthConfig(userData, config);
    try {
      return await postJson(classClient, endpoint, data, authConfig);
    } catch (error) {
      if (!shouldRetryAsForm(error)) throw error;
      return postUrlEncoded(classClient, endpoint, data, authConfig);
    }
  });

const getClassJsonWithParams = (userData, endpoint, params = {}, config = {}) =>
  request(() => {
    const authConfig = classAuthConfig(userData, config);
    return getJson(classClient, endpoint, {
      ...authConfig,
      params: {
        ...(authConfig.params || {}),
        ...params,
      },
    });
  });

const postClassPublicJsonWithFormFallback = (endpoint, data = {}, config = {}) =>
  request(async () => {
    try {
      return await postJson(classClient, endpoint, data, config);
    } catch (error) {
      if (!shouldRetryAsForm(error)) throw error;
      return postUrlEncoded(classClient, endpoint, data, config);
    }
  });

const toTimestamp = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value > 100000000000 ? Math.floor(value / 1000) : value;
  if (/^\d+$/.test(String(value))) {
    const number = Number(value);
    return number > 100000000000 ? Math.floor(number / 1000) : number;
  }
  const parsed = Date.parse(String(value).replace(/-/g, "/"));
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
};

const getActivityIdValue = (row = {}) => {
  const source = row.baseInfo || row;
  return firstDefined(source.id, row.id, row.activityId, row.actiId);
};

const toActivityIdParam = (value) => {
  const raw = firstDefined(value?.id, value?.activityId, value?.actiId, value);
  if (raw === undefined || raw === null || raw === "") throw new Error("活动 ID 缺失");
  const text = String(raw).trim();
  return /^\d+$/.test(text) ? Number(text) : text;
};

const normalizeClassSession = (data = {}, school = null, currentInfo = null) => {
  const baseUserInfo = data.baseUserInfo || {};
  const sid = Number(data.sid || getSchoolSid(school));
  return {
    platform: "class",
    sid,
    token: data.token,
    classToken: data.token,
    school,
    baseUserInfo,
    oldUserInfo: data.oldUserInfo || {},
    classUserInfo: currentInfo || null,
    deadline: data.deadline,
    user_info: {
      uid: firstDefined(baseUserInfo.uid, baseUserInfo.id, currentInfo?.uid, currentInfo?.id),
      mid: firstDefined(baseUserInfo.mid, currentInfo?.mid),
      uname: firstDefined(baseUserInfo.username, baseUserInfo.uname, currentInfo?.username, currentInfo?.uname),
      realname: firstDefined(baseUserInfo.realname, currentInfo?.realname),
    },
  };
};

const normalizeClassProfile = (currentInfo = {}, pcInfo = {}, userData = {}) => {
  const base = userData.baseUserInfo || {};
  const creditValue = firstDefined(
    pcInfo.credit?.score,
    pcInfo.credit?.value,
    pcInfo.credit,
    currentInfo.credit,
    currentInfo.basicCredit
  );
  return {
    realname: firstDefined(currentInfo.realname, base.realname, userData.user_info?.realname),
    sno: firstDefined(currentInfo.username, currentInfo.cardNo, base.username, base.cardno),
    yx: firstDefined(currentInfo.collegeName, base.collegeName, currentInfo.yx),
    major: firstDefined(currentInfo.majorName, base.majorName, base.major),
    year: firstDefined(currentInfo.nYear, currentInfo.yearName, base.nYear),
    class: firstDefined(currentInfo.className, base.className),
    cx: firstDefined(pcInfo.cx?.score, pcInfo.cx, currentInfo.cx),
    credit: creditValue,
    amount2: firstDefined(pcInfo.puAmount?.amount, pcInfo.puAmount, currentInfo.amount),
    event_count: firstDefined(pcInfo.event?.count, pcInfo.event, currentInfo.activityCount),
    group_count: firstDefined(pcInfo.tribe?.count, pcInfo.tribe, currentInfo.tribeCount),
    avatar: normalizeAvatarUrl(
      currentInfo.avatorName,
      currentInfo.avatar,
      currentInfo.avatarUrl,
      base.avatar?.url,
      base.avatar
    ),
    raw: { currentInfo, pcInfo, base },
  };
};

export const normalizeClassActivity = (row = {}) => {
  const source = row.baseInfo || row;
  const id = getActivityIdValue(source);
  const startTime = toTimestamp(source.startTime);
  const endTime = toTimestamp(source.endTime);
  const joinStartTime = toTimestamp(source.joinStartTime);
  return {
    ...row,
    id,
    activityId: id,
    actiId: id,
    title: source.name,
    name: source.name,
    sTime: startTime,
    eTime: endTime,
    startline: joinStartTime,
    deadline: endTime,
    address: source.address || "",
    category: source.statusName,
    signType: source.signType,
    raw: row,
  };
};

const classSignTypeName = (signType) => {
  if (String(signType) === "1") return "签到员扫码";
  if (String(signType) === "2") return "GPS 定位";
  if (String(signType) === "3") return "免扫码 / 线上";
  return "未知";
};

export const normalizeClassActivityDetail = (payload = {}, activityId = null) => {
  const base = payload.baseInfo || payload;
  const id = activityId === null ? getActivityIdValue(payload) : toActivityIdParam(activityId);
  const joinStatus = payload.joinStatus || {};
  const signType = base.signType;
  const startTime = toTimestamp(base.startTime);
  const endTime = toTimestamp(base.endTime);
  const joinStartTime = toTimestamp(base.joinStartTime);
  const joinEndTime = toTimestamp(base.joinEndTime);
  const allowUserCount = Number(base.allowUserCount || 0);
  const joinUserCount = Number(base.joinUserCount || 0);

  return {
    actiId: id,
    activityId: id,
    id,
    name: base.name,
    descs: base.description || "",
    allow_school: [],
    allow_year: [],
    allow_group: [],
    regStartTimeStr: joinStartTime || startTime,
    regEndTimeStr: joinEndTime || endTime,
    startTime,
    endTime,
    credit: base.credit,
    location: base.address || "",
    joinNum: joinUserCount,
    leftNum: Math.max(allowUserCount - joinUserCount, 0),
    sign_in_num: base.signInUserCount || 0,
    sign_out_num: base.signOutUserCount || 0,
    is_gps_sign: String(signType) === "2" ? "1" : "0",
    is_need_sign_out: String(base.needSignOut || 0),
    signType,
    signTypeName: classSignTypeName(signType),
    signStartTime: base.signStartTime,
    signOutStartTime: base.signOutStartTime,
    signLat: base.signLat,
    signLong: base.signLong,
    signPlace: base.signPlace,
    signRadius: base.signRadius,
    joinInfo: payload.joinInfo || base.joinInfo || {},
    joinStatus,
    userStatus: payload.userStatus || base.userStatus || {},
    college: payload.college || base.college || null,
    classRaw: payload,
  };
};

export const normalizeClassActivityMember = (row = {}) => ({
  id: row.id,
  uid: row.uid,
  oldId: row.oldId,
  realname: row.realname,
  college: row.college,
  major: row.major,
  class: row.class,
  year: row.year,
  credit: row.credit,
  logo: row.logo,
  signName: row.signName,
  showSignInOut: row.showSignInOut,
  multiSignOkCount: row.multiSignOkCount,
  isMultiOk: row.isMultiOk,
  raw: row,
});

export const normalizeClassActivityNews = (row = {}) => ({
  id: row.id,
  title: row.title,
  content: row.content || "",
  createTime: row.createTime,
  realname: row.realname,
  raw: row,
});

export const normalizeClassActivityEvaluation = (row = {}) => ({
  id: row.id,
  uid: row.uid,
  realname: row.realname,
  avatar: normalizeAvatarUrl(row.logo),
  star: row.star,
  level: row.level,
  content: row.content || row.comment || "",
  pics: row.pics,
  createTime: row.createTime,
  raw: row,
});

export const normalizeClassActivityVotePlayer = (row = {}) => ({
  id: row.id,
  uid: row.uid,
  realname: row.realname,
  title: row.title,
  logo: row.logo,
  voteNum: row.voteNum,
  raw: row,
});

export const normalizeClassActivityMidwayRecord = (row = {}) => ({
  id: row.id,
  uid: row.uid,
  realname: row.realname,
  signTime: row.signTime,
  signAddress: row.signAddress,
  status: row.status,
  raw: row,
});

export const normalizeClassActivityJoinMaterial = (payload = {}) => {
  const data = payload?.data || payload || {};
  const list = Array.isArray(data.list) ? data.list : [];
  return {
    needMaterial: Boolean(data.needMaterial || list.length),
    list: list.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      required: row.required,
      options: row.options,
      raw: row,
    })),
    raw: data,
  };
};

const normalizeClassPagedList = (response = {}, normalizer = (row) => row) => {
  const list = response?.data?.list || [];
  return {
    ...response,
    content: list.map(normalizer),
    pageInfo: response?.data?.pageInfo || {},
    total_count: response?.data?.pageInfo?.count || list.length,
  };
};

const toBase64 = (bytes) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const randomText = (length = 16) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  if (window?.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    const fallback = CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex);
    for (let index = 0; index < length; index += 1) {
      bytes[index] = Number.parseInt(fallback.slice(index * 2, index * 2 + 2), 16);
    }
  }
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
};

const bytesToWordArray = (bytes) =>
  CryptoJS.enc.Hex.parse(Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""));

const createClassXSignWithCryptoJs = () => {
  const ivBytes = new Uint8Array(16);
  if (window?.crypto?.getRandomValues) {
    window.crypto.getRandomValues(ivBytes);
  } else {
    const fallback = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
    for (let index = 0; index < 16; index += 1) {
      ivBytes[index] = Number.parseInt(fallback.slice(index * 2, index * 2 + 2), 16);
    }
  }
  const iv = bytesToWordArray(ivBytes);
  const key = bytesToWordArray(Constants.CLASS_X_SIGN_KEY);
  const payload = JSON.stringify({
    echo: randomText(),
    timestamp: Math.round(Date.now() / 1000).toString(),
    client: "web",
  });
  const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(payload), key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return iv.clone().concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64);
};

const createClassXSign = async () => {
  if (!window?.crypto?.subtle) return createClassXSignWithCryptoJs();
  const iv = new Uint8Array(16);
  window.crypto.getRandomValues(iv);
  try {
    const key = await window.crypto.subtle.importKey(
      "raw",
      new Uint8Array(Constants.CLASS_X_SIGN_KEY),
      { name: "AES-CBC", length: 128 },
      false,
      ["encrypt"]
    );
    const payload = JSON.stringify({
      echo: randomText(),
      timestamp: Math.round(Date.now() / 1000).toString(),
      client: "web",
    });
    const encrypted = new Uint8Array(
      await window.crypto.subtle.encrypt(
        { name: "AES-CBC", iv },
        key,
        new TextEncoder().encode(payload)
      )
    );
    const result = new Uint8Array(iv.length + encrypted.length);
    result.set(iv, 0);
    result.set(encrypted, iv.length);
    return toBase64(result);
  } catch (error) {
    console.warn("WebCrypto X-Sign failed, falling back to CryptoJS", error);
    return createClassXSignWithCryptoJs();
  }
};

export async function getLoginQRCode() {
  return request(() => postUrlEncoded(webClient, Constants.LEGACY_ENDPOINTS.loginQRCode));
}

export async function pollingLogin(token) {
  return request(() =>
    postMultipart(webClient, Constants.LEGACY_ENDPOINTS.pollingLogin, { token })
  );
}

export async function login(email, type, password, usernum, sid, school) {
  return request(() =>
    postMultipart(webClient, Constants.LEGACY_ENDPOINTS.login, {
      email,
      type,
      password,
      usernum,
      sid,
      school,
    })
  );
}

export async function getSchools(options = {}) {
  return request(() => getJson(webClient, Constants.LEGACY_ENDPOINTS.schools), options);
}

export async function getClassSchools(options = {}) {
  return request(() => getJson(classClient, Constants.CLASS_ENDPOINTS.schoolList), options);
}

export async function getClassLoginQRCode(sid) {
  return request(() =>
    getJson(classClient, Constants.CLASS_ENDPOINTS.loginQRCode, {
      params: { sid },
    })
  );
}

export async function pollingClassLogin(qrcodeId, school = null) {
  const response = await request(() =>
    getJson(classClient, Constants.CLASS_ENDPOINTS.pollingLogin, {
      params: { qrcodeId },
    })
  );
  if (response?.code === 0 && response?.data) {
    response.content = normalizeClassSession(response.data, school);
    response.message = response.msg || "success";
  }
  return response;
}

export async function classLogin(userName, password, sid, school = null) {
  const response = await request(() =>
    postJson(classClient, Constants.CLASS_ENDPOINTS.login, {
      userName,
      password,
      sid: Number(sid),
      device: "pc",
    })
  );

  if (response?.code !== 0) return response;
  const session = normalizeClassSession(response.data, school);
  try {
    const current = await getClassCurrentInfo(session);
    session.classUserInfo = current?.data || null;
  } catch (error) {
    console.warn("class current user fetch failed", error);
  }

  return {
    ...response,
    message: response.msg || "success",
    content: session,
  };
}

export async function getClassCurrentInfo(userData) {
  return request(() =>
    getJson(classClient, Constants.CLASS_ENDPOINTS.currentUser, classAuthConfig(userData))
  );
}

export async function getClassPcInfo(userData) {
  return request(() =>
    postJson(
      classClient,
      Constants.CLASS_ENDPOINTS.pcUser,
      { sid: getClassAuth(userData).sid },
      classAuthConfig(userData)
    )
  );
}

export async function getClassPersonalProfile(userData) {
  const [current, pcInfo] = await Promise.all([
    getClassCurrentInfo(userData),
    getClassPcInfo(userData).catch(() => ({ data: {} })),
  ]);
  return {
    code: 0,
    message: "success",
    content: normalizeClassProfile(current?.data || {}, pcInfo?.data || {}, userData),
  };
}

export async function getClassActivityList(userData, page = 1, keyword = "", limit = 10) {
  const response = await request(() =>
    postJson(
      classClient,
      Constants.CLASS_ENDPOINTS.activityList,
      {
        page,
        limit,
        pageSize: limit,
        keyword,
        sid: getClassAuth(userData).sid,
      },
      classAuthConfig(userData)
    )
  );
  const list = response?.data?.list || [];
  return {
    ...response,
    content: list.map(normalizeClassActivity),
    total_count: response?.data?.pageInfo?.count || list.length,
  };
}

export async function getClassActivityDetail(userData, id) {
  const activityId = toActivityIdParam(id);
  const response = await request(() =>
    postJson(
      classClient,
      Constants.CLASS_ENDPOINTS.activityDetail,
      { id: activityId },
      classAuthConfig(userData)
    )
  );
  return {
    ...response,
    content: normalizeClassActivityDetail(response?.data || {}, activityId),
  };
}

export async function getClassMyActivityList(userData, page = 1, limit = 10, type = 1) {
  const response = await request(() =>
    postJson(
      classClient,
      Constants.CLASS_ENDPOINTS.myActivityList,
      { page, limit, pageSize: limit, type },
      classAuthConfig(userData)
    )
  );
  const list = response?.data?.list || [];
  return {
    ...response,
    content: list.map(normalizeClassActivity),
    total_count: response?.data?.pageInfo?.count || list.length,
  };
}

export async function getClassManagedActivityList(userData, page = 1, keyword = "", limit = 10, type = 0) {
  const response = await postClassJsonWithFormFallback(
    userData,
    Constants.CLASS_ENDPOINTS.myManageEventList,
    {
      title: keyword,
      page,
      limit,
      type,
    }
  );
  const list = response?.data?.list || [];
  return {
    ...response,
    content: list.map(normalizeClassActivity),
    total_count: response?.data?.pageInfo?.count || list.length,
  };
}

export async function getClassMessages(userData, page = 1, type = 0, limit = 10) {
  const response = await request(() =>
    postJson(
      classClient,
      Constants.CLASS_ENDPOINTS.messages,
      { page, limit, pageSize: limit, type },
      classAuthConfig(userData)
    )
  );
  return {
    ...response,
    content: response?.data?.msgList || [],
    total_count: response?.data?.pageInfo?.count || 0,
  };
}

export async function getClassCanSignActivityList(userData) {
  const response = await getClassJsonWithParams(userData, Constants.APP_ENDPOINTS.activityCanSignList);
  const list = Array.isArray(response?.data)
    ? response.data
    : response?.data?.list || response?.data?.records || response?.content?.list || [];
  return {
    ...response,
    content: Array.isArray(list) ? list.map(normalizeClassActivity) : [],
  };
}

export async function getClassActivitySignResult(userData, activityId) {
  return postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activitySignResult,
    { activityId: toActivityIdParam(activityId) }
  );
}

export async function getClassActivityMembers(userData, activityId, page = 1, limit = 10) {
  const response = await postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityMember,
    {
      activityId: toActivityIdParam(activityId),
      page,
      limit,
    }
  );
  const list = response?.data?.list || [];
  return {
    ...response,
    content: list.map(normalizeClassActivityMember),
    pageInfo: response?.data?.pageInfo || {},
    total_count: response?.data?.pageInfo?.count || list.length,
  };
}

export async function getClassActivityNewsList(userData, activityId, page = 1, limit = 5) {
  const response = await postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityNewsList,
    {
      activityId: toActivityIdParam(activityId),
      page,
      limit,
    }
  );
  return normalizeClassPagedList(response, normalizeClassActivityNews);
}

export async function getClassActivityEvaluations(userData, activityId, page = 1, limit = 5, level = "") {
  const data = {
    activityId: toActivityIdParam(activityId),
    page,
    limit,
  };
  if (level !== "") data.level = level;
  const response = await postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityEvaluateList,
    data
  );
  return normalizeClassPagedList(response, normalizeClassActivityEvaluation);
}

export async function getClassActivityVotePlayers(userData, activityId, page = 1, limit = 5, key = "") {
  const response = await postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityVotePlayerList,
    {
      activityId: toActivityIdParam(activityId),
      page,
      limit,
      key,
    }
  );
  return normalizeClassPagedList(response, normalizeClassActivityVotePlayer);
}

export async function getClassActivityJoinMaterialInfo(userData, activityId) {
  const response = await postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityJoinMaterialInfo,
    { activityId: toActivityIdParam(activityId) }
  );
  return {
    ...response,
    content: normalizeClassActivityJoinMaterial(response),
  };
}

export async function getClassActivityMidwayStatus(userData, activityId) {
  return postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityMidwayPrepStatus,
    { activityId: toActivityIdParam(activityId) }
  );
}

export async function getClassActivityMidwayRecords(userData, activityId, page = 1, limit = 5) {
  const response = await postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityMidwaySignRecord,
    {
      activityId: toActivityIdParam(activityId),
      page,
      limit,
    }
  );
  return normalizeClassPagedList(response, normalizeClassActivityMidwayRecord);
}

export async function addClassActivityNews(userData, activityId, title) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) throw new Error("公告标题不能为空");
  return postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityNewsAdd,
    {
      activityId: toActivityIdParam(activityId),
      title: cleanTitle,
    }
  );
}

export async function submitClassActivityEvaluation(userData, activityId, star, pics = "") {
  const score = Number(star);
  if (!Number.isFinite(score) || score < 1) throw new Error("评价星级不能为空");
  return postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityEvaluateAdd,
    {
      activityId: toActivityIdParam(activityId),
      pics,
      star: score,
    }
  );
}

export async function voteClassActivityPlayer(userData, activityId, playId) {
  const playerId = firstDefined(playId?.id, playId?.playId, playId);
  if (playerId === undefined || playerId === null || playerId === "") throw new Error("投票项 ID 缺失");
  return postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityVote,
    {
      activityId: toActivityIdParam(activityId),
      playId: playerId,
    }
  );
}

export async function signClassActivityMidway(userData, activityId) {
  return postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityMidwaySign,
    { activityId: toActivityIdParam(activityId) }
  );
}

export async function getClassCollectedActivityList(userData, page = 1, limit = 10) {
  const response = await postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityCollectList,
    { page, limit }
  );
  return normalizeClassPagedList(response, normalizeClassActivity);
}

export async function collectClassActivity(userData, activityId) {
  return postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityCollectAdd,
    { activityId: toActivityIdParam(activityId) }
  );
}

export async function uncollectClassActivity(userData, activityId) {
  return postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.activityCollectDel,
    { activityId: toActivityIdParam(activityId) }
  );
}

export async function getClassSystemTime(userData) {
  return getClassJsonWithParams(userData, Constants.APP_ENDPOINTS.systemTime);
}

export async function changeClassPassword(userData, originPassword, password, confirmPassword) {
  if (!originPassword || !password || !confirmPassword) throw new Error("请完整填写原密码和新密码");
  if (password !== confirmPassword) throw new Error("两次新密码不一致");
  return postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.userResetPasswd,
    {
      originPassword,
      password,
      confirmPassword,
    }
  );
}

export async function sendClassPersonalCode(userData, phone, type = "") {
  const cleanPhone = String(phone || "").trim();
  if (!cleanPhone) throw new Error("手机号不能为空");
  const payload = { phone: cleanPhone };
  if (type !== "") payload.type = type;
  return postClassJsonWithFormFallback(
    userData,
    Constants.APP_ENDPOINTS.personalSendCode,
    payload
  );
}

export async function getClassForgotPasswordPhone(username, sid) {
  if (!username || !sid) throw new Error("账号或学校 sid 缺失");
  return postClassPublicJsonWithFormFallback(
    Constants.CLASS_ENDPOINTS.forgotPasswordPhone,
    {
      username,
      sid: Number(sid),
    }
  );
}

export async function sendClassForgotPasswordCode(username, sid) {
  if (!username || !sid) throw new Error("账号或学校 sid 缺失");
  return postClassPublicJsonWithFormFallback(
    Constants.CLASS_ENDPOINTS.forgotPasswordSendCode,
    {
      username,
      sid: Number(sid),
    }
  );
}

export async function resetClassForgotPassword(username, sid, password, confirmPassword) {
  if (!username || !sid) throw new Error("账号或学校 sid 缺失");
  if (!password || !confirmPassword) throw new Error("请填写新密码");
  if (password !== confirmPassword) throw new Error("两次新密码不一致");
  return postClassPublicJsonWithFormFallback(
    Constants.CLASS_ENDPOINTS.forgotPasswordReset,
    {
      password,
      confirmPassword,
      username,
      sid: Number(sid),
    }
  );
}

export async function resetCurrentClassForgotPassword(userData, username, password, confirmPassword) {
  const selfUsername = getClassSelfUsername(userData);
  if (!selfUsername || String(username) !== String(selfUsername)) {
    throw new Error("为避免误操作，忘记密码重置只允许当前登录账号自测。");
  }
  return resetClassForgotPassword(username, getClassAuth(userData).sid, password, confirmPassword);
}

const getClassSelfUserId = (userData) =>
  firstDefined(userData?.baseUserInfo?.id, userData?.user_info?.uid);

export const getClassSelfUsername = (userData) =>
  firstDefined(
    userData?.baseUserInfo?.username,
    userData?.baseUserInfo?.cardno,
    userData?.classUserInfo?.username,
    userData?.classUserInfo?.cardNo,
    userData?.user_info?.uname
  );

const submitClassActivityUserQrSign = (userData, activityId, type = "in") => {
  const endpoint =
    type === "out"
      ? Constants.APP_ENDPOINTS.activitySignOut
      : Constants.APP_ENDPOINTS.activitySignIn;
  const mid = getClassSelfUserId(userData);
  if (!mid) throw new Error("当前用户 ID 缺失，无法提交扫码签到。");
  return postClassJsonWithFormFallback(
    userData,
    endpoint,
    {
      activityId: toActivityIdParam(activityId),
      mid,
    }
  );
};

export async function signInClassActivityUserQr(userData, activityId) {
  return submitClassActivityUserQrSign(userData, activityId, "in");
}

export async function signOutClassActivityUserQr(userData, activityId) {
  return submitClassActivityUserQrSign(userData, activityId, "out");
}

const submitClassActivityCodeSign = async (
  userData,
  activityId,
  signInAddress,
  { timestamp, longitude = "", latitude = "" } = {},
  type = "in"
) => {
  const endpoint =
    type === "out"
      ? Constants.APP_ENDPOINTS.activitySignOutCode
      : Constants.APP_ENDPOINTS.activitySignInCode;
  let signTimestamp = timestamp;
  if (!signTimestamp) {
    const timeResponse = await getClassSystemTime(userData);
    signTimestamp = firstDefined(timeResponse?.data?.timestamp, timeResponse?.timestamp);
  }
  return getClassJsonWithParams(
    userData,
    endpoint,
    {
      activityId: toActivityIdParam(activityId),
      signInAddress,
      timestamp: signTimestamp,
      longitude,
      latitude,
    }
  );
};

export async function signInClassActivityCode(userData, activityId, signInAddress, options = {}) {
  return submitClassActivityCodeSign(userData, activityId, signInAddress, options, "in");
}

export async function signOutClassActivityCode(userData, activityId, signInAddress, options = {}) {
  return submitClassActivityCodeSign(userData, activityId, signInAddress, options, "out");
}

const submitClassActivityGpsSign = (userData, activityId, signInAddress, type = "in") => {
  const endpoint =
    type === "out"
      ? Constants.APP_ENDPOINTS.activitySignOutGps
      : Constants.APP_ENDPOINTS.activitySignInGps;
  return postClassJsonWithFormFallback(
    userData,
    endpoint,
    {
      activityId: toActivityIdParam(activityId),
      signInAddress,
    }
  );
};

export async function signInClassActivityGps(userData, activityId, signInAddress) {
  return submitClassActivityGpsSign(userData, activityId, signInAddress, "in");
}

export async function signOutClassActivityGps(userData, activityId, signInAddress) {
  return submitClassActivityGpsSign(userData, activityId, signInAddress, "out");
}

export async function joinClassEvent(userData, id) {
  const xSign = await createClassXSign();
  return postClassJsonWithFormFallback(
    userData,
    Constants.CLASS_ENDPOINTS.activityJoin,
    { activityId: toActivityIdParam(id) },
    { headers: { "X-Sign": xSign } }
  );
}

export async function cancelClassEvent(userData, id) {
  return postClassJsonWithFormFallback(
    userData,
    Constants.CLASS_ENDPOINTS.activityCancel,
    { activityId: toActivityIdParam(id) }
  );
}

export async function getPersonalBasicInfo(oauth_token, oauth_token_secret) {
  return request(() =>
    postMultipart(
      webClient,
      Constants.LEGACY_ENDPOINTS.pcUser,
      withLegacyAuth(oauth_token, oauth_token_secret)
    )
  );
}

export async function getPersonalInfo(oauth_token, oauth_token_secret) {
  return request(() =>
    postUrlEncoded(webClient, Constants.LEGACY_ENDPOINTS.personalCenter, {
      oauth_token,
      oauth_token_secret,
    })
  );
}

export async function newEventList(
  sid,
  keyword,
  url,
  page,
  oauth_token,
  oauth_token_secret
) {
  return request(() =>
    postMultipart(
      webClient,
      Constants.LEGACY_ENDPOINTS.eventList,
      withLegacyAuth(oauth_token, oauth_token_secret, {
        sid,
        keyword,
        url,
        page,
      })
    )
  );
}

export async function queryActivityDetailById(actiId, oauth_token, oauth_token_secret) {
  return request(() =>
    postMultipart(
      webClient,
      Constants.LEGACY_ENDPOINTS.eventDetail,
      withLegacyAuth(oauth_token, oauth_token_secret),
      {
        params: {
          from: Constants.PC,
          actiId,
        },
      }
    )
  );
}

export async function joinEvent(uid, actiId, oauth_token, oauth_token_secret) {
  const time = Math.floor(Date.now() / 1000);
  const sign = joinSign(uid, actiId, time);

  return request(() =>
    postMultipart(
      webClient,
      Constants.LEGACY_ENDPOINTS.joinEvent,
      withLegacyAuth(oauth_token, oauth_token_secret, {
        id: actiId,
        time,
        sign,
      })
    )
  );
}

export async function cancelEvent(actiId, oauth_token, oauth_token_secret) {
  return request(() =>
    postMultipart(
      webClient,
      Constants.LEGACY_ENDPOINTS.cancelEvent,
      withLegacyAuth(oauth_token, oauth_token_secret, {
        id: actiId,
      })
    )
  );
}

export async function getLegacyEventMembers(
  oauth_token,
  oauth_token_secret,
  eventId,
  { page = 1, status = 1, realname = "" } = {}
) {
  return request(() =>
    getJson(webClient, Constants.LEGACY_ENDPOINTS.eventMemberList, {
      params: withLegacyAuth(oauth_token, oauth_token_secret, {
        id: eventId,
        page,
        status: String(status),
        realname,
        version: "6.6.6",
      }),
    })
  );
}

export async function setLegacyEventSignManager(oauth_token, oauth_token_secret, uid, eventId) {
  return request(() =>
    postUrlEncoded(
      webClient,
      Constants.LEGACY_ENDPOINTS.setSignManager,
      withLegacyAuth(oauth_token, oauth_token_secret, {
        uid,
        event_id: eventId,
        version: "6.6.6",
      })
    )
  );
}

export async function cancelLegacyEventSignManager(oauth_token, oauth_token_secret, uid, eventId) {
  return request(() =>
    postUrlEncoded(
      webClient,
      Constants.LEGACY_ENDPOINTS.cancelSignManager,
      withLegacyAuth(oauth_token, oauth_token_secret, {
        uid,
        event_id: eventId,
        version: "6.6.6",
      })
    )
  );
}

export async function changeLegacyEventOrganiser(
  oauth_token,
  oauth_token_secret,
  uid,
  eventId,
  enabled
) {
  return request(() =>
    postUrlEncoded(
      webClient,
      Constants.LEGACY_ENDPOINTS.changeOrganiser,
      withLegacyAuth(oauth_token, oauth_token_secret, {
        uid,
        event_id: eventId,
        change_to_organiser: enabled ? 1 : 0,
        version: "6.6.6",
      })
    )
  );
}

export async function getMyEventList(oauth_token, oauth_token_secret, page, count) {
  return request(() =>
    postMultipart(
      webClient,
      Constants.LEGACY_ENDPOINTS.myEventList,
      withLegacyAuth(oauth_token, oauth_token_secret),
      {
        params: {
          action: "join",
          page,
          count,
          status: 0,
          keyWord: "",
        },
      }
    )
  );
}

// New app endpoints extracted from com.xyhui v7.1.93 Flutter libapp.so.
// These are exposed as low-level helpers because the app-side token/header model
// is different from the legacy oauth_token/oauth_token_secret flow.
export async function requestAppEndpoint(endpoint, data = {}, config = {}) {
  return request(() => postUrlEncoded(appClient, endpoint, data, config));
}

export async function getAppEventTags(data = {}, config = {}) {
  return requestAppEndpoint(Constants.APP_ENDPOINTS.eventTags, data, config);
}

export async function searchAppEvents(data = {}, config = {}) {
  return requestAppEndpoint(Constants.APP_ENDPOINTS.eventSearch, data, config);
}

export async function getAppRecommendedEvents(data = {}, config = {}) {
  return requestAppEndpoint(Constants.APP_ENDPOINTS.eventRecommendList, data, config);
}

export async function getAppCollectedEvents(data = {}, config = {}) {
  return requestAppEndpoint(Constants.APP_ENDPOINTS.eventCollectionList, data, config);
}

export async function getAppEventRecord(data = {}, config = {}) {
  return requestAppEndpoint(Constants.APP_ENDPOINTS.eventRecord, data, config);
}

export async function getAppActivityQrCodeTime(data = {}, config = {}) {
  return requestAppEndpoint(Constants.APP_ENDPOINTS.activityQrCodeTime, data, config);
}

export async function getAppActivitySignResult(activityId, config = {}) {
  return requestAppEndpoint(Constants.APP_ENDPOINTS.activitySignResult, { activityId }, config);
}

export async function getAppInboxList(data = {}, config = {}) {
  return requestAppEndpoint(Constants.APP_ENDPOINTS.inboxList, data, config);
}
